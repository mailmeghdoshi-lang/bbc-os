// End-to-end tests of lib/flow.js against an in-memory Firebase fake and stubbed WhatsApp/Claude HTTP calls.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// ── in-memory Firebase fake ──────────────────────────────────────────────────
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
let root, counter;
const parts = p => p.split('/').filter(Boolean);
const getAt = p => parts(p).reduce((o, k) => (o == null ? undefined : o[k]), root);
function setAt(p, val) {
  const ks = parts(p); let o = root;
  ks.slice(0, -1).forEach(k => { if (o[k] == null) o[k] = {}; o = o[k]; });
  const last = ks[ks.length - 1];
  if (val === null || val === undefined) delete o[last]; else o[last] = clone(val);
}
const snapOf = (entries) => ({
  val: () => (entries === undefined ? null : clone(entries)),
  forEach: cb => { Object.entries(entries || {}).forEach(([k, v]) => cb({ key: k, val: () => clone(v) })); }
});
function ref(p) {
  const base = `bbcWA/${p}`;
  const mkQuery = (filter) => ({ once: async () => snapOf(filter(getAt(base) || {})) });
  return {
    once: async () => snapOf(getAt(base)),
    set: async v => setAt(base, v),
    update: async obj => { for (const k of Object.keys(obj)) setAt(`${base}/${k}`, obj[k]); },
    push: async v => { const k = 'k' + String(++counter).padStart(6, '0'); setAt(`${base}/${k}`, v); return { key: k }; },
    transaction: async fn => {
      const cur = getAt(base); const res = fn(cur === undefined ? null : cur);
      if (res === undefined) return { committed: false };
      setAt(base, res); return { committed: true };
    },
    orderByChild: k => ({
      equalTo: v => mkQuery(all => Object.fromEntries(Object.entries(all).filter(([, e]) => e && e[k] === v))),
      limitToLast: n => mkQuery(all => Object.fromEntries(Object.entries(all).sort((a, b) => (a[1][k] || 0) - (b[1][k] || 0)).slice(-n)))
    })
  };
}
const fbPath = require.resolve('../lib/firebase');
require.cache[fbPath] = { id: fbPath, filename: fbPath, loaded: true, exports: { ref, getDb: () => ({}) } };

// ── env + HTTP stubs ─────────────────────────────────────────────────────────
Object.assign(process.env, {
  OWNER_WA: '919769277652', ANTHROPIC_API_KEY: 'test', WA_PHONE_NUMBER_ID: '111', WA_TOKEN: 'tok',
  WA_OWNER_TEMPLATE: 'owner_update', WA_FOLLOWUP_TEMPLATE: 'bbc_followup', FOLLOWUP_MODE: 'full'
});
let sent, brainQueue, brainFails;
global.fetch = async (url, opts) => {
  const body = JSON.parse(opts.body);
  if (String(url).includes('api.anthropic.com')) {
    if (brainFails) return { ok: false, status: 500, json: async () => ({ error: 'boom' }) };
    const input = brainQueue.shift() || { reply: 'Tell me more about your business?', stage: 'Prospect', lead_type: 'prospect', handoff: false, handoff_reason: 'none', summary: 'Early chat' };
    return { ok: true, status: 200, json: async () => ({ content: [{ type: 'tool_use', name: 'respond', input }] }) };
  }
  sent.push(body);
  return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.out' + sent.length }] }) };
};
const flow = require('../lib/flow');
const U = require('../lib/util');

const LEAD = '919800000001';
const ist = (y, mo, d, h, mi = 0) => Date.UTC(y, mo - 1, d, h, mi) - 330 * 60000;
let n = 0;
const inbound = (text, from = LEAD, extra = {}) =>
  flow.handleInbound({ id: `wamid.in${++n}`, from, type: 'text', raw: { type: 'text', text: { body: text } }, name: 'Priya Shah', ...extra });
const toLead = () => sent.filter(s => s.to === LEAD);
const toOwner = () => sent.filter(s => s.to === '919769277652');
const reset = () => { root = {}; counter = 0; sent = []; brainQueue = []; brainFails = false; };

test('new lead gets a bot reply, a stored conversation and a scheduled follow-up', async () => {
  reset();
  await inbound('Hi, I run a salon in Thane and need help with Instagram');
  assert.equal(toLead().length, 1);
  assert.equal(toLead()[0].type, 'text');
  const c = await flow.getConv(LEAD);
  assert.equal(c.status, 'bot');
  assert.equal(c.name, 'Priya Shah');
  assert.ok(c.nextFollowupAt > Date.now());
  assert.ok(U.inBusinessHours(c.nextFollowupAt));
  assert.equal((await flow.getHistory(LEAD)).length, 2);
});

test('the same WhatsApp message id is processed only once', async () => {
  reset();
  const m = { id: 'wamid.dup', from: LEAD, type: 'text', raw: { type: 'text', text: { body: 'hello' } }, name: 'P' };
  await flow.handleInbound(m); await flow.handleInbound(m);
  assert.equal(toLead().length, 1);
});

