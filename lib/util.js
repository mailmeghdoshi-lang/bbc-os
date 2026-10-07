// Pure, dependency-free logic. Everything here is unit-tested (tests/util.test.js).
const crypto = require('crypto');

const IST_OFFSET_MIN = 330;
const HOUR = 3600 * 1000;
// Delay before follow-up #1, #2, #3 after the last bot message. After #3 with no reply -> cold.
const FOLLOWUP_DELAYS_H = [24, 72, 168];
const MAX_FOLLOWUPS = FOLLOWUP_DELAYS_H.length;
// WhatsApp only allows free-form messages within 24h of the customer's last message. Use 23h for safety.
const WINDOW_MS = 23 * HOUR;
const BIZ_START_H = 10; // 10:00 IST
const BIZ_END_H = 19;   // 19:00 IST (exclusive)

function digits(s) { return String(s || '').replace(/\D/g, ''); }

function istParts(ms) {
  const d = new Date(ms + IST_OFFSET_MIN * 60000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), dow: d.getUTCDay() };
}

function istDateKey(ms) {
  const p = istParts(ms);
  return `${p.y}-${String(p.m + 1).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

// Mon-Sat, 10:00-19:00 IST
function inBusinessHours(ms) {
  const p = istParts(ms);
  return p.dow !== 0 && p.h >= BIZ_START_H && p.h < BIZ_END_H;
}

// Move a timestamp forward to the next moment that is inside business hours.
function toBusinessTime(ms) {
  let t = ms;
  for (let i = 0; i < 24 * 8 && !inBusinessHours(t); i++) {
    // jump to the start of the next IST hour (IST is a whole-hour-plus-30-minutes offset, so align via the shifted clock)
    const msIntoHour = (((t + IST_OFFSET_MIN * 60000) % HOUR) + HOUR) % HOUR;
    t += HOUR - msIntoHour;
  }
  return t;
}

// When should the next follow-up go out, given how many have already been sent?
// Returns null when the lead should be marked cold.
function nextFollowupAt(sentCount, fromMs) {
  if (sentCount >= MAX_FOLLOWUPS) return null;
  return toBusinessTime(fromMs + FOLLOWUP_DELAYS_H[sentCount] * HOUR);
}

function windowOpen(lastInboundMs, nowMs) {
  return !!lastInboundMs && nowMs - lastInboundMs < WINDOW_MS;
}

const OPT_OUT_RE = /^\s*(stop|unsubscribe|opt[\s-]?out|remove me|do not (message|contact|disturb)|don'?t (message|contact|text) me|not interested|no thanks?,? stop)\b/i;
function isOptOut(text) { return OPT_OUT_RE.test(String(text || '')); }

const PRICE_RE = /\b(price|prices|pricing|cost|costs|quote|quotation|rate card|rates|charges|fees|how much|discount|package|packages|budget)\b/i;
function asksPrice(text) { return PRICE_RE.test(String(text || '')); }

const HUMAN_RE = /\b(human|real person|speak to (someone|a person|megh|the owner|founder)|talk to (someone|a person|megh|the owner|founder)|call me|give me a call|can we (talk|speak|meet)|schedule a (call|meeting)|book a (call|meeting)|meeting)\b/i;
function wantsHuman(text) { return HUMAN_RE.test(String(text || '')); }

function verifySignature(rawBody, header, appSecret) {
  if (!appSecret) return true; // not configured -> skip (setup guide tells you to configure it)
  if (!header || !String(header).startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const got = String(header).slice(7);
  const a = Buffer.from(expected, 'hex');
  let b;
  try { b = Buffer.from(got, 'hex'); } catch { return false; }
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Commands Megh can send to the bot number from his own WhatsApp.
function parseOwnerCommand(text) {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return { cmd: 'help' };
  const m = t.match(/^(info|pause|resume|done|won|lost)\s+#?(\d{1,3})$/);
  if (m) return { cmd: m[1], n: parseInt(m[2], 10) };
  if (/^(status|hi|hello|hey|summary|brief)$/.test(t)) return { cmd: 'status' };
  if (/^(handoffs?|hand[\s-]?offs?|queue|pending)$/.test(t)) return { cmd: 'handoffs' };
  if (/^(followups?|follow[\s-]?ups?)$/.test(t)) return { cmd: 'followups' };
  return { cmd: 'help' };
}

// WhatsApp template variables cannot contain newlines, tabs or 4+ consecutive spaces.
function templateSafe(text, max = 900) {
  return String(text || '').replace(/[\r\n\t]+/g, ' | ').replace(/ {2,}/g, ' ').replace(/(\| ){2,}/g, '| ').trim().slice(0, max);
}

function firstName(name) {
  const n = String(name || '').trim().split(/\s+/)[0];
  return n && !/^\+?\d+$/.test(n) ? n : 'there';
}

module.exports = {
  HOUR, WINDOW_MS, MAX_FOLLOWUPS, FOLLOWUP_DELAYS_H,
  digits, istParts, istDateKey, inBusinessHours, toBusinessTime, nextFollowupAt, windowOpen,
  isOptOut, asksPrice, wantsHuman, verifySignature, safeEqual, parseOwnerCommand, templateSafe, firstName
};
