# LickYourPhone Onboarding Portal — Build Document

Client: LickYourPhone Media, Australian hospitality marketing agency, \~30 staff, operating in QLD, NSW, VIC and WA.

Companion files, provided separately:

- `services.seed.json` — all 12 services with confirmed pricing, tiers and inclusions  
- `tokens.md` — brand palette and typography

---

# 1\. Context

## What exists today

1. Sales runs a discovery call, then a marketing call where the proposal is presented.  
2. An assistant builds the proposal in PandaDoc from one of two templates: Brand Partnership, or Marketing Services. Multi-service clients receive two separate documents.  
3. Sales adds internal notes (discounts, context) before sending.  
4. Client signs.  
5. Automations fire: Slack to `Client Contracts`, email to client with a JotForm link, email to Sofia and the account managers, Google Drive folder created or matched.  
6. **A staff member then reopens the PandaDoc, picks the client's state from a dropdown, and re-signs.** This is what routes the client to the correct state-specific JotForm.  
7. Client completes the JotForm. Eight forms exist, two per state, with conditional logic based on services signed. Part one is intake, part two is credit card capture.  
8. On completion, ClickUp tasks are created for onboarding and accounts, documents go to Drive.

## What breaks

| Failure | Consequence |
| :---- | :---- |
| Manual state selection and re-sign after signature | Wrong state assigns the wrong videographers. If nobody does it, onboarding never starts. |
| Client name typed by hand | `Tony's` and `Tonys` become two clients and two Drive folders |
| Two-part JotForm | Clients skip the mandatory card step; accounts chases manually |
| PandaDoc links expire | Clients can't retrieve their own signed contract |
| Eight JotForms | Any change to the offering means editing eight forms by hand |
| Two templates | Multi-service clients get two documents |
| Twelve dropdowns on the agreement page | Client reads 20 pages of pricing, then re-enters what they want, unpriced, with no total |

**Every failure above is a human retyping something the system already knew.** That is the problem being solved. Judge every decision against it.

## What replaces it

A single branded web portal at `client.<domain>` that carries the client from proposal through signature, payment and intake, with an admin dashboard where the agency controls all content, pricing and services without a developer.

---

# 2\. System

## Stack

| Concern | Choice |
| :---- | :---- |
| Framework | Next.js, App Router, TypeScript |
| Hosting | Vercel |
| Database | Supabase Postgres |
| ORM | Drizzle or Prisma — pick one, never mix |
| File storage | Supabase Storage as landing zone, then push to Google Drive |
| Email | Resend, verified sending domain with SPF and DKIM |
| Payments | Pinch, `docs.getpinch.com.au`, header `pinch-version: 2020.1` |
| Downstream automation | n8n, via signed webhook |
| Retries | `IntegrationJob` table: status, idempotency key, attempt count, retry sweep. Do not install Inngest, Trigger.dev or BullMQ. |
| Auth | Google Workspace SSO for staff, signed tokens for clients |
| PDF | Any standard HTML-to-PDF library |

## Non-negotiable constraints

Violating any of these means the build has failed, regardless of whether it works.

1. **No service page is a hardcoded component.** Every page in the client flow is a database row rendered by one generic template. If you create `VideographyPage.tsx` you have built the wrong thing. Adding a service is data entry in the admin, never a deploy.  
2. **No hardcoded hex values.** Use the tokens in `tokens.md`.  
3. **No card number touches the server, the database, or a log.** See section 5\.  
4. **Client name is never a join key.** Internal ID plus a normalised slug for Drive matching.  
5. **Every outbound integration call is idempotent.** Replaying a webhook must never create a second Drive folder or ClickUp task.  
6. **Prices are computed, never stored twice.** `list = target / (1 - discount_pct)`. The computed total is snapshotted onto the proposal at signature, so later catalogue edits cannot alter a signed agreement.  
7. **Venue location is set at proposal creation and immutable after signature.**  
8. **`Client` and `Venue` are separate entities.** One paying client can have several venues, in different states, on different services.  
9. **Every state-changing action writes an `AuditEvent`.**

