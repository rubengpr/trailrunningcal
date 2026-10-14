# Web Search Benchmark v1 — registro de decisión

**Fecha:** 14 de octubre de 2026 · **Decisión:** la investigación de eventos del blog usa la **búsqueda web nativa de OpenAI** (`web_search`, `search_context_size: 'high'`) con `gpt-6.1-sol`.

## Pregunta

El agente investigador redacta, para cada evento, un dossier con datos contrastados que después usa el redactor del artículo. Queríamos saber qué combinación de **proveedor de búsqueda web + LLM** produce dossiers con información de más calidad vista por un humano. El LLM se fijó (`gpt-6.1-sol`, razonamiento `medium`), de modo que solo variaba la búsqueda.

## Diseño

- **Proveedores evaluados:** OpenAI (búsqueda nativa), Exa, Tavily, Linkup, Spider Cloud y Context.dev. Spider Cloud se sustituyó por Context.dev tras quedarse sin crédito en la primera prueba. Tavily y Context.dev se descartaron antes del experimento completo por coste: Tavily costaba ~0,33 $ y Context.dev ~0,52 $ por investigación, sin más calidad.
- **Mismo agente para todos:** el mismo prompt (`lib/blog/prompts/event-investigation.ts`), el mismo esquema de dossier y la misma validación que producción (`lib/blog/research/result.ts`). Los proveedores externos se integraron como herramientas `search` y `read_page`; el modelo solo podía leer URLs devueltas por una búsqueda. Ocho resultados por búsqueda y 12.000 caracteres por página.
- **Ground truth:** seis eventos conocidos con dossiers editoriales revisados, palmarés y, desde la versión 2, distancias y desniveles oficiales por carrera ([`ground-truth/`](ground-truth/README.md)).
- **Juez ciego:** `gpt-6.1-sol` con razonamiento `medium`. Recibe solo el dossier y el ground truth: ni el proveedor, ni las páginas consultadas, ni los costes. El juez etiqueta y el código calcula la nota (rúbrica v3):
  - **Datos básicos** (nombre, época, municipios, provincias, zona): uno erróneo descarta el dossier como no publicable; cada uno ausente resta 5 puntos.
  - **Calidad** sobre 100: carreras y distancias 35, recorrido 30, historia y singularidad 25, élite 10. Cada criterio puntúa por el número de datos distintos que respalda el ground truth, hasta un objetivo de **suficiencia** (8/8/6/3). Lo que el ground truth no recoge ni suma ni resta.
  - **Errores:** solo cuentan si el juez cita literalmente el dossier y el pasaje del ground truth que lo contradice, y el código comprueba ambas citas. Cada error anula un dato; en élite anula el criterio.

### Cómo evolucionó la rúbrica y por qué

| Versión | Qué medía | Por qué se cambió |
|---|---|---|
| v1 | Exactitud 60, cobertura 25, relevancia 15, con el juez viendo todas las páginas consultadas | Encarecía el juez (~0,15 $ por dossier con Exa) y era injusto: OpenAI no expone sus páginas. Se pasó a juzgar solo el dossier contra el ground truth. |
| v2 | Datos básicos como filtro y criterios con niveles ausente/parcial/completo | Se saturaba: casi todo salía «completo» y daba 100, incluso en eventos menos conocidos. |
| v3 | Recuento de datos comprobados con objetivos de suficiencia | Las notas se separaron (67–84) hasta que el ground truth v2 añadió distancias y desniveles; con eso todos se acercan otra vez al tope. |

**Los objetivos no se subieron a propósito.** La pregunta no es qué proveedor trae más volumen, sino si el dossier aporta datos correctos y **suficientes** para que el redactor pueda elegir. Llegar al objetivo es lo deseado; con la nota cerca del máximo, la decisión recae en los errores, la suficiencia y el coste.

## Resultados

### Pruebas pequeñas

1 evento × 1 repetición por proveedor y prueba, sobre Ultra Pirineu, Marató dels Dements y Ultra Sierra Nevada.

- **Rúbrica v2:** los cinco proveedores sacaron 100 en 14 de 15 dossiers.
- **Rúbrica v3, ground truth v1:** medias de 73,6 (OpenAI) a 79,5 (Tavily). El criterio de carreras quedaba limitado porque la referencia no tenía distancias.
- **Rúbrica v3, ground truth v2:** medias de 92,7 a 96,7. El orden de los proveedores cambiaba de una ronda a otra, señal de que las diferencias eran ruido.

### Experimento completo

OpenAI, Exa y Linkup × 6 eventos × 3 repeticiones = 54 investigaciones. Detalle por dossier en [`results-v1.json`](results-v1.json).

| | OpenAI | Exa | Linkup |
|---|---|---|---|
| Dossiers válidos | 16/18 | 17/18 | 18/18 |
| Publicables (sin errores en datos básicos) | 16/16 | 17/17 | 18/18 |
| Calidad media (juicio original, ground truth v2) | 91,7 | 92,5 | 92,3 |
| Errores comprobados (juicio original) | 5 | 1 | 7 |
| Calidad media (nuevo juicio, ground truth v2.1) | **93,0** | **91,9** | **92,5** |
| **Errores comprobados (nuevo juicio)** | **1** | **0** | **2** |
| Coste medio de investigación | ≥0,16 $* | 0,19 $ | 0,15 $ |
| Coste medio del juez | 0,04 $ | 0,04 $ | 0,04 $ |

