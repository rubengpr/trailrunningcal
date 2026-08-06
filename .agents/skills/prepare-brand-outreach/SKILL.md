---
name: prepare-brand-outreach
description: Research, qualify, and prepare initial commercial outreach for one Trail Running Cal brand lead, or run a daily review of existing commercial outreach to create eligible Gmail follow-up drafts. Use when the user provides a brand URL for cold outreach or asks to review unanswered outreach from ruben@trailrunningcal.com according to cadence, reply, out-of-office, suppression, and CRM rules.
---

# Prepare Brand Outreach

Support exactly two modes:

- 'initial': prepare one reviewable opportunity for one newly discovered company.
- 'daily-follow-up-review': discover and review existing commercial outreach in a bounded batch, then create eligible follow-up drafts.

Never send, schedule, or enroll an email in a sequence.

## Required context

- Read the installed 'product-context' skill for current Trail Running Cal positioning.
- Apply the installed 'brand-sponsor-fit' rubric only for initial-lead qualification and FitScore.
- Read [references/notion-crm.md](references/notion-crm.md) before using Notion.
- Read [references/email-template.md](references/email-template.md) only in 'initial' mode.
- Read [references/follow-up-template.md](references/follow-up-template.md) only in 'daily-follow-up-review' mode.

## Select the mode

Choose exactly one mode before acting:

- Select 'initial' when the user provides one company URL or one existing Notion lead and no prior commercial outreach exists.
- Select 'daily-follow-up-review' when asked to review unanswered outreach, manage follow-ups, or perform the scheduled daily workflow. This mode does not require a company input.

An existing commercial thread blocks an 'initial' draft. Do not fall back to a single-company follow-up workflow; follow-ups are managed only through 'daily-follow-up-review'.

## Strategic-point method

Apply this method only when a draft is otherwise eligible.

1. Identify one current business priority the company is visibly investing in and that Trail Running Cal can credibly support among trail runners in Catalonia or Spain.
2. Select exactly one objective: enter or grow in Spain; build awareness for a new product, range, or category; strengthen trail-running positioning; extend the value of a sponsorship or activation; or support a new Spanish distributor, store, or sales channel.
3. Select the strongest verifiable signal supporting that objective: a launch or category push; Spanish expansion; trail-running investment; athlete, race, team, or circuit sponsorship; channel entry; or a relevant campaign or activation.
4. Translate the evidence internally using: verifiable signal → likely strategic objective → credible Trail Running Cal contribution. Lead the email with the objective and contribution; use the signal only as supporting context.
5. Frame an inferred objective as a commercial hypothesis, such as `creo que podemos ayudaros a...`, rather than claiming to know an unconfirmed internal plan.
6. Prefer awareness, discovery, consideration, adoption, or Spanish market entry outcomes. Mention increasing sales only when a concrete, measurable conversion or affiliate format supports the claim; never promise sales.
7. Treat a wider European, French, or Southern European expansion only as context. Describe Trail Running Cal's contribution specifically to Spain; never imply reach in markets the product does not serve.
8. Prefer official company sources and reliable public sources. Use the company's own terminology where practical. Record the source URL and publication or access date for every dynamic claim used.
9. Reject a strategic point that could be sent unchanged to a direct competitor. Never invent or exaggerate a launch, expansion, priority, objective, outcome, or source.
10. If no sufficiently specific and verifiable point exists, classify the opportunity as 'research needed' and do not create a draft.

## Initial outreach workflow

Run this branch only in 'initial' mode.

### 1. Resolve and deduplicate the company

1. Accept one unambiguous company URL or one existing Notion lead.
2. Normalize the registrable domain by removing protocol, 'www', paths, query parameters, fragments, and trailing slashes.
3. Search the Notion Leads database by normalized website domain and exact company name. Update an existing record rather than creating a duplicate.
4. Search Gmail by company domain, company name, known contacts, and known email addresses.
5. Inspect the complete relevant thread. If prior commercial outreach exists, stop and report that follow-ups are handled by the daily workflow.
6. If multiple plausible records or threads exist, resolve them with evidence or request clarification rather than guessing.

