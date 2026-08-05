---
name: prepare-brand-outreach
description: Research, qualify, prepare, and manage initial or follow-up commercial outreach for Trail Running Cal. Use when the user provides a brand URL for cold outreach or asks to inspect an existing Notion lead and Gmail thread, decide whether a follow-up is appropriate, or create a personalized Gmail draft for sponsorship, advertising, affiliate, or brand-presence outreach.
---

# Prepare Brand Outreach

Prepare one reviewable commercial opportunity for one company. Support both initial outreach and follow-up, but never send the email.

## Required context

- Read the installed `product-context` skill for current Trail Running Cal positioning.
- Apply the installed `brand-sponsor-fit` rubric for new-lead qualification and FitScore.
- Read [references/notion-crm.md](references/notion-crm.md) before using Notion.
- Read [references/email-template.md](references/email-template.md) only for initial outreach.
- Read [references/follow-up-template.md](references/follow-up-template.md) only for follow-up work.

## Determine outreach mode

Choose exactly one mode before researching or drafting:

- `initial`: no previous commercial outreach exists for the company or recipient.
- `follow-up`: Gmail contains a sent commercial message and no later meaningful human reply from the lead.

An existing thread blocks a duplicate `initial` draft. It activates `follow-up` only when the user requested follow-up work and the thread passes the eligibility rules in `references/follow-up-template.md`.

If the latest meaningful message came from the lead, report that Ruben owes the next response and stop before drafting a follow-up. If the mode cannot be established, report the ambiguity and stop.

## Common workflow

### 1. Resolve and deduplicate the company

1. Accept one unambiguous company URL or one existing Notion lead.
2. Normalize any registrable domain by removing protocol, `www`, paths, query parameters, fragments, and trailing slashes.
3. Search the Notion Leads database by normalized website domain and company name. Update an existing record rather than creating a duplicate.
4. Search Gmail by company domain, company name, known contacts, and known email addresses. Inspect the full relevant thread before choosing the mode.
5. If multiple plausible records or threads exist, resolve them with evidence or request clarification rather than guessing.

### 2. Research the strategic point

1. Identify one current business priority the company is visibly investing in and that Trail Running Cal can credibly support through repeated visibility among trail runners in Catalonia or Spain.
2. Select exactly one strategic signal from the allowed categories: Spanish or European expansion; relevant product launch or category push; trail-running positioning or investment; athlete, race, team, or circuit sponsorship; distributor, store, or channel entry; or a relevant campaign or activation.
3. Prefer the initiative with the clearest connection to awareness, consideration, adoption, distribution, or market entry.
4. Translate the evidence into a business objective and a credible Trail Running Cal contribution. Use: `verifiable fact → strategic objective → how Trail Running Cal helps`.
5. Prefer official company sources and reliable public sources. Use the company's own terminology where practical. Record the source URL and publication or access date for every dynamic claim used.
6. Reject a strategic point that could be sent unchanged to a direct competitor. Never invent or exaggerate a launch, expansion, priority, objective, or source.
7. If no sufficiently specific and verifiable point exists, stop with `RESEARCH NEEDED` and explain the missing evidence. Do not create a draft.

## Initial outreach workflow

Run this branch only in `initial` mode.

### 3. Research and qualify

1. Identify the precise company, official domain, market, corporate LinkedIn, products, target customers, geographic footprint, and evidence of activity in Spain or Iberia.
2. Apply the `brand-sponsor-fit` rubric. Treat 65 as the minimum FitScore for automatically spending contact-provider credits and creating a draft.
3. If FitScore is below 65, update the supported CRM research fields, preserve the existing commercial state, and stop before paid contact lookup or Gmail drafting. Do not infer `Cerrado sin éxito`.

### 4. Upsert the CRM record

Follow [references/notion-crm.md](references/notion-crm.md) exactly.

- Populate only evidence-backed values.
- Preserve existing human-entered values unless newer evidence clearly supersedes them.
- Never write to `Notas`.
- For a newly created qualified lead, set `Estado` to `Pendiente`.
- For an existing lead, preserve `Estado`.

### 5. Find and rank contact doors

Find 3–5 current people where public evidence permits. Rank them in this order:

1. Brand or Marketing lead for Spain/Iberia.
2. Partnerships, Sponsorships, Sports Marketing, or Community lead.
3. Growth or E-commerce lead for Spain/Iberia.
4. Distributor or agency contact responsible for the Spanish market.
5. Founder or general manager when the company is small.