## Data model

User, Role

Client                 the paying entity

Venue                  location; carries state and provider assignment

Contact

State                  seeded QLD, NSW, VIC, WA; extensible from admin

Provider               videographers, photographers; mapped to states

Page                   type: service | content; sequence; visible flag

ContentBlock           rich text and image blocks belonging to a Page

Service                see services.seed.json for shape

ServiceTier            term or volume tiers on a Service

Proposal

ProposalLineItem       snapshots price at signature

InternalNote

IntakeQuestion, IntakeCondition, IntakeResponse

Document

Payment, PaymentSchedule

AuditEvent

IntegrationJob

## Two surfaces

### Admin (staff)

- `New Client Proposal` as the single entry point  
- Service catalogue CRUD: name, copy, images, pricing, tiers, discount, inclusions  
- Content editing: any body copy, any image, page reorder, page show/hide  
- **Add new service** as one action that creates the service, its page, its content blocks, its selector and its position in the sequence  
- State and provider registry  
- Client list: services held, agreements, Drive links, payment status, intake status  
- Internal notes carried from sales through to delivery  
- Venue location captured at proposal creation

### Client portal

A paginated full-screen carousel replicating the current deck design on screen. Never rendered to PDF.

- One page per service, forward and back navigation  
- A selector on each service page (toggle, or tier picker where tiers exist)  
- A persistent live running total showing list price, discount applied and total  
- Non-service pages (cover, press, team, results, who we are, promise, next steps) sit in the same pagination and are equally editable  
- Ends at a read-only summary of selections, then signature, then payment  
- Responsive on mobile and tablet  
- Usable two ways: presented live by sales on a call, or sent as a link

### Link lifecycle

| State | Access |
| :---- | :---- |
| Sent, unsigned | Client can view and configure. Revocable by staff. |
| Signed | Client retains **permanent** access to the signed contract. Non-negotiable; expiring links are a named pain point. |
| Superseded | Replaced by a re-issue. Staff-visible only. |

Links are unguessable signed tokens, never sequential IDs.

## The contract PDF

Separate from the carousel and deliberately plain:

- Branded letterhead with logo  
- Light use of brand colour  
- List of services selected, with terms and pricing  
- Terms and conditions  
- Signature blocks for both client and agency  
- Downloadable by both parties

No photography, no smoke backgrounds, no phone mockups.

## Automations on signature

**Portal owns these — atomic with the signature:**

| Action | Note |
| :---- | :---- |
| Write proposal and line items | Snapshot prices |
| Generate contract PDF |  |
| Google Drive: create folder or match existing | Dedupe on normalised slug, never the typed name |
| Upload contract to Drive |  |
| Email client via Resend | Signed contract, T\&Cs, payment instructions |
| Create Pinch payer and schedule payments | See section 5 |

**Emitted to n8n as one signed webhook:**

Slack to `Client Contracts`, ClickUp tasks (onboarding list and accounts list), internal email to Sofia and AMs, anything else the agency wants to change later.

Killing n8n must not prevent a client signing and receiving their contract.

**On intake completion:** upload responses and client assets to Drive, emit to n8n.

---

# 3\. Content

## Services

Twelve services across two source templates. Full data in `services.seed.json`: pricing in cents, exclusive of GST, with tiers, inclusions and client obligations.

