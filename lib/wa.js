// WhatsApp Cloud API (Meta) sender
const GRAPH = () => `https://graph.facebook.com/${process.env.WA_GRAPH_VERSION || 'v21.0'}`;

async function call(body) {
  const id = process.env.WA_PHONE_NUMBER_ID;
  const token = process.env.WA_TOKEN;
  if (!id || !token) throw new Error('WA_PHONE_NUMBER_ID / WA_TOKEN not configured');
  const r = await fetch(`${GRAPH()}/${id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...body })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`WhatsApp send failed ${r.status}: ${JSON.stringify(j.error || j)}`);
  return j.messages && j.messages[0] && j.messages[0].id;
}

const sendText = (to, text) =>
  call({ to, type: 'text', text: { body: String(text).slice(0, 4000), preview_url: false } });

const sendTemplate = (to, name, lang, params = []) =>
  call({
    to, type: 'template',
    template: {
      name, language: { code: lang || 'en' },
      components: params.length ? [{ type: 'body', parameters: params.map(p => ({ type: 'text', text: String(p) })) }] : []
    }
  });

const markRead = async messageId => {
  try { await call({ status: 'read', message_id: messageId }); } catch { /* cosmetic */ }
};

module.exports = { sendText, sendTemplate, markRead };
