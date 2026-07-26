# Notion Leads CRM

Use the existing database:

- Database: `https://app.notion.com/p/36baae723de280aba33ad20e10dc0584`
- Data source: `collection://36baae72-3de2-800b-9352-000b4a3d9742`

Fetch the database before writing in case its schema has changed.

## Field mapping

| Property | Type | Rule |
| --- | --- | --- |
| `Empresa` | title | Official company or brand name |
| `Sitio web` | URL | Canonical website without a trailing slash |
| `FitScore` | number | 0–100 using `brand-sponsor-fit` |
| `Industria` | select | Use an existing option only |
| `Prioridad` | select | `Alta` at 80+, `Media` at 65–79, `Baja` below 65 |
| `HQ` | place | Municipality and province/state only; no street address |
| `LinkedIn` | URL | Corporate LinkedIn |
| `Facturación anual` | select | Evidence-backed bracket only |
| `Empleados` | select | Evidence-backed bracket only |
| `Crecimiento anual` | select | Evidence-backed bracket or `Desconocido` |
| `Países con venta` | text | Verified markets |
| `Contactos y cargo` | text | One verified current contact and role per line |
| `LinkedIn contacto` | text | One profile link per line, same order as contacts |
| `Email contacto` | text | Verified email of the selected first contact |
| `Fecha actualización` | date | Date of the current research |
| `Estado` | select | Commercial pipeline only |
| `Fecha primer contacto` | date | Set only after a message is sent |
| `Método contacto` | multi-select | Set only after actual contact |
| `Notas` | text | Reserved for humans; never write |

Populate advertising-count fields only when the exact current values are directly supported.

## Commercial state

- `Pendiente`: qualified or prepared but not contacted.
- `Contactado`: a message was actually sent.
- `Conversación`: the company replied and dialogue exists.
- `Acuerdo`: commercial agreement reached.
- `Cerrado sin éxito`: commercial opportunity closed without agreement.

Internal steps such as researching, finding contacts, or creating a draft are not CRM states. Creating a Gmail draft must not change `Pendiente` to `Contactado`.

For new qualified records, use `Pendiente`. Preserve the state of existing records. For a new lead below the drafting threshold, leave `Estado` unset unless the user explicitly chooses to pursue it.

## Idempotency

Match existing records primarily by normalized website domain, then by exact company name. Never create a second record merely because the submitted URL contains a locale path or different protocol.
