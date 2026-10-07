// Orchestration: inbound messages, hand-offs, follow-ups, owner commands and the morning brief.
const { ref } = require('./firebase');
const { sendText, sendTemplate, markRead } = require('./wa');
const { think } = require('./brain');
const U = require('./util');

const REASON_LABEL = {
  pricing: 'asked for pricing', call_request: 'wants a call', wants_human: 'asked for you',
  ready_to_buy: 'ready to proceed', existing_client: 'existing client', complaint: 'unhappy / complaint',
  out_of_scope: 'needs your judgement', qualified: 'qualified, worth your call', none: 'needs you'
};

const OPEN_FALLBACK = 'Thanks for reaching out to Butter Branding! Megh will personally get back to you shortly.';
const OPTOUT_REPLY = "Understood, we won't message you again. If you ever want to reconnect, just say hi. All the best!";

const keySafe = s => String(s).replace(/[.#$\[\]\/]/g, '_');
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

async function logErr(where, err) {
  try { await ref('errors').push({ at: Date.now(), where, error: String((err && err.message) || err).slice(0, 500) }); } catch { /* never throw from logging */ }
  console.error(`[bbc-wa] ${where}:`, (err && err.message) || err);
}

// ── data helpers ─────────────────────────────────────────────────────────────
async function getConv(waId) { return (await ref(`conversations/${waId}`).once('value')).val(); }
async function patchConv(waId, patch) { await ref(`conversations/${waId}`).update({ ...patch, updatedAt: Date.now() }); }

async function addMessage(waId, dir, text, extra = {}) {
  await ref(`messages/${waId}`).push({ dir, text: String(text || '').slice(0, 4000), ts: Date.now(), ...extra });
}

async function getHistory(waId, limit = 30) {
  const snap = await ref(`messages/${waId}`).orderByChild('ts').limitToLast(limit).once('value');
  const out = [];
  snap.forEach(c => { out.push(c.val()); });
  return out.sort((a, b) => a.ts - b.ts);
}

async function firstSeen(msgId) {
  const r = await ref(`seen/${keySafe(msgId)}`).transaction(cur => (cur ? undefined : Date.now()));
  return r.committed;
}

function extractText(m) {
  switch (m.type) {
    case 'text': return (m.text && m.text.body) || '';
    case 'button': return (m.button && (m.button.text || m.button.payload)) || '';
    case 'interactive': {
      const i = m.interactive || {};
      return (i.button_reply && i.button_reply.title) || (i.list_reply && i.list_reply.title) || '';
    }
    case 'image': return `[sent an image]${m.image && m.image.caption ? ' ' + m.image.caption : ''}`;
    case 'audio': return '[sent a voice note, which the assistant cannot listen to]';
    case 'video': return '[sent a video]';
    case 'document': return `[sent a document${m.document && m.document.filename ? ': ' + m.document.filename : ''}]`;
    case 'sticker': return '[sent a sticker]';
    case 'location': return '[shared a location]';
    case 'contacts': return '[shared a contact]';
    default: return '[sent a message of unsupported type]';
  }
}

// ── owner notifications ──────────────────────────────────────────────────────
async function notifyOwner(text) {
  const to = U.digits(process.env.OWNER_WA);
  if (!to) { await logErr('notifyOwner', 'OWNER_WA not set'); return false; }
  try {
    const owner = (await ref('owner').once('value')).val() || {};
    if (U.windowOpen(owner.lastInboundAt, Date.now())) { await sendText(to, text); return true; }
    if (process.env.WA_OWNER_TEMPLATE) {
      await sendTemplate(to, process.env.WA_OWNER_TEMPLATE, process.env.WA_OWNER_TEMPLATE_LANG || 'en', [U.templateSafe(text)]);
      return true;
    }
    await ref('ownerQueue').push({ at: Date.now(), text });
    await logErr('notifyOwner', 'owner 24h window closed and WA_OWNER_TEMPLATE not set; queued on the dashboard instead');
    return false;
  } catch (e) { await logErr('notifyOwner', e); return false; }
}

function leadLabel(c) {
  const bits = [c.name || `+${c.waId}`];
  if (c.profile && c.profile.company) bits.push(c.profile.company);
  return bits.join(' · ');
}

// ── inbound handling ─────────────────────────────────────────────────────────
async function handleInbound({ id, from, type, raw, name }) {
  if (!(await firstSeen(id))) return; // Meta retries; process each message once
  const waId = U.digits(from);
  const text = extractText({ type, ...raw }).trim();
  const now = Date.now();
  markRead(id);

  if (waId === U.digits(process.env.OWNER_WA)) return handleOwner(text, now);

  let conv = await getConv(waId);
  if (!conv) {
    conv = {
      waId, name: name || '', status: 'bot', stage: 'Prospect', leadType: 'prospect', profile: {}, summary: '',
      followupCount: 0, createdAt: now, lastInboundAt: now
    };
    await ref(`conversations/${waId}`).set({ ...conv, updatedAt: now });
  } else {
    await patchConv(waId, { lastInboundAt: now, name: conv.name || name || '' });
    conv = { ...conv, lastInboundAt: now, name: conv.name || name || '' };
  }
  await addMessage(waId, 'in', text, { wamid: id });

  if (U.isOptOut(text)) {
    await patchConv(waId, { status: 'optout', nextFollowupAt: null, ownerAttention: false });
    try { await sendText(waId, OPTOUT_REPLY); await addMessage(waId, 'out', OPTOUT_REPLY, { source: 'bot' }); } catch (e) { await logErr('optout-reply', e); }
    return;
  }

  if (conv.status === 'optout') return; // they asked us to stop; stay silent

  if (conv.status === 'handoff' || conv.status === 'human') {
    // Megh is on it. Do not auto-reply, but make sure he knows they wrote again.
    const recentlyPinged = conv.attentionPingAt && now - conv.attentionPingAt < 2 * U.HOUR;
    await patchConv(waId, { ownerAttention: true, attentionPingAt: recentlyPinged ? conv.attentionPingAt : now });
    if (!recentlyPinged) await notifyOwner(`💬 ${leadLabel(conv)} (+${waId}) wrote again: "${clip(text, 160)}"`);
    return;
  }

  if (conv.status === 'closed') {
    // A closed lead or won client is writing again: treat as needing a human.
    const h = { reason: 'existing_client', at: now, summary: 'Previously closed lead/client wrote again' };
    await patchConv(waId, { status: 'handoff', handoff: h, ownerAttention: true, nextFollowupAt: null });
    await notifyOwner(`🔔 ${leadLabel(conv)} (+${waId}) is back after being closed: "${clip(text, 160)}"`);
    return;
  }

  await botReply(waId, conv, text, now); // status 'bot' or 'cold' (a cold lead replying is a warm lead again)
}

async function botReply(waId, conv, text, now) {
  const history = await getHistory(waId);
  let r = null;
  try { r = await think({ history, profile: conv.profile }); } catch (e) { await logErr('think', e); }

  if (!r) {
    // Fail safe: never leave a lead on read, never send garbage.
    r = { reply: OPEN_FALLBACK, stage: conv.stage || 'Prospect', leadType: conv.leadType || 'prospect', handoff: true,
      handoffReason: 'out_of_scope', profile: {}, summary: 'Assistant had a technical issue: please reply personally.' };
  }

  // Deterministic safety nets on top of the model's judgement.
  if (r.leadType === 'prospect' || r.leadType === 'other') {
    if (!r.handoff && U.asksPrice(text)) { r.handoff = true; r.handoffReason = 'pricing'; }
    if (!r.handoff && U.wantsHuman(text)) { r.handoff = true; r.handoffReason = /call|meet/i.test(text) ? 'call_request' : 'wants_human'; }
  }
  if (r.leadType === 'existing_client' && !r.handoff) { r.handoff = true; r.handoffReason = 'existing_client'; }
  if (r.handoff && r.handoffReason === 'none') r.handoffReason = 'qualified';

  let sent = true;
  try { await sendText(waId, r.reply); } catch (e) { sent = false; await logErr('send-reply', e); }
  if (sent) await addMessage(waId, 'out', r.reply, { source: 'bot' });

  const profile = { ...(conv.profile || {}) };
  for (const [k, v] of Object.entries(r.profile || {})) {
    if (Array.isArray(v) ? v.length : String(v || '').trim()) profile[k] = v;
  }
  const patch = {
    profile, leadType: r.leadType, stage: r.stage, summary: r.summary || conv.summary || '',
    name: conv.name || profile.name || '', followupCount: 0, lastOutboundAt: sent ? Date.now() : conv.lastOutboundAt || null
  };

  const nonLead = r.leadType === 'vendor_or_spam' || r.leadType === 'job_seeker';
  if (r.handoff) {
    patch.status = 'handoff';
    patch.nextFollowupAt = null;
    patch.ownerAttention = true;
    patch.handoff = { reason: r.handoffReason, at: now, summary: r.summary };
    await patchConv(waId, patch);
    const c = { ...conv, ...patch };
    await notifyOwner(`🔔 HAND-OFF: ${leadLabel(c)} (+${waId}), ${REASON_LABEL[r.handoffReason] || 'needs you'}. ${clip(r.summary, 220)}`);
  } else if (nonLead) {
    patch.status = 'closed'; patch.closedReason = r.leadType; patch.nextFollowupAt = null;
    await patchConv(waId, patch);
  } else {
    patch.status = 'bot';
    patch.nextFollowupAt = U.nextFollowupAt(0, Date.now());
    await patchConv(waId, patch);
  }
}

// Megh replied to a lead himself from the WhatsApp Business app (coexistence "echo"): pause the bot for that lead.
async function handleEcho({ id, to, text }) {
  if (id && !(await firstSeen(id))) return;
  const waId = U.digits(to);
  const conv = await getConv(waId);
  if (!conv) return;
  await addMessage(waId, 'out', text || '[message sent from the Business app]', { source: 'human' });
  const patch = { lastOutboundAt: Date.now(), ownerAttention: false };
  if (conv.status === 'bot' || conv.status === 'cold') { patch.status = 'human'; patch.nextFollowupAt = null; }
  await patchConv(waId, patch);
}

// ── actions shared by owner commands and the dashboard ───────────────────────
async function applyAction(waId, action) {
  const conv = await getConv(waId);
  if (!conv) throw new Error('lead not found');
  const now = Date.now();
  const P = {
    pause: { status: 'human', nextFollowupAt: null },
    resume: { status: 'bot', ownerAttention: false, followupCount: 0, nextFollowupAt: U.nextFollowupAt(0, now) },
    done: { status: 'closed', closedReason: 'handled', ownerAttention: false, nextFollowupAt: null },
    won: { status: 'closed', stage: 'Onboarded', closedReason: 'won', ownerAttention: false, nextFollowupAt: null },
    lost: { status: 'closed', stage: 'Lost', closedReason: 'lost', ownerAttention: false, nextFollowupAt: null }
  }[action];
  if (!P) throw new Error('unknown action');
  await patchConv(waId, P);
  return { ...conv, ...P };
}

async function manualSend(waId, text) {
  const conv = await getConv(waId);
  if (!conv) throw new Error('lead not found');
  if (!U.windowOpen(conv.lastInboundAt, Date.now())) throw new Error('The 24-hour WhatsApp window is closed for this lead. Reply from your WhatsApp Business app or wait for them to message.');
  await sendText(waId, text);
  await addMessage(waId, 'out', text, { source: 'human' });
  await patchConv(waId, { status: 'human', ownerAttention: false, lastOutboundAt: Date.now(), nextFollowupAt: null });
}

// ── follow-ups (called by cron) ──────────────────────────────────────────────
async function runFollowups(now, budgetMs = 22000) {
  const t0 = Date.now();
  const res = { sent: 0, needsTemplate: 0, cold: 0, errors: 0 };
  if (!U.inBusinessHours(now)) return { ...res, skipped: 'outside business hours' };
  const snap = await ref('conversations').orderByChild('status').equalTo('bot').once('value');
  const due = [];
  snap.forEach(c => {
    const v = c.val();
    if (v.nextFollowupAt && v.nextFollowupAt <= now) due.push(v);
  });
  due.sort((a, b) => a.nextFollowupAt - b.nextFollowupAt);

  for (const c of due) {
    if (Date.now() - t0 > budgetMs) break;
    try {
      if ((c.followupCount || 0) >= U.maxFollowups()) {
        await patchConv(c.waId, { status: 'cold', nextFollowupAt: null });
        res.cold++;
        continue;
      }
      const n = (c.followupCount || 0) + 1;
      let text;
      if (U.windowOpen(c.lastInboundAt, now)) {
        const history = await getHistory(c.waId);
        const r = await think({ history, profile: c.profile, mode: 'followup', followupNo: n });
        text = r.reply;
        await sendText(c.waId, text);
      } else if (U.followupMode() === 'free') {
        // Free mode never uses paid templates. The 24h window closed before we could nudge, so let it rest.
        await patchConv(c.waId, { status: 'cold', nextFollowupAt: null, closedReason: 'window_missed' });
        res.cold++;
        continue;
      } else if (process.env.WA_FOLLOWUP_TEMPLATE) {
        await sendTemplate(c.waId, process.env.WA_FOLLOWUP_TEMPLATE, process.env.WA_FOLLOWUP_TEMPLATE_LANG || 'en', [U.firstName(c.name || (c.profile && c.profile.name))]);
        text = `[template follow-up ${n}: ${process.env.WA_FOLLOWUP_TEMPLATE}]`;
      } else {
        await patchConv(c.waId, { needsTemplate: true });
        res.needsTemplate++;
        continue;
      }
      await addMessage(c.waId, 'out', text, { source: 'bot', followup: n });
      const next = n >= U.maxFollowups() ? U.toBusinessTime(now + (U.followupMode() === 'free' ? 24 : 72) * U.HOUR) : U.nextFollowupAt(n, now);
      await patchConv(c.waId, { followupCount: n, lastOutboundAt: Date.now(), nextFollowupAt: next, needsTemplate: false });
      res.sent++;
    } catch (e) { res.errors++; await logErr(`followup:${c.waId}`, e); }
  }
  return res;
}

// ── morning brief ────────────────────────────────────────────────────────────
async function allConversations() {
  const snap = await ref('conversations').once('value');
  const out = [];
  snap.forEach(c => { out.push(c.val()); });
  return out;
}

function buildBrief(convs, now) {
  const handoffs = convs.filter(c => c.status === 'handoff').sort((a, b) => ((a.handoff && a.handoff.at) || 0) - ((b.handoff && b.handoff.at) || 0));
  const attention = convs.filter(c => c.status === 'human' && c.ownerAttention);
  const need = [...handoffs, ...attention];
  const dayAgo = now - 24 * U.HOUR;
  const fresh = convs.filter(c => (c.createdAt || 0) > dayAgo);
  const active = convs.filter(c => c.status === 'bot' && (c.lastInboundAt || 0) > dayAgo);
  const waiting = convs.filter(c => c.status === 'bot' && c.nextFollowupAt);
  const going = convs.filter(c => c.status === 'bot' && (c.followupCount || 0) >= 2);
  const needsTpl = convs.filter(c => c.needsTemplate);

  const lines = [`Good morning Megh. BBC lead brief, ${U.istDateKey(now)}`];
  lines.push('');
  lines.push(need.length ? `NEEDS YOU (${need.length})` : 'NEEDS YOU: nothing waiting 🎉');
  need.forEach((c, i) => {
    const why = c.status === 'handoff' ? (REASON_LABEL[(c.handoff && c.handoff.reason)] || 'needs you') : 'wrote after you took over';
    const age = c.handoff && c.handoff.at ? ` (${Math.max(0, Math.round((now - c.handoff.at) / U.HOUR))}h ago)` : '';
    lines.push(`${i + 1}. ${leadLabel(c)}: ${why}${age}. ${clip(c.summary, 140)}`);
  });
  lines.push('');
  lines.push(`BOT HANDLING: ${active.length} active chats, ${fresh.length} new leads in 24h, ${waiting.length} follow-ups scheduled`);
  if (going.length) lines.push(`GOING COLD: ${going.map(c => c.name || '+' + c.waId).slice(0, 6).join(', ')}`);
  if (needsTpl.length) lines.push(`BLOCKED: ${needsTpl.length} follow-ups need an approved WhatsApp template (see setup guide)`);
  if (need.length) lines.push('', 'Reply: info 1, pause 1, resume 1, done 1, won 1, lost 1');
  return { text: lines.join('\n'), list: need.map(c => c.waId) };
}

async function sendMorningBrief(now, force = false) {
  const today = U.istDateKey(now);
  const owner = (await ref('owner').once('value')).val() || {};
  if (!force && (owner.lastSummaryDate === today || U.istParts(now).h < 8)) return { skipped: true };
  const convs = await allConversations();
  const { text, list } = buildBrief(convs, now);
  await ref('owner').update({ lastList: list });
  const ok = await notifyOwner(text);
  if (ok) await ref('owner').update({ lastSummaryDate: today });
  return { sent: ok, handoffs: list.length };
}

// ── owner commands (Megh texts the bot number from his own WhatsApp) ─────────
async function handleOwner(text, now) {
  const owner = (await ref('owner').once('value')).val() || {};
  await ref('owner').update({ lastInboundAt: now });
  const to = U.digits(process.env.OWNER_WA);
  const reply = async t => { try { await sendText(to, t); } catch (e) { await logErr('owner-reply', e); } };
  const { cmd, n } = U.parseOwnerCommand(text);
  const list = owner.lastList || [];

  if (cmd === 'help') return reply('Commands: status, handoffs, followups, info N, pause N, resume N, done N, won N, lost N. N is the number from your latest brief or handoffs list.');
  if (cmd === 'status' || cmd === 'handoffs') {
    const convs = await allConversations();
    const { text: t, list: l } = buildBrief(convs, now);
    await ref('owner').update({ lastList: l });
    return reply(t);
  }
  if (cmd === 'followups') {
    const convs = (await allConversations()).filter(c => c.status === 'bot' && c.nextFollowupAt).sort((a, b) => a.nextFollowupAt - b.nextFollowupAt).slice(0, 10);
    if (!convs.length) return reply('No follow-ups scheduled.');
    return reply('Upcoming follow-ups:\n' + convs.map(c => `- ${leadLabel(c)}: #${(c.followupCount || 0) + 1} on ${U.istDateKey(c.nextFollowupAt)}`).join('\n'));
  }
  const waId = list[n - 1];
  if (!waId) return reply('Send "status" first so I know which list N refers to.');
  if (cmd === 'info') {
    const c = await getConv(waId);
    const h = (await getHistory(waId, 6)).map(m => `${m.dir === 'in' ? 'Lead' : m.source === 'human' ? 'You' : 'Bot'}: ${clip(m.text, 140)}`).join('\n');
    const p = c.profile || {};
    return reply(`${leadLabel(c)} (+${waId})\nStatus: ${c.status}${c.handoff ? ' (' + (REASON_LABEL[c.handoff.reason] || '') + ')' : ''}\nNeed: ${[p.goal, (p.services || []).join(', ')].filter(Boolean).join(' / ') || 'unknown'}\nBudget: ${p.budget || 'unknown'} | Timeline: ${p.timeline || 'unknown'}\n\nLast messages:\n${h}`);
  }
  try {
    const c = await applyAction(waId, cmd);
    return reply(`Done: ${leadLabel(c)} is now ${cmd === 'pause' ? 'paused (bot stays quiet)' : cmd === 'resume' ? 'back with the bot' : cmd}.`);
  } catch (e) { return reply(`Could not do that: ${e.message}`); }
}

async function cleanup(now) {
  const snap = await ref('seen').once('value');
  const old = {};
  snap.forEach(c => { if (now - c.val() > 3 * 24 * U.HOUR) old[c.key] = null; });
  if (Object.keys(old).length) await ref('seen').update(old);
}

module.exports = {
  handleInbound, handleEcho, handleOwner, runFollowups, sendMorningBrief, buildBrief, applyAction, manualSend,
  getConv, getHistory, allConversations, cleanup, logErr, REASON_LABEL
};
