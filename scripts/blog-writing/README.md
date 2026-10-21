# Redactor de eventos investigados

El redactor recibe comunidad, nombres y dossiers, sin copia del catálogo ni orden editorial impuesto. No repetir investigaciones ni ejecutar una generación de pago sin autorización.

## Persistencia y contrato

`blog_research_runs.region_id` identifica la comunidad. `blog_research_results` conserva el ID y nombre de cada evento, su dossier (`context`, `sources`, `observations`), fuentes consultadas, estado y diagnóstico. No se guardan `input`, `position` ni `dossier.eventName`. El historial antiguo sigue disponible.

El servicio de preparación `fromResearch()` carga una investigación completada con cinco resultados válidos y consulta únicamente `id,slug` del catálogo para construir enlaces. Si falta un evento, su slug o un dossier, falla antes de llamar al modelo. Los nombres proceden de los resultados guardados, aunque el catálogo cambie.

El contrato transitorio `WritingRequest` es:

```ts
{
  regionId,
  events: [{ eventId, eventName, slug, dossier, consultedSources }]
}
```

El nombre español de la comunidad se resuelve con la configuración geográfica. El modelo recibe solo:

```text
instructions: contexto editorial, público, rigor, estructura flexible y SEO.
input:        regionName + events[{ eventName, dossier }].
text.format:  esquema estricto de artículo, metadatos y referencias de auditoría.
```

Los UUID, slugs y fuentes consultadas de diagnóstico no llegan al modelo. El nombre aparece una sola vez por evento; el dossier no lo duplica. Las referencias de cada dossier siguen siendo locales a su lista de fuentes. La normalización de citas Web Search y la trazabilidad se validan antes de inferir.

Una llamada lógica a Responses API: `gpt-6.1-sol`, razonamiento `medium`, máximo de 8.000 tokens, timeout de 120 segundos y dos reintentos del SDK. Sin herramientas, reparación ni evaluación automática adicional.

El artículo conserva introducción, criterio editorial, cinco eventos y cierre. El modelo elige el orden y la presentación; el backend comprueba el conjunto exacto de cinco eventos sin imponer el orden de entrada. Añade sus cinco enlaces de ficha y el calendario autonómico, sanitiza el HTML y conserva el Markdown. Las referencias de auditoría permanecen fuera del artículo público.

## Preparación y generación

Desde la investigación persistida, exclusivamente en `trailrunningcal-local`:

```sh
# Recupera contexto y guarda archivos; no llama a OpenAI.
node --env-file=.env.local --import tsx scripts/blog-writing/run.ts --research-id UUID

# Solo después de autorizar una generación de pago.
node --env-file=.env.local --import tsx scripts/blog-writing/run.ts --research-id UUID --execute
```

También se acepta `--input request.json` con el nuevo contrato para preparación offline sin credenciales; `--input` y `--research-id` son excluyentes. Los snapshots del contrato anterior se conservan como archivos históricos: para un intento nuevo, prepararlo otra vez desde la investigación con `--research-id`.

Cada intento crea una carpeta nueva bajo `scripts/.cache/blog-writing/`, excluida de Git. `--output` permite escoger una carpeta nueva. Se guardan request, input, instrucciones, esquema, hashes, estado, respuesta original, artículo Markdown/HTML, referencias, informe `quality.json` y consumo disponible. No se sobreescriben intentos ni se reenvían automáticamente llamadas interrumpidas.

El script no crea artículos en Supabase ni publica. La conexión del redactor con el botón de generación, el guardado de artículos y el evaluador siguen fuera de esta fase. Los artículos y el flujo anterior conservan su `generationContext` propio.

## Reglas editoriales y validación

El prompt exige información específica respaldada por dossier, intención de descubrimiento y comparación,
coherencia entre keyword y metadatos, y una presentación flexible sin repetir la misma plantilla.
Los títulos de evento conservan sus nombres y el backend sigue controlando los enlaces.

El backend valida el Markdown original antes de añadir enlaces. Rechaza encabezados vacíos, eventos sin
contenido visible, falta de un párrafo introductorio antes del primer H2 o falta de un cierre bajo un H2
propio después del último evento. Se mantienen la validación de cinco eventos distintos y las referencias.
El criterio editorial puede formar parte de la introducción; no se impone un encabezado concreto.

`WritingResult.quality` contiene métricas y observaciones tipadas, sin score. Se guarda también como
`quality.json`, separado del esquema que responde el modelo. Las métricas cuentan el cuerpo visible
(incluidos sus encabezados) sin metadatos ni enlaces de navegación añadidos por el backend. Las longitudes
de caracteres cuentan puntos de código Unicode; las palabras se cuentan por secuencias de letras o cifras.

Las observaciones no bloquean ni generan una nueva llamada:

- Longitudes fuera de objetivos: título 40–90 caracteres, cuerpo 700–1.100 palabras, keyword 2–6 palabras,
  slug 3–8 palabras y menos de 75 caracteres, título SEO 45–60 caracteres y metadescripción 140–160.
- Keyword literal ausente en título, introducción, título SEO, slug o metadescripción; se ignoran tildes,
  mayúsculas y separadores y se comparan palabras completas. Una variante válida puede producir aviso.
- Párrafos normalizados idénticos de 20 o más palabras compartidos entre eventos, con los IDs afectados.

Estas comprobaciones no verifican veracidad, originalidad semántica ni posicionamiento SEO.
Si falla la estructura, se conserva la respuesta original y el estado de fallo, sin llamadas de reparación.

## Verificación sin consumo

```sh
pnpm exec vitest run lib/blog/writing lib/blog/research lib/services/blog-writing-context.test.ts lib/integrations/openai/article-writing.test.ts
pnpm tsc --noEmit
pnpm tsc --noEmit -p scripts/blog-writing/tsconfig.json
git diff --check
```
