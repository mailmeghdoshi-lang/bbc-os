// JSON API behind the WhatsApp lead dashboard (wa.html). Password protected; Firebase rules for /bbcWA can stay fully locked.
const { ref } = require('../lib/firebase');
const U = require('../lib/util');
const flow = require('../lib/flow');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const pw = process.env.DASHBOARD_PASSWORD;
  if (!pw || !U.safeEqual(body.password, pw)) {
    await new Promise(r => setTimeout(r, 400)); // slow down guessing
    return res.status(401).json({ error: 'wrong password' });
  }
  try {
    switch (body.action) {
      case 'list': {
        const convs = await flow.allConversations();
        const queue = ((await ref('ownerQueue').once('value')).val()) || {};
        return res.json({ now: Date.now(), conversations: convs, ownerQueue: Object.values(queue).slice(-20) });
      }
      case 'thread': {
        const waId = U.digits(body.waId);
        return res.json({ conversation: await flow.getConv(waId), messages: await flow.getHistory(waId, 60) });
      }
      case 'act': {
        const c = await flow.applyAction(U.digits(body.waId), String(body.act));
        return res.json({ ok: true, conversation: c });
      }
      case 'send': {
        const text = String(body.text || '').trim();
        if (!text) return res.status(400).json({ error: 'empty message' });
        await flow.manualSend(U.digits(body.waId), text);
        return res.json({ ok: true });
      }
      default: return res.status(400).json({ error: 'unknown action' });
    }
  } catch (e) {
    await flow.logErr('board', e);
    return res.status(400).json({ error: e.message });
  }
};

function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
