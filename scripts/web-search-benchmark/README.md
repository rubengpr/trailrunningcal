# Web Search Benchmark v1

Proyecto: [Web Search Benchmark](https://www.braintrust.dev/app/trailrunningcal/p/Web%20Search%20Benchmark).
Implementación preparada; **no se han ejecutado las pruebas reales ni el benchmark**.

## Diseño congelado

Seis eventos × cinco proveedores × tres repeticiones = **90 investigaciones**. Cada investigación utiliza Responses API, `gpt-6.1-sol`, razonamiento `medium`, las mismas instrucciones y el mismo esquema. El juez utiliza `gpt-6.1-sol/medium` y la rúbrica v2: etiqueta y el código calcula. **Datos básicos** (nombre, época, municipios, provincias, zona): un dato erróneo descarta el dossier como no publicable; cada dato ausente resta 5. **Calidad** de los publicables sobre 100: carreras y distancias 35, recorrido 30, historia y singularidad 25, élite 10, en niveles ausente/parcial/completo; un error demostrado baja un nivel su criterio y anula el de élite. Toda etiqueta de error exige cita literal del dossier y del ground truth, comprobada por código; sin ella, no cuenta. Por proveedor se informa tasa de publicables, calidad media de los publicables y calidad esperada (tasa × media). El juez recibe solo el dossier y el ground truth: ni las páginas consultadas, ni el nombre del proveedor, herramientas o costes. El investigador recibe exclusivamente nombre del evento y comunidad autónoma.

`manifest.json` fija IDs y versiones de Braintrust; `dataset.jsonl` conserva la copia y hashes del ground truth. El runner comprueba los hashes antes de acceder a servicios y compara los datos remotos con la copia congelada. El juez utiliza la versión fijada en `judgeVersionPinnedInScorer`, compartida con el scorer publicado. No se usan las versiones “latest”.

| Proveedor | Búsqueda | Lectura |
|---|---|---|
| OpenAI | `web_search`, contexto alto, acceso web activo | Apertura/búsqueda dentro de páginas gestionadas por la herramienta nativa |
| Exa | Search `auto`, 8 resultados con texto, `maxAgeHours: 0` | Contents con texto |
| Tavily | Search `advanced`, 8 resultados, sin respuesta sintetizada | Extract `basic`, Markdown |
| Linkup | Search `standard`, `searchResults`, hasta 8 resultados | Fetch estándar sin renderizado JS |
| Context.dev | Search con Markdown de cada resultado, país `es` (mínimo de la API: 10 resultados; el modelo recibe los 8 primeros) | Scrape Markdown, sin caché (`maxAgeMs: 0`) |

Los adaptadores externos entregan hasta 12.000 caracteres por página y conservan las respuestas completas para auditoría. OpenAI nativo no permite igualar exactamente este presupuesto ni expone todo el contenido interno consultado. Linkup estándar incorpora procesamiento propio: comparamos estos **productos configurados**, no índices de búsqueda puros con comportamiento idéntico. Estas diferencias deben acompañar cualquier conclusión.

El agente externo recibe `search` y `read_page`, decide sus consultas y puede seguir investigando. Solo puede leer URLs públicas que ya haya recuperado; no se aceptan URLs inventadas, privadas ni credenciales dentro de ellas. Se comprueban las referencias del dossier contra las URLs recuperadas, lo que acredita trazabilidad, no veracidad.

## Ejecución

El runner es `run.ts`, no `prepare.eval.ts`. Las variables necesarias son `OPENAI_API_KEY`, `BRAINTRUST_API_KEY`, `EXA_API_KEY`, `TAVILY_API_KEY`, `LINKUP_API_KEY` y **`CONTEXT_DEV_API_KEY`**. No se imprime su contenido.

Estos comandos son locales, sin peticiones de red:

```sh
node --env-file=.env.local --import tsx scripts/web-search-benchmark/run.ts --mode check-env
node --env-file=.env.local --import tsx scripts/web-search-benchmark/run.ts --mode plan
```

Los siguientes comandos **hacen llamadas reales y consumen API**. Esperar autorización antes de ejecutarlos:

```sh
# Comprobación de conexiones (~0,05 $): una llamada mínima a OpenAI, una búsqueda por proveedor externo y carga de prompts y dataset fijados.
node --env-file=.env.local --import tsx scripts/web-search-benchmark/run.ts --mode ping --execute

# Prueba pequeña: un evento, cinco proveedores, una repetición; contenedores separados.
node --env-file=.env.local --import tsx scripts/web-search-benchmark/run.ts --mode smoke --run-id smoke-01 --event salomon-ultra-pirineu --execute

# Benchmark completo: las 90 investigaciones en los cinco experimentos v1 existentes.
node --env-file=.env.local --import tsx scripts/web-search-benchmark/run.ts --mode benchmark --run-id v1 --execute

# Continuar la misma ejecución sin repetir solicitudes ya terminadas.
node --env-file=.env.local --import tsx scripts/web-search-benchmark/run.ts --mode benchmark --run-id v1 --resume --execute
```

`--providers exa,tavily` permite una prueba pequeña con proveedores concretos. No cambiar proveedores, eventos, modelos ni configuración al reanudar. Los contenedores principales no admiten mezclar otra configuración. No lanzar la preparación ni un descubrimiento global de `bt eval` para ejecutar este benchmark.

## Registro y recuperación

La semilla fija mezcla las tareas; se procesan dos investigaciones a la vez. Cada petición tiene timeout de diez minutos y cero reintentos automáticos. No se añaden límites de número de búsquedas ni un presupuesto de coste. Una investigación fallida se conserva, no se sustituye por otra exitosa.

Se guardan checkpoints atómicos en `scripts/.cache/web-search-benchmark/{modo}-{run-id}/` (excluido de Git): configuración, planificación, un JSON por investigación y resumen. Cada JSON conserva peticiones, respuestas originales, respuestas normalizadas, dossier, informe, errores y uso. Se eliminan los valores de secretos antes de persistir o enviar trazas.

En Braintrust se registra una raíz por investigación, spans LLM y búsqueda/lectura, y el informe con puntuaciones. Payloads grandes usan `JSONAttachment`. Identificadores estables permiten volver a sincronizar los checkpoints sin duplicar las filas. Tras `flush`, el runner comprueba que las raíces procesadas existen en Braintrust. Los metadatos iniciales de los contenedores vacíos describen la preparación anterior; **la configuración efectiva queda en cada raíz y en `run.json`**.

Si se interrumpe después de guardar el dossier y antes de empezar el juez, la reanudación ejecuta solo el juez. Si la interrupción ocurre durante una petición, su resultado puede ser desconocido: se marca `interrupted` y no se repite automáticamente. Los fallos del juez conservan el dossier. Un bloqueo de proceso abandonado exige comprobar que el runner ya no está activo antes de borrar su `runner.lock`.

## Costes y lectura de resultados

`config.ts` fija tarifas y enlaces oficiales con fecha. Las llamadas LLM registran tokens de entrada, entrada cacheada y salida; la tarifa depende de la ventana de contexto. Exa utiliza importes reportados cuando están disponibles; Tavily y Context.dev utilizan créditos (Context.dev, los reportados por la API al precio del plan Developer); Linkup y otros fallbacks utilizan tarifas públicas PAYG. Los costes del investigador y del juez se mantienen separados.

Si una petición falla sin uso disponible, el coste es desconocido. OpenAI nativo contabiliza las búsquedas y tokens expuestos, pero no permite comprobar por separado toda la facturación del contenido consultado. En estos casos `totalUsd` es `null`: `knownSubtotalUsd` es **un subtotal conocido, no un coste completo**. No comparar un subtotal incompleto con un total como si fueran equivalentes. Las cifras estimadas no son una factura y no incluyen descuentos del plan.

El resumen incluye media, desviación, fallos y costes por proveedor; los checkpoints conservan evento y repetición para comparar resultados emparejados y revisar hallazgos graves. No sustituir evaluaciones fallidas por un cero ni ocultar investigaciones fallidas. La elección se basará en calidad y coste; la latencia no es criterio. Una prueba pequeña valida compatibilidad, no determina al ganador.

## Verificación sin llamadas reales

```sh
pnpm exec vitest run lib/web-search-benchmark
pnpm tsc --noEmit
pnpm tsc --noEmit -p scripts/web-search-benchmark/tsconfig.json
pnpm exec eslint lib/web-search-benchmark lib/integrations/exa/client.ts lib/integrations/tavily/client.ts lib/integrations/linkup/client.ts lib/integrations/context-dev/benchmark-client.ts lib/integrations/openai/benchmark-client.ts types/web-search-benchmark.types.ts scripts/web-search-benchmark
git diff --check
```

Las pruebas usan fixtures y mocks. Cubren herramientas, fuentes, rechazo/salida incompleta, payload ciego, scoring, costes, checkpoints, credenciales ocultas y la protección del CLI. La disponibilidad real de los cinco servicios y del modelo se comprobará con el smoke autorizado.