\*OpenAI no desglosa los tokens del contenido que lee su búsqueda nativa, así que su coste es un mínimo conocido.

Los tres dossiers no válidos fallaron por formato (una fuente duplicada, una URL en el texto y una fuente sin citar). Es un fallo del modelo investigador, no del proveedor: la validación compartida con producción los rechaza igual.

### Análisis de errores

Revisamos uno a uno los 13 errores del juicio original y los trazamos hasta las páginas que había recibido el modelo:

- **10 eran huecos del ground truth.** Las fuentes oficiales del organizador decían otra cosa o algo más:
  - la victoria compartida de Heras y Priadka en Sierra Nevada 2019;
  - cifras alternativas de la Maratón y la Media de Sierra Nevada y de la 2K de Valle de Tena;
  - los relevos de Sierra Nevada;
  - las distancias de la Traveseruca.

  Se corrigió el ground truth (v2.1) y se volvió a pasar solo el juez sobre los 51 dossiers válidos.
- **2 son errores del modelo con Linkup.** En dos repeticiones sitúa en 2024 la suspensión de las carreras largas de Valle de Tena, que fue en 2023. La página recuperada decía «tras la cancelación del pasado año» en una noticia de 2024; es una mala lectura del modelo, no un dato falso del proveedor.
- **1 es un error de OpenAI sin origen rastreable:** atribuye a Manuel Merillas la Travesera de 2016, que ganó Antonio Blanco. No se puede saber si vino de una fuente o de una alucinación, porque OpenAI no expone el contenido de las páginas.

**Conclusión del análisis:** ningún proveedor aportó datos falsos. Casi todas las discrepancias venían de fuentes oficiales contradictorias o de lagunas de nuestra referencia.

## Decisión y razones

Elegimos la **búsqueda nativa de OpenAI**:

1. **Calidad y precisión equivalentes** a Exa y Linkup en este caso de uso: 1 error en 16 dossiers y ningún dato básico erróneo.
2. **Ya estaba en producción:** cambiar suponía un cliente, una clave y una factura más, y más puntos de fallo.
3. **Coste similar o menor** y una sola llamada por investigación.

**Lo que aceptamos:** menos trazabilidad. Con OpenAI vemos las consultas y las URLs, pero no el texto que leyó el modelo. Una cita puede venir de un enlace dentro de una página abierta, y un error puede no tener origen rastreable. Para mitigarlo, la validación retira las fuentes que no salieron de ninguna búsqueda (`unverified_source` solo falla si no queda ninguna). Exa habría sido la opción más limpia (0 errores y texto auditable), pero la diferencia no compensaba el cambio para el MVP.

**Ajuste aplicado en producción:** `search_context_size: 'high'`, la configuración medida (`lib/integrations/openai/event-investigation.ts`).

## Limitaciones

- Seis eventos conocidos y bien documentados. **No se midieron carreras pequeñas o locales**, donde la calidad de la búsqueda puede marcar más diferencias.
- Tres repeticiones por evento: suficiente para descartar diferencias grandes, no para ordenar proveedores con diferencias de pocos puntos.
- El ground truth se elaboró con búsquedas propias y tiene huecos, como demostró el análisis de errores.

## Cuándo revisar esta decisión

- Si en producción aparecen errores factuales que haya que auditar contra la fuente exacta: **Exa** es la alternativa medida.
- Si el calendario se centra en carreras pequeñas con poca presencia web.
- Si cambian el modelo, la herramienta de búsqueda de OpenAI o los precios de forma significativa.

## Cómo reproducirlo

- **Código:** el benchmark completo (runner, adaptadores de OpenAI, Exa, Tavily, Linkup y Context.dev, juez y puntuación) se eliminó del repositorio tras esta decisión. Su último estado está en el commit `4eb6720`:

  ```sh
  git checkout 4eb6720 -- lib/web-search-benchmark scripts/web-search-benchmark types/web-search-benchmark.types.ts lib/integrations/exa lib/integrations/tavily lib/integrations/linkup lib/integrations/openai/benchmark-client.ts lib/integrations/context-dev/benchmark-client.ts
  ```

  El README de `scripts/web-search-benchmark/` en ese commit documenta los modos `check-env`, `plan`, `ping`, `smoke` y `benchmark`. También hay que restaurar la dependencia `zod`.
- **Braintrust:** proyecto *Web Search Benchmark* (organización `trailrunningcal`). El experimento completo está en `v1-openai`, `v1-exa` y `v1-linkup`, con el juicio original sobre el ground truth v2. Las pruebas pequeñas están en `smoke-smoke-NN-*`; el dataset es `trail-events-v1` y el juez y el scorer, `dossier-judge-v1` y `dossier-quality-v1`, con versiones fijadas en el `manifest.json` del commit citado.
- **Nuevo juicio con ground truth v2.1:** no está en Braintrust; sus resultados están en [`results-v1.json`](results-v1.json) (`rejudgeGroundTruthV21`).