| Service | Billing | Price |
| :---- | :---- | :---- |
| Exclusive Brand Partnership | One-off, 7 weeks | $5,985 (list $7,980, 25% off within 7 days) |
| Complimentary Visit | Paid in kind | — |
| Complimentary Brand Partnership | Paid in kind | — |
| Videography — Reels Subscription | Monthly, 12 months | $1,249/mo (list $1,561.25, 20% off within 24h) |
| Community Management | Monthly, 12 months | $985/mo (list $1,231.25) |
| Videography — Reels | One-off | $2,495 |
| Photography — Images | One-off | $2,495 |
| Meta Digital Ads | Monthly, 3 terms | $389 / $489 / $589 per week |
| TikTok Digital Ads | Monthly, 3 terms | $389 / $489 / $589 per week |
| Influencer Marketing | Monthly, 3 terms | $389 / $489 / $589 per week |
| Media Event | One-off, 2 tiers | $4,791.20 (30 influencers) / $6,391.20 (60 influencers) |
| Paid Partnership | One-off | $1,595 |

### Pricing rules

- Discount is uniform per service and stored as a percentage. List price is derived: `list = target / (1 - discount_pct)`. Verified against every price in both source documents.  
- Discount windows differ: 24 hours on Marketing Services, 7 days on Brand Partnership.  
- Three services carry no discount: Videography Reels, Photography, Paid Partnership.  
- Two services are zero-price and paid in kind. They must skip payment entirely and never create a Pinch payment.  
- **Paid Partnership is dependent.** Only selectable alongside at least one other service. Disabled until another service is chosen; auto-deselects if the last other service is removed.  
- Weekly prices are **displayed** per week and **billed** monthly.  
- Tiers are tiers on one service, never three separate services.

### Do not "fix" these

They are correct as specified in the source documents:

- Meta Ads, TikTok Ads and Influencer Marketing carry identical pricing  
- Two services are priced at zero  
- Paid Partnership cannot be selected alone  
- Weekly display, monthly billing

## Contract terms

Carry these into the generated agreement:

- Agreement starts as agreed at the initial onboarding meeting and runs for the selected period  
- Payments in advance, automatically deducted monthly from the nominated card, **seven days before the start date**  
- One-time services deducted once at the beginning of the contract  
- Late or missed payments incur late fees  
- Early termination triggers full enforcement of termination fees per the attached T\&Cs  
- Onboarding is a Google Meet; no in-person meetings offered  
- Video edits: up to 14 business days for the edited album  
- Videoshoot cancellation under 3 business days notice: cancellation fee  
- Photoshoot cancellation under 7 business days notice: photographer's cancellation policy  
- Travel fee for locations outside the standard service area  
- Additional fee if the client requests their marketer attend a shoot  
- Influencer list prepared within 7 days of activation; attendance not guaranteed  
- Ads: up to two weeks to commence once parameters, access and assets are provided  
- TikTok minimum ad spend $20 per day per campaign

## Page inventory

Cover · Press and Media · Meat Your Team · We Get Results · Marketing Growth Strategy divider · Videography Reels Subscription · Community Management · Who We Are / Trusted By · Videography Reels · Photography · Meta Digital Ads · TikTok Digital Ads · Influencer Marketing · Media Event · Paid Partnership · Our Promise / Recipe For Success · Next Steps · Summary · Signature · Payment · Intake

All of these are `Page` rows. None are components.

## Brand

Full tokens in `tokens.md`.

**Colour.** Primary: white `#FFFFFF`, cherry `#B22626`, black `#000000`. Supporting: deep maroon `#6D080A`, deep red `#9B0102`, off-white `#EEE7E7`.

**Typography.** Headings Fira Sans Bold, body Montserrat. Both free, both self-hosted. Do not load from a third-party CDN — the payment page must make no third-party requests.

**Imagery.** Food photography, team shots, vibrant lighting. Duo-tone in cherry and black. Cherry overlay at 50% transparency.

**Contrast rule.** Never set black text on cherry. It is \~3.2:1 and fails WCAG AA. White on cherry is \~6.6:1 and passes. The legacy deck gets this wrong on every pricing block; do not replicate it.

## Intake

Captured from the live JotForm, 30 Jul 2026\. Six pages. Every question below is an `IntakeQuestion` row, never a hardcoded form. `IntakeCondition` rows key visibility to signed services and venue state.

### Question types the engine must support

