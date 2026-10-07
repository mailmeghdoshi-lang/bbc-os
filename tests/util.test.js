const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const U = require('../lib/util');

// helper: build a UTC ms timestamp from an IST wall-clock time
const ist = (y, mo, d, h, mi = 0) => Date.UTC(y, mo - 1, d, h, mi) - 330 * 60000;

test('opt-out detection', () => {
  for (const t of ['STOP', 'stop messaging me', 'Unsubscribe', 'not interested', "don't contact me", 'remove me please']) assert.ok(U.isOptOut(t), t);
  for (const t of ['please stop by tomorrow', 'I am interested', 'what services do you offer', 'bus stop']) assert.ok(!U.isOptOut(t), t);
});

test('pricing and human-request detection', () => {
  for (const t of ['what is the price?', 'How much for a logo', 'send me a quotation', 'any discount?', 'your packages']) assert.ok(U.asksPrice(t), t);
  assert.ok(!U.asksPrice('I want a website for my salon'));
  for (const t of ['can I talk to someone', 'call me tomorrow', 'I want to speak to Megh', 'schedule a call', 'are you a human?']) assert.ok(U.wantsHuman(t), t);
  assert.ok(!U.wantsHuman('tell me about social media'));
});

test('business hours are Mon-Sat 10:00-19:00 IST', () => {
  assert.ok(U.inBusinessHours(ist(2026, 10, 8, 10, 0)));   // Thu 10:00
  assert.ok(U.inBusinessHours(ist(2026, 10, 8, 18, 59)));
  assert.ok(!U.inBusinessHours(ist(2026, 10, 8, 19, 0)));
  assert.ok(!U.inBusinessHours(ist(2026, 10, 8, 9, 59)));
  assert.ok(U.inBusinessHours(ist(2026, 10, 10, 12)));     // Saturday
  assert.ok(!U.inBusinessHours(ist(2026, 10, 11, 12)));    // Sunday
});

test('toBusinessTime moves night and Sunday times to the next 10:00 IST', () => {
  const night = ist(2026, 10, 8, 22, 15);                   // Thu 22:15
  assert.equal(U.toBusinessTime(night), ist(2026, 10, 9, 10, 0));
  const sunday = ist(2026, 10, 11, 11, 0);                  // Sun 11:00
  assert.equal(U.toBusinessTime(sunday), ist(2026, 10, 12, 10, 0)); // Mon 10:00
  const ok = ist(2026, 10, 8, 12, 20);
  assert.equal(U.toBusinessTime(ok), ok);
});

test('full follow-up schedule: 24h, 72h, 7d, then cold', () => {
  const t0 = ist(2026, 10, 7, 15, 0);                        // Wed 15:00
  assert.equal(U.nextFollowupAt(0, t0, 'full'), ist(2026, 10, 8, 15, 0));
  assert.equal(U.nextFollowupAt(1, t0, 'full'), ist(2026, 10, 10, 15, 0));  // Sat 15:00 is allowed
  assert.equal(U.nextFollowupAt(2, t0, 'full'), ist(2026, 10, 14, 15, 0));
  assert.equal(U.nextFollowupAt(3, t0, 'full'), null);
  // a follow-up that would land on a Sunday evening is pushed to Monday 10:00
  assert.equal(U.nextFollowupAt(0, ist(2026, 10, 10, 20, 0), 'full'), ist(2026, 10, 12, 10, 0));
});

test('free mode: one nudge at 20h, always inside the free 24h window', () => {
  assert.equal(U.nextFollowupAt(0, ist(2026, 10, 7, 15, 0), 'free'), ist(2026, 10, 8, 11, 0));  // 15:00 + 20h = 11:00 next day
  assert.equal(U.nextFollowupAt(1, ist(2026, 10, 7, 15, 0), 'free'), null);                     // only one nudge
  // lead writes at 23:00 -> +20h = 19:00 (just outside hours) -> pulled back to the last business minute, still < 24h
  const t = U.nextFollowupAt(0, ist(2026, 10, 7, 23, 0), 'free');
  assert.ok(U.inBusinessHours(t));
  assert.ok(t - ist(2026, 10, 7, 23, 0) < 23 * U.HOUR && t - ist(2026, 10, 7, 23, 0) >= 3 * U.HOUR);
  // lead writes at 05:00 -> +20h = 01:00 -> backward lands 18:59 the previous day (<3h gap) -> falls back to next 10:00
  const early = U.nextFollowupAt(0, ist(2026, 10, 7, 5, 0), 'free');
  assert.ok(U.inBusinessHours(early));
});

test('mode defaults to free unless FOLLOWUP_MODE=full', () => {
  const saved = process.env.FOLLOWUP_MODE;
  delete process.env.FOLLOWUP_MODE; assert.equal(U.followupMode(), 'free'); assert.equal(U.maxFollowups(), 1);
  process.env.FOLLOWUP_MODE = 'full'; assert.equal(U.followupMode(), 'full'); assert.equal(U.maxFollowups(), 3);
  if (saved === undefined) delete process.env.FOLLOWUP_MODE; else process.env.FOLLOWUP_MODE = saved;
});

test('24h WhatsApp window', () => {
  const now = ist(2026, 10, 8, 12);
  assert.ok(U.windowOpen(now - 22 * U.HOUR, now));
  assert.ok(!U.windowOpen(now - 23.5 * U.HOUR, now));
  assert.ok(!U.windowOpen(null, now));
});

test('webhook signature verification', () => {
  const body = '{"a":1}';
  const secret = 's3cret';
  const good = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  assert.ok(U.verifySignature(body, good, secret));
  assert.ok(!U.verifySignature(body + ' ', good, secret));
  assert.ok(!U.verifySignature(body, 'sha256=deadbeef', secret));
  assert.ok(!U.verifySignature(body, undefined, secret));
  assert.ok(U.verifySignature(body, undefined, ''));         // secret not configured -> skipped
});

test('owner command parsing', () => {
  assert.deepEqual(U.parseOwnerCommand('info 2'), { cmd: 'info', n: 2 });
  assert.deepEqual(U.parseOwnerCommand('Pause #3'), { cmd: 'pause', n: 3 });
  assert.deepEqual(U.parseOwnerCommand('WON 1'), { cmd: 'won', n: 1 });
  assert.equal(U.parseOwnerCommand('hi').cmd, 'status');
  assert.equal(U.parseOwnerCommand('handoffs').cmd, 'handoffs');
  assert.equal(U.parseOwnerCommand('follow-ups').cmd, 'followups');
  assert.equal(U.parseOwnerCommand('blah').cmd, 'help');
});

test('template variable sanitising and names', () => {
  assert.equal(U.templateSafe('a\nb\n\nc   d'), 'a | b | c d');
  assert.equal(U.firstName('Priya Shah'), 'Priya');
  assert.equal(U.firstName('919876543210'), 'there');
  assert.equal(U.firstName(''), 'there');
});
