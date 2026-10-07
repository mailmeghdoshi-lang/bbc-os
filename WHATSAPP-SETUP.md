# BBC WhatsApp Lead Assistant: setup guide

What this adds to Agency OS:

- A WhatsApp assistant that talks to every lead who messages BBC, qualifies them, and follows up on a schedule.
- Instant WhatsApp pings to Megh when a lead needs a human (pricing, call request, ready to buy, complaint, and so on).
- A morning WhatsApp brief: what needs you, what the bot is handling, what is going cold.
- A lead desk page at `/wa.html` to see every conversation, take over, send a reply, and mark won or lost.

It lives in its own area of the database (`/bbcWA`) and does not touch the existing Agency OS data.

## How it behaves

| Situation | What happens |
|---|---|
| New lead messages | Replies within seconds, introduces itself as BBC's AI assistant, asks about the business, goal, timeline and (softly) budget |
| Asks about price, a call, or for Megh | Replies politely, then **hands off**: the bot goes quiet on that chat and Megh gets a WhatsApp ping |
| Ready to buy / complaint / existing client | Hand-off with the reason |
| Lead goes quiet | **Free mode (default):** one follow-up at about 20h, inside WhatsApp's free 24h window, then cold. **Full mode** (`FOLLOWUP_MODE=full`): follow-ups at 24h, 3 days and 7 days using a paid template. Always 10am to 7pm IST, Mon to Sat |
| Lead says STOP / not interested | Confirms once, never messages again |
| Vendor pitch or job seeker | Short polite reply, closed, no ping |
| Claude is unavailable | Lead still gets a safe holding reply and Megh is alerted |
| Megh replies from the WhatsApp Business app | Bot pauses on that chat (needs coexistence, see Step 1) |

**Hard rules baked into the assistant:** it never quotes prices or discounts, never promises results or dates, never invents clients or case studies, never discusses contracts or payments, and always admits it is an AI if asked.

### Megh's WhatsApp commands

Message the bot number from +91 97692 77652:

`status` (the brief) · `handoffs` · `followups` · `info 2` · `pause 2` · `resume 2` · `done 2` · `won 2` · `lost 2`

The number is the position in your latest brief or `status` list.

## Step 1. WhatsApp Business Platform (Meta)

1. Go to developers.facebook.com, create an app (type **Business**) and add the **WhatsApp** product.
2. **Number.** Today you use the WhatsApp Business *app*. Options:
   - **Start with a spare SIM/number** that is not on WhatsApp (fastest, safest for testing). The API number cannot also be used in the phone app.
   - **Coexistence**: Meta lets some Business-app numbers connect to the API while keeping the app. Check whether it is offered for your number during setup; if it is, this is the best option because you keep chatting from your phone and the bot pauses automatically when you do.
   - Migrating your main number to API-only disables the phone app on it. Avoid this unless you accept that.
3. Create a **System User** in Business Settings, give it your WhatsApp account, and generate a **permanent token** with `whatsapp_business_messaging` and `whatsapp_business_management`. This is `WA_TOKEN`.
4. Note the **Phone number ID** (`WA_PHONE_NUMBER_ID`) and the **App Secret** (`WA_APP_SECRET`, App settings > Basic).
5. Create **message templates** (WhatsApp only allows free text within 24 hours of the lead's last message):
   - `bbc_owner_update` (needed in both modes: it delivers hand-off pings and the morning brief when you haven't messaged the bot that day) (category Utility, language English), body: `BBC lead update: {{1}}`
   - `bbc_followup` (**full mode only**; skip it in free mode), body: `Hi {{1}}, this is Butter Branding Co. Just checking in on your enquiry. Would you like to continue the conversation? Reply here anytime.`
   Wait for approval before going live. In full mode, without `bbc_followup`, follow-ups after 24h are held back and flagged in your brief.

## Step 2. Firebase

1. Firebase console > Project settings > Service accounts > **Generate new private key**. Keep the JSON safe; this is `FIREBASE_SERVICE_ACCOUNT` (paste the JSON, or its base64).
2. Add this under your existing Realtime Database rules so the chat data is never readable from a browser (the server uses the admin key and bypasses rules):
```json
{
  "rules": {
    "bbcWA": { ".read": false, ".write": false }
    // ...keep your existing rules for bbcOS as they are
  }
}
```

## Step 3. Vercel environment variables

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | from console.anthropic.com |
| `ANTHROPIC_MODEL` | optional, default `claude-sonnet-5-5` |
| `FIREBASE_SERVICE_ACCOUNT` | the service-account JSON (or base64) |
| `WA_PHONE_NUMBER_ID`, `WA_TOKEN`, `WA_APP_SECRET` | from Step 1 |
| `WA_VERIFY_TOKEN` | any long random string you choose |
| `OWNER_WA` | `919769277652` |
| `WA_OWNER_TEMPLATE` | `bbc_owner_update` |
| `FOLLOWUP_MODE` | leave unset for free mode, or `full` |
| `WA_FOLLOWUP_TEMPLATE` | `bbc_followup` (full mode only) |
| `CRON_SECRET` | any long random string |
| `DASHBOARD_PASSWORD` | the password for `/wa.html` |

Optional: `WA_OWNER_TEMPLATE_LANG`, `WA_FOLLOWUP_TEMPLATE_LANG` (default `en`), `WA_GRAPH_VERSION` (default `v21.0`).

Then deploy (merge these files into the repo; Vercel installs `firebase-admin` automatically from `package.json`).

## Step 4. Connect the webhook

In Meta > WhatsApp > Configuration:

- Callback URL: `https://<your-vercel-domain>/api/whatsapp`
- Verify token: your `WA_VERIFY_TOKEN`
- Subscribe to **messages**, and **smb_message_echoes** if you are using coexistence.

## Step 5. Schedules

`vercel.json` runs `/api/cron` daily at 10:00 IST (morning brief + due follow-ups). Vercel's free plan only allows once a day. **In free mode the pinger is required**, because the one free follow-up must go out within the 24h window; add a free pinger (cron-job.org) that calls `https://<domain>/api/cron` every hour with the header `Authorization: Bearer <CRON_SECRET>`. The endpoint itself enforces business hours and sends the brief once a day, so extra calls are harmless.

## Step 6. Test before real leads

1. Message the bot number from a friend's phone: "Hi, I run a salon and need Instagram help". You should get a reply in seconds.
2. Ask "what is the price?". You should get a polite reply, and Megh should get a **HAND-OFF** ping.
3. Send STOP from the test phone. It should confirm once and stay silent after.
4. From Megh's phone send `status`. You should get the brief.
5. Open `/wa.html`, enter the dashboard password, and check the conversations appear.

Run `npm test` in the repo for the automated tests (25 checks of the logic).

## Things to know

- **Not built yet:** calendar booking (the bot collects the preferred time and Megh confirms), listening to voice notes (it asks them to type), and automatic sync into Lead Master. Agency OS rewrites its whole database on every save, so the safe path is the dashboard's "Copy for Lead Master" button until Lead Master is moved to its own data node.
- **Security:** Agency OS login is checked in the browser, and its data is readable by anyone who can reach the database unless your Firebase rules restrict it. Worth tightening separately. The WhatsApp data is protected by the rules in Step 2 and the dashboard password.
- **Costs:** Meta charges for template messages and for conversations outside its free allowances (see the current India rate card); Claude API usage is a few paise per conversation turn. Both scale with lead volume.
- **Compliance:** the assistant discloses it is an AI, honours STOP immediately, and only follows up on people who messaged you first. Do not use it to cold-message people who have not contacted you.