`text` · `textarea` · `email` · `phone` (country code \+ number) · `abn` · `address` (street / city / state / postcode / country, default Australia) · `radio` · `checkbox` · `multiselect` · `file` (multi-file, drag and drop) · `matrix` (rows × columns) · `repeatable_group` (add rows of sub-fields) · `provider_picker` (image, name, description, portfolio link, price) · `static_content` (instructional copy with no input)

### Page 1 — Welcome

Copy: `Welcome to LickYourPhone Media, {company}` plus intro text. Merge fields required.

| Field | Type | Note |
| :---- | :---- | :---- |
| Access Email | email, required | Auto-populated |

**Delete every hidden field on this page.** The current form carries: Template Type, Marketing Plan, Contract Length, Digital Ads, TikTok Marketing, Influencer Marketing, Influencer Event, LYP Sponsorship, Event Content Creation, Content Creation, Proposal Id, ClickUp IDs, Google Drive Ids, Mezze Investment, Others. Four are labelled "Used for Automation. Don't change."

These exist only because Zapier has to stuff IDs and service selections into a form that has no connection to the proposal. In the portal the intake **is** part of the proposal record, so all fifteen become relations or are already known. If any of them appears as a field in the new build, the architecture is wrong.

`Mezze Investment` is an unexplained field name, possibly a leftover from one client. Confirm before discarding.

### Page 2 — Business Information

**Company Information**

| Field | Type | Required |
| :---- | :---- | :---- |
| Entity name | text | Yes |
| ABN | abn | Yes |
| Mailing address | address | No |
| Email for invoices | email | No |
| Director's details | text × 2 (first, last) | Yes |
| Director's Email | email | Yes |

**Primary contact for marketing**

| Field | Type |
| :---- | :---- |
| Name | text × 2 (first, last) |
| Phone Number | phone (country code \+ number) |
| Email | email |
| Other team members to include in communication | repeatable\_group: name, email, phone |

### Page 3 — Choose your photographer

Instructional copy about rates, commercial licensing, and nominating a photographer not listed.

`provider_picker`, multi-select, required. Each option carries a thumbnail, name, description, portfolio URL and price. Current roster:

| Photographer | Price | Note |
| :---- | :---- | :---- |
| Nathan Page | Free | Regularly shoots for restaurants |
| Leigh Griffiths | Free | Regularly shoots for restaurants |
| Daniele Massacci | $350 AUD | Shoots for Da Orazio, Merivale, Maybe Sammy |
| Kitti Gould | $350 AUD | Published in major media publications |
| Lila Marvell | $400 AUD | Commercial licensing not included: $200 \+ GST per image per print. Travel fee may apply. |

**Two problems on this page, both worth raising.**

1. **Photographer selection changes the price, after the contract is signed.** A client picks a $400 photographer with additional per-image licensing fees, and there is no mechanism to charge it. The form shows JotForm's unconfigured prompt to add a payment connection, so nothing is collected. Decide whether photographer choice is a priced line item that adjusts the total, or an internal cost the agency absorbs. Right now it appears to be neither.  
2. Photographers must come from the `Provider` registry, mapped to states, not a hardcoded list. This roster is presumably one state's list; the eight JotForms exist because each state has its own.

### Page 4 — Choose your videographer

Same `provider_picker` pattern. Current roster: MATT and CHLOE, each with a portfolio link. Copy states the top pick will be contacted to confirm availability.

Note the inconsistency to normalise: photographers carry prices and descriptions, videographers carry neither. One provider schema, with price and description optional.

### Page 5 — Restaurant Details

**About Your Restaurant**

| Field | Type |
| :---- | :---- |
| What is the name of your restaurant? | text |
| What is your website? | text |
| Do you have multiple locations? If so, list details | textarea |
| What are your opening hours? | matrix — rows Mon–Sun plus Public Holidays, column Times |
| Social media accounts to use as inspiration | textarea, include links |

