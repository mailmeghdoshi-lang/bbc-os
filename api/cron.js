// Scheduled tick: follow-ups + morning brief + housekeeping.
// Vercel Cron calls this daily (see vercel.json). For hourly follow-ups, point a free pinger such as
// cron-job.org at: https://<your-domain>/api/cron   with header   Authorization: Bearer <CRON_SECRET>
const U = require('../lib/util');
const flow = require('../lib/flow');

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : (req.headers['x-cron-key'] || '');
  if (!secret || !U.safeEqual(provided, secret)) return res.status(401).json({ error: 'unauthorized' });

  const now = Date.now();
  const out = {};
  try { out.brief = await flow.sendMorningBrief(now, req.query && req.query.force === '1'); } catch (e) { out.brief = { error: e.message }; await flow.logErr('cron-brief', e); }
  try { out.followups = await flow.runFollowups(now); } catch (e) { out.followups = { error: e.message }; await flow.logErr('cron-followups', e); }
  try { await flow.cleanup(now); } catch (e) { await flow.logErr('cron-cleanup', e); }
  return res.status(200).json(out);
};