test('pricing question forces a hand-off even if the model forgets, and pings the owner via template', async () => {
  reset();
  brainQueue.push({ reply: 'Pricing depends on scope. Megh will share a proposal.', stage: 'Discussion', lead_type: 'prospect', handoff: false, handoff_reason: 'none', summary: 'Salon owner asked pricing' });
  await inbound('What is the price for social media management?');
  const c = await flow.getConv(LEAD);
  assert.equal(c.status, 'handoff');
  assert.equal(c.handoff.reason, 'pricing');
  assert.ok(!c.nextFollowupAt);
  const ping = toOwner();
  assert.equal(ping.length, 1);
  assert.equal(ping[0].type, 'template');
  assert.match(ping[0].template.components[0].parameters[0].text, /HAND-OFF/);
});

test('after hand-off the bot stays silent but the owner is told when the lead writes again (rate-limited)', async () => {
  reset();
  brainQueue.push({ reply: 'Megh will call you.', stage: 'Discussion', lead_type: 'prospect', handoff: true, handoff_reason: 'call_request', summary: 'wants call' });
  await inbound('Can we have a call tomorrow?');
  const before = toLead().length;
  await inbound('Hello? Anyone there?');
  await inbound('Please reply');
  assert.equal(toLead().length, before);               // no bot replies
  assert.equal(toOwner().length, 2);                   // 1 hand-off + 1 "wrote again" (second ping suppressed for 2h)
  assert.equal((await flow.getConv(LEAD)).ownerAttention, true);
});

test('opt-out is honoured and the lead is never messaged again', async () => {
  reset();
  await inbound('hi');
  await inbound('STOP');
  const afterStop = toLead().length;
  assert.equal((await flow.getConv(LEAD)).status, 'optout');
  await inbound('hello again');
  assert.equal(toLead().length, afterStop);
  const c = await flow.getConv(LEAD);
  assert.ok(!c.nextFollowupAt);
});

test('if Claude is down the lead still gets a reply and the owner is alerted', async () => {
  reset(); brainFails = true;
  await inbound('Need a logo');
  assert.equal(toLead().length, 1);
  assert.match(toLead()[0].text.body, /Megh will personally get back/);
  assert.equal((await flow.getConv(LEAD)).status, 'handoff');
  assert.equal(toOwner().length, 1);
});

test('vendors and job seekers are closed politely without hand-off', async () => {
  reset();
  brainQueue.push({ reply: 'Thanks! Please email your CV to megh@butterbranding.co.', stage: 'Prospect', lead_type: 'job_seeker', handoff: false, handoff_reason: 'none', summary: 'job seeker' });
  await inbound('Do you have any openings for a designer?');
  const c = await flow.getConv(LEAD);
  assert.equal(c.status, 'closed');
  assert.equal(c.closedReason, 'job_seeker');
  assert.equal(toOwner().length, 0);
});

test('follow-ups: free text inside the 24h window, template outside, cold after the third', async () => {
  reset();
  const now = ist(2026, 10, 8, 12, 0);                       // Thursday noon IST
  setAt('bbcWA/conversations/A', { waId: 'A', name: 'Ann', status: 'bot', followupCount: 0, lastInboundAt: now - 2 * U.HOUR, nextFollowupAt: now - 1000, profile: {} });
  setAt('bbcWA/conversations/B', { waId: 'B', name: 'Bob Rao', status: 'bot', followupCount: 0, lastInboundAt: now - 30 * U.HOUR, nextFollowupAt: now - 1000, profile: {} });
  setAt('bbcWA/conversations/C', { waId: 'C', name: 'Cy', status: 'bot', followupCount: 3, lastInboundAt: now - 400 * U.HOUR, nextFollowupAt: now - 1000, profile: {} });
  setAt('bbcWA/conversations/D', { waId: 'D', name: 'Di', status: 'bot', followupCount: 0, lastInboundAt: now, nextFollowupAt: now + 5 * U.HOUR, profile: {} });
  brainQueue.push({ reply: 'Just checking in, any questions on what we discussed?', stage: 'Prospect', lead_type: 'prospect', handoff: false, handoff_reason: 'none', summary: '' });
  const r = await flow.runFollowups(now);
  assert.equal(r.sent, 2); assert.equal(r.cold, 1);
  assert.equal(sent.find(s => s.to === 'A').type, 'text');
  const tpl = sent.find(s => s.to === 'B');
  assert.equal(tpl.type, 'template');
  assert.equal(tpl.template.components[0].parameters[0].text, 'Bob');
  assert.equal((await flow.getConv('C')).status, 'cold');
  assert.ok(!sent.find(s => s.to === 'D'));                  // not due yet
  assert.equal((await flow.getConv('A')).followupCount, 1);
});

test('follow-ups never run outside business hours', async () => {
  reset();
  const night = ist(2026, 10, 8, 22, 0);
  setAt('bbcWA/conversations/A', { waId: 'A', status: 'bot', followupCount: 0, lastInboundAt: night - U.HOUR, nextFollowupAt: night - 1000, profile: {} });
  const r = await flow.runFollowups(night);
  assert.equal(r.skipped, 'outside business hours');
  assert.equal(sent.length, 0);
});