**Brand Guidelines** — all file uploads

| Field | Note |
| :---- | :---- |
| Current menu |  |
| Main logo file | Highest quality available |
| Other logo files | Highest quality available |
| Brand guide, if you have one |  |
| Other files: flyers, promotion materials, special offers | Logos, fonts, document templates |
| Company Fonts | text, e.g. Arial, Roboto Light, Helvetica |
| Are all documents fully uploaded? | checkbox, required |

**Drop the "are all documents uploaded" checkbox.** It exists because JotForm cannot tell the client when an async upload has finished. A proper build knows the upload state and disables Next until it completes.

**Access Audit**

The most valuable part of the whole form, and pure conditional logic. Preserve the copy: five minutes, avoids delays, and access problems can push campaign start back 1–3 weeks because Meta's recovery process is outside the agency's control.

*1\. Facebook Page Admin Check* — with the navigation instructions as `static_content`

| Field | Type | Condition |
| :---- | :---- | :---- |
| Are you listed as an Admin? | radio Yes/No, required |  |
| If someone else is Admin, who are they? | text, required | Shows on No |

*2\. Login Check*

| Field | Type |
| :---- | :---- |
| Do you personally know the login details for the Facebook account that manages your Page? | radio Yes/No, required |
| Is it a personal account or a shared business one? | text, required |

*3\. Instagram Account Check* — with the navigation instructions as `static_content`

| Field | Type | Condition |
| :---- | :---- | :---- |
| Does it say Professional account (Business or Creator)? | radio: Yes / No, it's a personal account | Required |
| Is it linked to the Facebook Page above? | radio Yes/No, required | Conditional |
| Do you personally know the Instagram login? | radio Yes/No, required |  |
| Upload screenshots if relevant | file |  |

The "No, it's a personal account" option carries inline guidance that it must be switched to Professional before analytics access is possible.

**Logins**

| Field | Type |
| :---- | :---- |
| Instagram Username | text, e.g. lickyourphone |
| Instagram Password | `static_content` only — **no input field** |

**The form deliberately does not collect social media passwords.** The copy tells the client to prepare their password for the onboarding call, where the marketer asks verbally. This is a sound decision the agency has already made. Preserve it. Do not add password fields to the portal, and do not store social credentials in the database under any circumstances.

**Facebook Page Access** — `static_content` listing the admin invitation emails. These must be editable content, not hardcoded strings.

**Meta Access (digital ads)**

| Field | Type |
| :---- | :---- |
| Do you have a Meta Business Portfolio and access to it? | radio Yes/No, required |
| Eight-step Business Manager invitation instructions | `static_content`, includes three invite emails and the warning that without access, digital ads cannot run and a set-up fee applies |

**TikTok Marketing**

| Field | Type |
| :---- | :---- |
| TikTok Username | text |
| TikTok Password | `static_content` only — no input field, same rule as Instagram |

### Page 6 — Completion

`static_content`: the client is told no payment is taken today, that they will be redirected to the payment details page, and that their marketer will make contact to schedule onboarding.

**This confirms the billing model in section 5\.** Card details are captured at the end of intake and vaulted, not charged. In the portal this stops being a redirect to a separate page and becomes the final step of one continuous flow.

### Conditional logic summary

| Trigger | Shows |
| :---- | :---- |
| Photography or content creation service signed | Page 3, photographer picker |
| Videography service signed | Page 4, videographer picker |
| Meta Ads signed | Meta Access section |
| TikTok Ads signed | TikTok Marketing section |
| Venue state | Which providers appear in pages 3 and 4 |
| "Not an Admin" on Facebook check | Who is the admin? |
| "Personal account" on Instagram check | Guidance to switch to Professional |

---

# 4\. Build plan

One stage at a time. Stop at the end of each and report against its done-definition. Do not scaffold ahead.

### Stage 0 — Foundations