### 2. Research and qualify

1. Identify the precise company, official domain, market, corporate LinkedIn, products, target customers, geographic footprint, and evidence of activity in Spain or Iberia.
2. Apply the 'brand-sponsor-fit' rubric. Treat 65 as the minimum FitScore for automatically spending contact-provider credits and creating a draft.
3. If FitScore is below 65, update the supported CRM research fields, preserve the existing commercial state, and stop before paid contact lookup or Gmail drafting. Do not infer 'Cerrado sin éxito'.
4. Apply the strategic-point method only after the lead passes the FitScore threshold.

### 3. Upsert the CRM record

Follow [references/notion-crm.md](references/notion-crm.md) exactly.

- Populate only evidence-backed values.
- Preserve existing human-entered values unless newer evidence clearly supersedes them.
- Never write to 'Notas'.
- For a newly created qualified lead, set 'Estado' to 'Pendiente'.
- For an existing lead, preserve 'Estado'.

### 4. Find and rank contact doors

Find 3–5 current people where public evidence permits. Rank them in this order:

1. Brand or Marketing lead for Spain/Iberia.
2. Partnerships, Sponsorships, Sports Marketing, or Community lead.
3. Growth or E-commerce lead for Spain/Iberia.
4. Distributor or agency contact responsible for the Spanish market.
5. Founder or general manager when the company is small.

For each candidate, retain name, current title, geography, source URL, and a short selection rationale. Prefer responsibility for the relevant market over global seniority. Do not treat an unverified search-result snippet as proof of a current role when a better source is available. Select exactly one first contact. Do not select a generic address when a qualified named contact with a verified professional email is available.

### 5. Resolve one email economically

1. Check remaining Prospeo quota with its free account-information tool.
2. Use Prospeo first to enrich only the selected person. Request professional email only; never request a mobile number.
3. Accept only an email Prospeo marks verified.
4. If Prospeo returns no verified email, check Hunter quota with its free usage tool and use Hunter Email Finder for that same person and domain.
5. Accept only a result marked valid or deliverable by Hunter. Treat 'accept_all', unknown, unverified, or low-confidence results as requiring human review.
6. Infer a company email pattern only when supported by public examples. Never create a Gmail draft to an inferred address unless a provider verifies it as valid.

Default credit ceiling: at most one person lookup per provider per company. Do not broaden the search or spend further credits without explicit user approval.

### 6. Compose and create the initial draft

1. Use [references/email-template.md](references/email-template.md).
2. Write in Spanish by default; adapt only when the contact's working language is clearly different.
3. Put the selected strategic objective in the first substantive sentence after Ruben's introduction. Do not open with how the company was discovered or with a generic observation about it.
4. Read the current audience and market metrics from the installed `product-context` skill. Do not reuse figures from memory, older drafts, or other skills, and do not include an unverified forecast.
5. Repeat the Gmail duplicate check after resolving the final recipient.
6. Create one draft addressed only to the selected contact.
7. Never send, schedule, or enroll the contact in a sequence.

### 7. Finalize Notion after the initial draft

After the draft succeeds:

- Store the selected contact and verified email.
- Store all verified alternative contacts in the existing multiline contact fields.
- Update 'Fecha actualización'.
- Keep 'Estado = Pendiente'.
- Leave 'Fecha primer contacto' empty.
- Do not set 'Método contacto = Email' until the email is actually sent.

If draft creation fails, keep the research and contacts but report the blocker. Do not mark the company as contacted.

## Daily follow-up review workflow

Run this branch only in 'daily-follow-up-review' mode.

### 1. Discover a bounded candidate set

