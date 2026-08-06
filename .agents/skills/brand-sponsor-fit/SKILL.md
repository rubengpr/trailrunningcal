---
name: brand-sponsor-fit
description: Assess a sports, endurance, outdoor, or adjacent brand as a realistic sponsorship, advertising, or affiliate lead for Trail Running Cal. Use when asked to qualify a brand, produce a commercial fit score, research company data, recommend campaign formats, or create/update that company in the Trail Running Cal Notion Leads database.
---

# Brand Sponsor Fit

Assess whether a company is commercially worth pursuing as a Trail Running Cal partner. Be concise, evidence-led, and realistic about a small niche publisher's reach and sales motion.

## Workflow

1. Identify the precise company, country/market, official website, and corporate LinkedIn profile. Ask only if the company is ambiguous.
2. Research from primary and reliable public sources. Prioritize employee count, revenue, annual growth, geographic footprint, category, and current marketing/distribution signals. Prefer corporate LinkedIn for employees and growth signals. Mark estimates and uncertainty; do not invent values.
3. Evaluate practical partnership potential, weighting audience relevance and activation feasibility above company scale. Read the installed `product-context` skill and use its current audience, geographic, and growth context as the canonical source; do not reuse figures from memory or older analyses. Trail Running Cal has a highly intentional trail/endurance audience and is focused on Catalonia and Spain.
4. Score the lead commercially. Smaller, vertical, local, digital-first, and performance-relevant brands can outrank global corporations if an approachable activation is more likely.
5. Recommend only formats that fit the brand and likely budget: display, sponsored race pages or categories, newsletter, native content, seasonal campaign, highlighted brand area, or affiliate partnership.
6. If Notion tools are available, find the **Leads** database and search for an existing company record first. Update it rather than duplicating it. If the connector is unavailable or a value cannot be verified, state that briefly and leave the field blank.

## FitScore rubric

Use judgement rather than mechanical arithmetic. Anchor the overall score to real likelihood of a worthwhile, executable partnership.

- **80–100:** strong audience and product overlap; likely budget and practical path to activation.
- **65–79:** credible lead, but one material constraint such as geography, budget, or marketing maturity.
- **40–64:** indirect fit or difficult sales motion; pursue only with a specific angle.
- **0–39:** little trail relevance or unrealistic collaboration potential.

Default priority: `Alta` at 80+, `Media` at 65–79, `Baja` below 65.

## Output

Write in Spanish unless the user requests otherwise. Use exactly this compact structure; omit unsupported data rather than padding it.

```markdown
# Análisis de Marca — [EMPRESA]

## Resumen de la Marca / Empresa

* [2–3 bullets: offer, target athlete/positioning, price level, style, key company data when reliable.]

## FitScore

### FitScore Global

[X]/100

### Evaluación Detallada

| Categoría | Nivel | Notas |
| --- | --- | --- |
| Encaje con trail running | [Bajo/Medio/Alto] | |
| Encaje de audiencia | [Bajo/Medio/Alto] | |
| Encaje geográfico | [Bajo/Medio/Alto] | |
| Encaje con marketing digital | [Bajo/Medio/Alto] | |
| Probabilidad de colaboración | [Bajo/Medio/Alto] | |
| Nivel de presupuesto esperado | [Bajo/Medio/Alto] | |

## Relación con el Trail Running

[Direct relevance, audience overlap, likely acquisition/conversion/branding goal, SEO value, and best-fitting formats.]

## Conclusión

[Good fit / fit medio / bajo fit, with a grounded 2–4 sentence commercial recommendation.]
```

Intermediate levels such as `medio-alto` are allowed. Do not add an opening summary table, an opportunities-and-risks table, or a long generic marketing report unless requested.

## Notion record

Populate or update, only when supported by evidence: `Empresa`, `Sitio web`, `FitScore`, `Industria`, `Prioridad`, `HQ`, `LinkedIn corporativo`, `Facturación`, `Empleados`, `Crecimiento anual`, `Países`, `Contacto(s) y cargo(s)`, `LinkedIn contacto`, and `Fecha actualización` (analysis date).

For `HQ`, store the best evidence-backed headquarters location available as text. Prefer `City, region/state, country`, but keep partial or less structured location data rather than leaving it blank. Do not include a street address or coordinates.

Do not write to `Notas`; it is reserved for human annotations.

For `Contacto(s) y cargo(s)`, list each verified contact with their current role, one per line. In `LinkedIn contacto`, use one Markdown hyperlink per line in the format `[Nombre y apellido](https://www.linkedin.com/in/...)`, in the same order.

Map industry as follows: sports nutrition → `Nutrición`; technical apparel → `Textil`; shoes, GPS, poles, packs, lights, and accessories → `Material deportivo`; online/multibrand retailer → `Tienda`; sports insurance → `Seguros`.