Next.js App Router, TypeScript, Supabase Postgres, ORM, Vercel deploy, env management, seed script. Brand tokens as CSS custom properties. Fira Sans and Montserrat self-hosted. **Done:** deploys to a preview URL, migrations run, health check green, tokens render.

### Stage 1 — Data model and admin shell

All entities from section 2\. Auth with roles. Admin layout, navigation, empty states. **Done:** staff can log in and see the shell. Model reviewed against section 2 first.

### Stage 2 — Content model, catalogue and providers

Page and ContentBlock records with sequence, visibility and image upload. Service and ServiceTier CRUD. State and Provider registry with providers mapped to states. "Add new service" as one action creating service, page, blocks and selector together. Seed from `services.seed.json`. **Done:** a non-technical user adds a brand new service with copy, images, price and tiers, and it appears as a new page in the client flow without a deploy. Adding a fifth state requires touching nothing that already exists. If any service page exists as a bespoke component, this stage has failed.

### Stage 3 — Proposal configurator (dummy data) — **CHECKPOINT**

Internal: create proposal, pick client and venue, capture state, add internal notes, generate a unique signed link. Client-facing: paginated carousel, per-page selectors, live running total, dual logos, responsive. No live integrations. **Done:** this is the MVP the client reviews. **Nothing past this stage starts until it is approved.**

### Stage 4 — Signature and contract PDF

Signature capture. Audit trail: signer email verification, IP, user agent, timestamp, immutable document hash. Pared-back branded PDF per section 2\. Permanent access URL. **Requires:** the live `LickYourPhone Terms and Conditions.pdf`, registered entity name, ABN. **Done:** a test client signs, both parties download the PDF, the client reopens it a week later.

### Stage 5 — Payments (Pinch)

Per section 5\. **Done:** payment cannot be bypassed for paid services and never fires for paid-in-kind ones. No card number reaches the server or database. The payment page carries no third-party scripts. Onboarding fires on details captured, not funds settled.

### Stage 6 — Intake

Full question set from section 3, all six pages. Question bank architecture with the fourteen field types listed there. Conditions keyed to signed services and venue state. Provider pickers sourced from the `Provider` registry, filtered by state. Multi-file upload direct to storage then Drive, with real upload-state tracking. No hidden automation fields. No password fields. **Requires:** a decision on whether photographer selection adjusts the total (see section 3). **Done:** two different service combinations produce two correctly different forms, with no per-state duplication anywhere. Adding a state or a photographer is one admin action, not eight form edits. A new question can be added from the admin without a deploy.

### Stage 7 — Integrations

Portal-owned: Drive folder create-or-match with normalised dedupe, contract upload, client email via Resend. Emitted to n8n: Slack, ClickUp, internal notifications. `IntegrationJob` records with idempotency keys and a retry sweep. **Requires:** credentials for Drive, Slack, ClickUp, Pinch, Resend. **Done:** every action in section 2 fires from one signature with no manual step. Replaying a webhook creates no duplicates. Killing n8n does not prevent a client signing.

### Stage 8 — Client record and dashboard

Client list, services held, agreements, Drive links, payment status, intake status, audit log. **Done:** staff can answer "where is this client up to" without opening another app.

### Stage 9 — Hardening and cutover

Failure alerting to Slack, permissions review, existing client migration. Disable every legacy Zapier and Make automation that fires on PandaDoc signature or JotForm submission, in a documented order, before the first real client goes through. **Done:** ten real clients through with zero manual interventions and zero duplicates.

---

# 5\. Payments (Pinch)

## Card capture

Pinch supplies a JavaScript library, not a drop-in widget. You build the input fields yourself and style them to match the portal.

1. Load `https://cdn.getpinch.com.au/capturejs/pinch.capture.v2.js` with the `integrity` hash from Pinch's docs  
2. Initialise with the merchant **publishable** key (safe in the browser; the secret key never leaves the server)  
3. On submit, call `capture.createToken({ sourceType: "credit-card", ... })`  
4. Send only the returned token to your server