1. Fetch the current Notion Leads database and its schema.
2. Build the candidate set from existing leads with evidence of previous email outreach. Use Notion to identify commercial leads and Gmail to confirm the actual sent message and recipient.
3. Search Gmail for commercial messages sent by 'ruben@trailrunningcal.com'. Do not treat every sent email as outreach. Include a thread only when it matches a Notion lead or is clearly a Trail Running Cal sponsorship, advertising, affiliate, or brand-presence message.
4. Exclude opportunities marked 'Acuerdo' or 'Cerrado sin éxito', explicit opt-outs, hard bounces, and recipients or companies with suppression signals.
5. Deduplicate candidates by Gmail thread ID, then normalized recipient address and company domain.
6. Sort candidates by the oldest date on which a follow-up became eligible.
7. Inspect at most 25 candidate threads and create at most 10 drafts per run. Report overflow for the next run rather than silently ignoring it.

### 2. Establish eligibility independently

For each candidate:

1. Read the complete Gmail thread, not only search-result snippets.
2. Identify the latest meaningful human inbound and outbound messages and count unanswered follow-ups already sent.
3. Ignore automated acknowledgements, delivery notices, and out-of-office responses as human replies, but respect any return date they contain.
4. Check Notion for channel history and human notes. Do not assume Gmail silence means no LinkedIn, phone, meeting, decline, or opt-out response.
5. Apply the cadence, attempt limit, opt-out, and suppression rules in [references/follow-up-template.md](references/follow-up-template.md).
6. Classify the opportunity as 'draft now', 'wait until DATE', 'Ruben owes reply', 'close or park', or 'research needed'.
7. Continue to research and drafting only for 'draft now'.

### 3. Prevent duplicate or stale drafts

1. Search existing Gmail drafts for an equivalent reply in the same thread.
2. If an equivalent draft exists, classify it as 'draft already exists' and do not create another.
3. Immediately before drafting, refresh the Gmail thread. If a new reply, opt-out, bounce, or relevant status change appeared, reclassify and stop.

### 4. Research and compose the follow-up

1. Apply the strategic-point method.
2. Use the approved structure and exact guardrails in [references/follow-up-template.md](references/follow-up-template.md).
3. Match the language and tone of the existing thread.
4. Create the draft as a reply to the latest relevant sent message so it remains in the existing thread.
5. Address the established recipient. Do not introduce new recipients without resolving their identity and authority.
6. Never send, schedule, or enroll the contact in a sequence.

### 5. Preserve CRM state

- Do not change 'Estado', 'Fecha primer contacto', 'Método contacto', or human 'Notas' merely because a draft exists.
- Do not record the follow-up as completed until it is actually sent.
- Report stale or contradictory CRM state for human review instead of silently rewriting commercial history.

## Output

Return a compact execution summary.

For 'initial':

- company and FitScore;
- Notion record created or updated;
- ranked contacts and selected first contact;
- email source and verification status;
- Gmail draft created or reason it was blocked;
- credits consumed by provider;
- source links supporting the personalization.

For 'daily-follow-up-review':

- number of candidate threads found and inspected;
- counts by classification;
- each draft created, with company, recipient, follow-up number, strategic point, and source;
- existing drafts skipped;
- opportunities waiting until a date or requiring Ruben's reply;
- close, park, research, overflow, and CRM-review items.

## Safety and scope

- Process one company and one recipient in 'initial' mode.
- Apply the daily batch and draft limits in 'daily-follow-up-review' mode.
- Use only public professional information relevant to B2B outreach.
- Never fabricate company facts, roles, email addresses, metrics, strategic priorities, or sources.
- Never send an email. Create reviewable drafts only.
- Respect prior outreach, existing drafts, opt-outs, suppression signals, out-of-office dates, meetings, replies through other channels, and existing CRM state.
- Stop safely for any candidate whose company, recipient, thread, strategic point, or eligibility cannot be established with sufficient confidence.
