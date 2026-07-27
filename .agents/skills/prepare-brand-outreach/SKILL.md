---
name: prepare-brand-outreach
description: Research a company from its website, qualify it as a Trail Running Cal commercial lead, upsert the Notion Leads CRM, find and rank relevant marketing contacts, resolve one verified professional email through Prospeo with Hunter as fallback, and create a personalized Gmail draft. Use when the user provides a brand or company URL and asks to prepare, automate, or execute sponsorship, advertising, affiliate, or brand-presence cold outreach for Trail Running Cal.
---

# Prepare Brand Outreach

Prepare one reviewable outreach opportunity from one company URL. Complete the research, CRM, contact, and draft steps, but never send the email.

## Required context

- Read the installed `product-context` skill for current Trail Running Cal positioning.
- Apply the installed `brand-sponsor-fit` rubric for qualification and FitScore.
- Read [references/notion-crm.md](references/notion-crm.md) before using Notion.
- Read [references/email-template.md](references/email-template.md) before drafting.

## Workflow

### 1. Validate and deduplicate

1. Require one unambiguous company URL.
2. Normalize its registrable domain by removing protocol, `www`, paths, query parameters, fragments, and trailing slashes.
3. Search the Notion Leads database by normalized website domain and company name. Update an existing record rather than creating a duplicate.
4. Search Gmail by company domain, company name, and any known contact email. Report an existing outreach thread or draft and stop before creating another draft unless the user explicitly requests a replacement.

### 2. Research and qualify

1. Identify the precise company, official domain, market, corporate LinkedIn, products, target customers, geographic footprint, and evidence of activity in Spain or Iberia.
2. Identify one current business priority the company is visibly investing in and that Trail Running Cal can credibly support through repeated visibility among trail runners in Catalonia or Spain. Look for expansion into Spain, a relevant product launch, distribution growth, a category push, or an active event or community strategy.
3. Find a recent, concrete signal proving that priority is active. Prefer the initiative with the clearest connection to awareness, consideration, adoption, or market entry over a merely recent company announcement.
4. Prefer official company sources and reliable public sources. Record the source URL and publication or access date for every dynamic claim used in the email.
5. Apply the `brand-sponsor-fit` rubric. Treat 65 as the minimum FitScore for automatically spending contact-provider credits and creating a draft.
6. If FitScore is below 65, update the supported CRM research fields, preserve the existing commercial state, and stop before paid contact lookup or Gmail drafting. Do not infer `Cerrado sin éxito`.

### 3. Upsert the CRM record

Follow [references/notion-crm.md](references/notion-crm.md) exactly.

- Populate only evidence-backed values.
- Preserve existing human-entered values unless newer evidence clearly supersedes them.
- Never write to `Notas`.
- For a newly created qualified lead, set `Estado` to `Pendiente`.
- For an existing lead, preserve `Estado`.

### 4. Find and rank contact doors

Find 3–5 current people where public evidence permits. Rank them in this order:

1. Brand or Marketing lead for Spain/Iberia.
2. Partnerships, Sponsorships, Sports Marketing, or Community lead.
3. Growth or E-commerce lead for Spain/Iberia.
4. Distributor or agency contact responsible for the Spanish market.
5. Founder or general manager when the company is small.

For each candidate, retain name, current title, geography, source URL, and a short selection rationale. Prefer responsibility for the relevant market over global seniority. Do not treat an unverified search-result snippet as proof of a current role when a better source is available.

Select exactly one first contact. Do not select generic addresses when a qualified named contact with a verified professional email is available.

### 5. Resolve one email economically

1. Check remaining Prospeo quota with its free account-information tool.
2. Use Prospeo first to enrich only the selected person. Request professional email only; never request a mobile number.
3. Accept only an email Prospeo marks verified.
4. If Prospeo returns no verified email, check Hunter quota with its free usage tool and use Hunter Email Finder for that same person and domain.
5. Accept only a deliverable/valid result with adequate confidence. Treat `accept_all`, unknown, or low-confidence results as requiring human review.
6. Infer a company email pattern only when supported by public examples. Never create a Gmail draft to an inferred address unless a provider verifies it as valid.

Default credit ceiling: at most one person lookup per provider per company. Do not broaden the search or spend further credits without explicit user approval.

### 6. Compose the email

Use the approved structure in [references/email-template.md](references/email-template.md).

- Write in Spanish by default; adapt only when the contact's working language is clearly different.
- Follow this progression: important company objective → Trail Running Cal as an easy way to strengthen recognition and presence in the Spanish trail community → relevant scale and growth metrics → social proof → CTA.
- Open by explaining naturally how Ruben found the company and name the active initiatives that demonstrate the objective. Do not substitute generic praise or unrelated recent news.
- Preserve the template's approved figures: approximately 12,000 monthly runners in Catalonia, a forecast of 60–100k across Spain by year-end, and two existing Spanish brand relationships.
- Keep the availability framing tentative. Ask whether it would make sense to consider the company when new spaces or commercial actions open, then offer a Media Kit or call.
- Do not name existing partner brands.
- Keep the message concise, clear, conversational, and founder-led.

### 7. Create the Gmail draft

1. Repeat the Gmail duplicate check after resolving the final recipient.
2. Create one draft addressed only to the selected contact.
3. Never send, schedule, or enroll the contact in a sequence.
4. Return the draft identifier or link when the connector provides one.

### 8. Finalize Notion

After the draft succeeds:

- Store the selected contact and verified email.
- Store all verified alternative contacts in the existing multiline contact fields.
- Update `Fecha actualización`.
- Keep `Estado = Pendiente`.
- Leave `Fecha primer contacto` empty.
- Do not set `Método contacto = Email` until the email is actually sent.

If draft creation fails, keep the research and contacts but report the blocker. Do not mark the company as contacted.

## Output

Return a compact execution summary:

- company and FitScore;
- Notion record created or updated;
- ranked contacts and selected first contact;
- email source and verification status;
- Gmail draft created or reason it was blocked;
- credits consumed by provider;
- source links supporting the personalization.

## Safety and scope

- Process one company and one first contact per execution.
- Use only public professional information relevant to B2B outreach.
- Never fabricate company facts, roles, email addresses, metrics, or sources.
- Never send outreach or follow-ups.
- Respect prior outreach, opt-outs, suppression signals, and existing CRM state.
- Stop safely when the company, contact, email, or personalization cannot be established with sufficient confidence.