For each candidate, retain name, current title, geography, source URL, and a short selection rationale. Prefer responsibility for the relevant market over global seniority. Do not treat an unverified search-result snippet as proof of a current role when a better source is available. Select exactly one first contact. Do not select a generic address when a qualified named contact with a verified professional email is available.

### 6. Resolve one email economically

1. Check remaining Prospeo quota with its free account-information tool.
2. Use Prospeo first to enrich only the selected person. Request professional email only; never request a mobile number.
3. Accept only an email Prospeo marks verified.
4. If Prospeo returns no verified email, check Hunter quota with its free usage tool and use Hunter Email Finder for that same person and domain.
5. Accept only a deliverable/valid result with adequate confidence. Treat `accept_all`, unknown, or low-confidence results as requiring human review.
6. Infer a company email pattern only when supported by public examples. Never create a Gmail draft to an inferred address unless a provider verifies it as valid.

Default credit ceiling: at most one person lookup per provider per company. Do not broaden the search or spend further credits without explicit user approval.

### 7. Compose and create the initial draft

1. Use [references/email-template.md](references/email-template.md).
2. Write in Spanish by default; adapt only when the contact's working language is clearly different.
3. Repeat the Gmail duplicate check after resolving the final recipient.
4. Create one draft addressed only to the selected contact.
5. Never send, schedule, or enroll the contact in a sequence.

### 8. Finalize Notion after an initial draft

After the draft succeeds:

- Store the selected contact and verified email.
- Store all verified alternative contacts in the existing multiline contact fields.
- Update `Fecha actualización`.
- Keep `Estado = Pendiente`.
- Leave `Fecha primer contacto` empty.
- Do not set `Método contacto = Email` until the email is actually sent.

If draft creation fails, keep the research and contacts but report the blocker. Do not mark the company as contacted.

## Follow-up workflow

Run this branch only in `follow-up` mode.

### 3. Establish follow-up eligibility

1. Read the complete Gmail thread, not only search-result snippets.
2. Identify the latest meaningful human inbound and outbound messages.
3. Ignore automated acknowledgements, delivery notices, and out-of-office responses as human replies, but respect any return date they contain.
4. Confirm the latest meaningful message was sent by Ruben and that the cadence, attempt limit, opt-out, and suppression rules in [references/follow-up-template.md](references/follow-up-template.md) allow another touch.
5. Check Notion for channel history and human notes. Do not assume silence in Gmail means no LinkedIn, phone, or meeting response.
6. Classify the opportunity as `draft now`, `wait until DATE`, `Ruben owes reply`, `close or park`, or `research needed`.
7. Create a draft only for `draft now`.

### 4. Compose and create the follow-up draft

1. Use the approved structure and exact guardrails in [references/follow-up-template.md](references/follow-up-template.md).
2. Use the strategic point validated in the common workflow. Do not merely repeat a company event; express the strategic outcome Trail Running Cal can support.
3. Match the language and tone of the existing thread.
4. Create the draft as a reply to the latest relevant sent message so it remains in the existing thread.
5. Address the established recipient. Do not introduce new recipients without resolving their identity and authority.
6. Never send, schedule, or enroll the contact in a sequence.

### 5. Preserve CRM state after a follow-up draft

- Do not change `Estado`, `Fecha primer contacto`, `Método contacto`, or human `Notas` merely because a draft exists.
- Do not record the follow-up as completed until it is actually sent.
- Report any stale or contradictory CRM state for human review instead of silently rewriting commercial history.

## Output

Return a compact execution summary.

For `initial`:

- company and FitScore;
- Notion record created or updated;
- ranked contacts and selected first contact;
- email source and verification status;
- Gmail draft created or reason it was blocked;
- credits consumed by provider;
- source links supporting the personalization.

For `follow-up`:

- company, recipient, and current Notion state;
- last meaningful outbound, last human reply, and automated-response handling;
- classification and timing rationale;
- validated strategic point and source;
- Gmail reply draft created or reason it was blocked;
- recommended CRM correction, if any, without applying it unless requested.

## Safety and scope

- Process one company and one recipient per execution unless the user explicitly requests a bounded batch.
- Use only public professional information relevant to B2B outreach.
- Never fabricate company facts, roles, email addresses, metrics, strategic priorities, or sources.
- Never send an email. Create reviewable drafts only.
- Respect prior outreach, opt-outs, suppression signals, out-of-office dates, meetings, replies through other channels, and existing CRM state.
- Stop safely when the company, contact, email, strategic point, or follow-up eligibility cannot be established with sufficient confidence.