test('missing follow-up template is flagged instead of silently failing', async () => {
  reset();
  const saved = process.env.WA_FOLLOWUP_TEMPLATE; delete process.env.WA_FOLLOWUP_TEMPLATE;
  const now = ist(2026, 10, 8, 12, 0);
  setAt('bbcWA/conversations/B', { waId: 'B', name: 'Bob', status: 'bot', followupCount: 0, lastInboundAt: now - 30 * U.HOUR, nextFollowupAt: now - 1000, profile: {} });
  const r = await flow.runFollowups(now);
  process.env.WA_FOLLOWUP_TEMPLATE = saved;
  assert.equal(r.needsTemplate, 1);
  assert.equal((await flow.getConv('B')).needsTemplate, true);
});

test('morning brief goes out once per day and lists hand-offs', async () => {
  reset();
  brainQueue.push({ reply: 'Megh will share a proposal.', stage: 'Discussion', lead_type: 'prospect', handoff: true, handoff_reason: 'pricing', summary: 'Salon in Thane wants Instagram help' });
  await inbound('how much for instagram?');
  sent.length = 0;
  const morning = ist(2026, 10, 8, 9, 0);
  const r1 = await flow.sendMorningBrief(morning);
  const r2 = await flow.sendMorningBrief(morning + U.HOUR);
  assert.equal(r1.sent, true); assert.equal(r2.skipped, true);
  const body = sent[0].template.components[0].parameters[0].text;
  assert.match(body, /NEEDS YOU \(1\)/);
  assert.match(body, /Priya Shah/);
});

test('owner commands: status, info, pause, resume, won', async () => {
  reset();
  brainQueue.push({ reply: 'Megh will call you.', stage: 'Discussion', lead_type: 'prospect', handoff: true, handoff_reason: 'call_request', summary: 'wants call Thursday 4pm' });
  await inbound('Can we talk on Thursday 4pm?');
  sent.length = 0;
  const OWNER = '919769277652';
  await inbound('status', OWNER);
  assert.match(sent.at(-1).text.body, /NEEDS YOU \(1\)/);
  assert.equal(sent.at(-1).type, 'text');                    // owner window is open now: no template needed
  await inbound('info 1', OWNER);
  assert.match(sent.at(-1).text.body, /wants a call/);
  await inbound('pause 1', OWNER);
  assert.equal((await flow.getConv(LEAD)).status, 'human');
  await inbound('resume 1', OWNER);
  assert.equal((await flow.getConv(LEAD)).status, 'bot');
  await inbound('won 1', OWNER);
  const c = await flow.getConv(LEAD);
  assert.equal(c.status, 'closed'); assert.equal(c.stage, 'Onboarded');
  await inbound('pause 9', OWNER);
  assert.match(sent.at(-1).text.body, /Could not do that|Send "status"/);
});

test('replying from the Business app pauses the bot for that lead', async () => {
  reset();
  await inbound('hello');
  await flow.handleEcho({ id: 'wamid.echo1', to: LEAD, text: 'Hi Priya, Megh here' });
  const c = await flow.getConv(LEAD);
  assert.equal(c.status, 'human');
  assert.ok(!c.nextFollowupAt);
  const before = toLead().length;
  await inbound('thanks!');
  assert.equal(toLead().length, before);
});

test('free mode: one free-text nudge, never a template, then cold; missed window goes cold without sending', async () => {
  reset();
  process.env.FOLLOWUP_MODE = 'free';
  try {
    const now = ist(2026, 10, 8, 12, 0);
    setAt('bbcWA/conversations/A', { waId: 'A', name: 'Ann', status: 'bot', followupCount: 0, lastInboundAt: now - 20 * U.HOUR, nextFollowupAt: now - 1000, profile: {} });
    setAt('bbcWA/conversations/B', { waId: 'B', name: 'Bob', status: 'bot', followupCount: 0, lastInboundAt: now - 30 * U.HOUR, nextFollowupAt: now - 1000, profile: {} });
    brainQueue.push({ reply: 'Quick check-in, anything I can clarify?', stage: 'Prospect', lead_type: 'prospect', handoff: false, handoff_reason: 'none', summary: '' });
    const r = await flow.runFollowups(now);
    assert.equal(r.sent, 1); assert.equal(r.cold, 1);
    assert.equal(sent.find(s => s.to === 'A').type, 'text');
    assert.ok(!sent.find(s => s.to === 'B'));                        // no paid template, nothing sent
    assert.equal(sent.filter(s => s.type === 'template').length, 0);
    assert.equal((await flow.getConv('B')).status, 'cold');
    // after its single nudge, A goes cold on the next due pass
    const a = await flow.getConv('A');
    assert.equal(a.followupCount, 1);
    const later = a.nextFollowupAt + U.HOUR;
    const r2 = await flow.runFollowups(U.toBusinessTime(later));
    assert.equal(r2.cold, 1);
    assert.equal((await flow.getConv('A')).status, 'cold');
  } finally { process.env.FOLLOWUP_MODE = 'full'; }
});