| Purpose | Endpoint |
| :---- | :---- |
| Auth | `POST https://auth.getpinch.com.au/connect/token` |
| Create customer | `POST /payers` |
| Charge immediately | `POST /payments/realtime` |
| Schedule a payment | `POST /payments` with `transactionDate` |
| Vault a source | `POST /payers/{payerId}/sources` |

Amounts in cents. Payer IDs `pyr_XXXXXXXX`, payments `pmt_XXXXXXXX`. Sandbox mirrors production and supports time travel for testing recurring billing.

## Billing model

1. At signature, create the payer from proposal data — never retyped — and **vault** the payment source. Do not charge yet.  
2. Schedule the first debit for **seven days before the campaign start date**.  
3. Schedule subsequent monthly debits for the term.  
4. One-off services are charged once at the beginning of the contract.  
5. Zero-price services skip payment entirely and never create a Pinch payment.

Pinch schedules its own payments via `transactionDate`, so no scheduler is needed on your side. Listen for webhooks.

## Two states, not one

|  | Card | Direct debit |
| :---- | :---- | :---- |
| Result timing | Immediate | 1–3 business days |
| Initial response | Actual result | `pending` — accepted for processing only |
| Result arrives via | Response body, `realtime-payment` webhook | `bank-results` webhook |
| DDR authorisation | n/a | Pinch auto-creates and emails the client a PDF |

Model `payment_details_captured` and `funds_settled` separately. **Onboarding fires on the first.** Gating on settlement would stall a direct-debit client for three days.

Build the dishonour path: a debit can bounce three days after work has started. Handle `dishonoured` results, notify accounts, use Pinch's dishonour codes to decide on retry. Their docs include dishonour-and-retry and idempotent-payment-with-nonce recipes.

## Card data — hard rules

The full card number exists only in the client's browser, between typing and tokenisation. It never reaches your server. The agency only ever sees last four, expiry and brand. That is the default. These rules exist because it is possible to break the default by accident.

**Never:**

- Session replay tools on the payment page (Hotjar, FullStory, Clarity). Biggest risk.  
- Analytics, pixels, chat widgets or any third-party script on the payment page  
- Error tracking that captures form state — explicitly scrub payment fields  
- `console.log` of form values, including during development  
- POST raw card details to your own server and tokenise there  
- Persist card values into React state that is serialised, cached or stored

**Store:** Pinch payer ID, payment source ID, last four, expiry, brand. Confirm exact response field names against the `create-payment-source` reference.

## Do not use

Pinch's hosted Payment Links. They redirect away from the portal and break the single branded experience this build exists to create.

---

# 6\. Ask, do not guess

Stop and flag rather than picking a default:

1. What happens to a sent-but-unsigned proposal when a catalogue price changes?  
2. What happens at hour 25 of a 24-hour discount — revert, expire, or honour indefinitely?  
3. Exact monthly figure for weekly-priced services. 52/12 gives $1,685.67 for the $389/wk tier; 4 weeks gives $1,556.  
4. GST: all prices are ex-GST. Does the running total display ex, inc, or both? Pinch charges a literal amount, which must be GST-inclusive.  
5. Is Arcane Hand licensed for web embedding? Until confirmed, do not ship it as a webfont.  
6. Does photographer selection adjust the client's total? Two of the five are free, three cost $350–$400, and one carries additional per-image licensing fees. Nothing is currently charged.  
7. What is the `Mezze Investment` hidden field on the JotForm welcome page?

## Assets required from the client

| Asset | Blocks |
| :---- | :---- |
| `LickYourPhone Terms and Conditions.pdf` (current live version) | Stage 4 |
| Registered entity name and ABN | Stage 4 |
| Logo SVGs, all variants, both icons | Stage 3 |
| Red smoke background image, full resolution | Stage 3 |
| Credentials: Drive, Slack, ClickUp, Pinch, Resend | Stage 7 |

