// Meta WhatsApp Cloud API webhook. GET = verification handshake, POST = incoming events.
const U = require('../lib/util');
const flow = require('../lib/flow');

function readRaw(req) {
  return new Promise((resolve, reject) => {
    if (req.body !== undefined && req.body !== null && typeof req.body !== 'object') return resolve(String(req.body));
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query || {};
    if (mode === 'subscribe' && process.env.WA_VERIFY_TOKEN && U.safeEqual(token, process.env.WA_VERIFY_TOKEN)) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('forbidden');
  }
  if (req.method !== 'POST') return res.status(405).send('method not allowed');

  let raw;
  try { raw = await readRaw(req); } catch { return res.status(400).send('bad body'); }

  if (!U.verifySignature(raw, req.headers['x-hub-signature-256'], process.env.WA_APP_SECRET)) {
    return res.status(401).send('bad signature');
  }

  let payload;
  try { payload = JSON.parse(raw); } catch { return res.status(400).send('bad json'); }

  try {
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const v = change.value || {};
        if (change.field === 'messages') {
          const names = {};
          (v.contacts || []).forEach(c => { names[c.wa_id] = c.profile && c.profile.name; });
          for (const m of v.messages || []) {
            await flow.handleInbound({ id: m.id, from: m.from, type: m.type, raw: m, name: names[m.from] || '' });
          }
        } else if (change.field === 'smb_message_echoes') {
          // Coexistence: messages Megh sent from the WhatsApp Business app.
          for (const m of v.message_echoes || []) {
            await flow.handleEcho({ id: m.id, to: m.to, text: m.text && m.text.body });
          }
        }
        // delivery/read statuses (v.statuses) are intentionally ignored
      }
    }
  } catch (e) {
    await flow.logErr('webhook', e);
  }
  // Always 200 once the payload is authentic: Meta retries on errors and dedupe makes retries harmless anyway.
  return res.status(200).send('ok');
};

// We need the raw bytes to verify Meta's signature, so Vercel must not pre-parse the body.
module.exports.config = { api: { bodyParser: false } };
