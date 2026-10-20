# Recomendaciones de productos por carrera

Implementación del piloto aprobada el 20 de octubre de 2026. El código está preparado; el experimento permanece en borrador y la flag desactivada.

- [Experimento PostHog 102764](https://eu.posthog.com/project/103358/experiments/102764)
- [Dashboard: Productos por carrera · CTR](https://eu.posthog.com/project/103358/dashboard/1040369)
- Flag: `race-product-recommendations` (322225).

## Catálogo y reglas

Cada carrera con distancia válida puede mostrar una zapatilla, una recomendación de nutrición y una de bastones. La selección utiliza su distancia y desnivel positivo, no los del evento completo. Son criterios editoriales, no una prescripción nutricional.

| Distancia | Variante `naak` | Variante `baouw` |
| --- | --- | --- |
| <15 km | Sin nutrición | Sin nutrición |
| 15–<50 km | Näak BOOST Gel 30 Neutral | Baouw Gel frambuesa y granada |
| ≥50 km | Näak ULTRA Drink Mix 250 Watermelon | Baouw Puré salado de boniato (zanahoria y pimienta Timut) |

LEKI Ultratrail FX.One se añade si la carrera tiene ≥20 km y ≥1.500 m D+ o ≥60 m D+/km. También se incluye en verticales de ≤8 km con ≥500 m D+ y ≥100 m D+/km. Sin desnivel conocido, no se recomiendan bastones. Distancias inválidas no producen recomendaciones. No hay excepciones de demostración por evento. Las categorías públicas de carreras no cambian.

Los nombres descriptivos y las explicaciones están traducidos a es, ca, en y fr. Se muestra el precio oficial en EUR por unidad de nutrición o por par de bastones, comprobado el 20 de octubre de 2026. Con la flag de precio desactivada, aparece en la fila en desktop y dentro del desplegable en móvil. El experimento independiente de precio descrito abajo controla su ubicación cuando está activo. Solo se muestra precio anterior tachado cuando hay un descuento verificado; la FUGA EX 3 muestra 144 € frente a 160 € para el color y variante enlazados, verificados el 20 de octubre. Revisar los importes antes de lanzar y cuando cambien en las tiendas. Kailas FUGA sustituye a Salomon como marca de calzado del piloto.

Las fotografías se sirven localmente como WebP. `public/assets/sponsors/products/sources.json` registra ficha oficial, URL original, archivo local, fecha de recopilación y precio comprobado. La fotografía de LEKI muestra el bastón plegado para que sea reconocible en miniatura. La primera imagen social de Baouw puré era un marcador vacío; se sustituyó por la imagen real de su galería.

Los destinos son las fichas oficiales. Todos llevan:

- `utm_source=trailrunningcal`
- `utm_medium=product_recommendation`
- `utm_campaign=race_products_v1`
- `utm_content=<product_id>`

La ficha internacional de LEKI sirve para consultar el producto; al recopilar los datos mostraba las longitudes como no disponibles para compra directa. Confirmar con LEKI el destino comercial con stock y envío a España antes de intentar medir ventas. El piloto mide interés con «Ver producto», no disponibilidad garantizada ni compras.


### Calzado Kailas FUGA · catálogo v2

| Banda existente | Distancia | Modelo | Precio oficial del par |
| --- | --- | --- | --- |
| Sprint / corta | >0–<20 km | FUGA EX 3 | 144 € (antes 160 €), color Sea Stone Green |
| Media | 20–<40 km | FUGA DU 2 | 190 € |
| Maratón | 40–<50 km | FUGA EX PRO | 250 € |
| Ultratrail | ≥50 km | FUGA EX 330 | 180 € |

Esta asociación es editorial, basada en las características oficiales: EX 3 polivalente con amortiguación ECCEVAI y Vibram Megagrip, DU 2 orientada a estabilidad en pendientes y terreno mixto, EX PRO con placa de carbono y espuma reactiva, EX 330 diseñada para ultradistancia. No son límites de uso del fabricante. Se conservan las bandas comerciales del piloto y las categorías públicas no cambian. Una vertical con distancia válida también recibe el modelo de su banda; no se infiere el tipo de terreno solo a partir de la distancia.

Fuentes oficiales: [EX 3](https://www.kailasfuga.com/products/2025-new-kailas-fuga-ex-3-trail-running-shoes-mens), [DU 2](https://www.kailasfuga.com/products/kailas-fuga-du-2-trail-running-shoes-mens), [EX PRO](https://www.kailasfuga.com/products/kailas-fuga-ex-pro-mountain-running-shoes-unisex), [EX 330](https://www.kailasfuga.com/products/2025-new-kailas-fuga-ex-330-trail-running-shoes-mens). Fotos, color, variante y precios verificados el 20 de octubre de 2026 y registrados en el manifiesto. Los enlaces fijan la variante fotografiada para que el precio coincida; el usuario elige su talla en la tienda. EX PRO es unisex; los otros destinos son fichas de hombre con acceso a la versión de mujer en la tienda, sin inferir el género del visitante. El descuento de EX 3 puede variar según color o campaña: revisarlo antes de lanzar.

Se añade una zapatilla a ambas ramas de nutrición; el control del piloto conserva la ausencia del bloque completo. No se recomiendan productos para distancias nulas, no finitas o no positivas. El calzado sí aparece por debajo de 15 km; el umbral de nutrición sigue siendo 15 km.

Los productos de calzado usan los mismos eventos, UTMs y experimento de precio. La categoría es `shoes`; el catálogo actual es `v3` tras incorporar ASICS. Las cuatro consultas existentes del dashboard filtran v3 sin alterar sus exclusiones. El `utm_campaign=race_products_v1` se conserva como identificador del piloto, independiente de la versión editorial del catálogo. Los tres experimentos siguen en borrador, sin despliegue ni activación.

## Presentación separada de la información de carrera

Las recomendaciones aparecen en una sección propia «Material recomendado», inmediatamente después de Distancias y antes del mapa de recorridos. La lista de distancias conserva solo datos de la carrera, precios de inscripción y acceso a mapas. La nueva sección agrupa los productos bajo el nombre y los kilómetros de cada carrera; respeta la selección individual por distancia y desnivel.

Las filas son más compactas: foto de 48 × 44 px, nombre de 13 px, logos pequeños, bordes suaves y precio de 12 px cuando corresponda a la variante. Los detalles siguen abriéndose en la fila y los enlaces mantienen las UTM. El título y la descripción de la sección están traducidos a los cuatro idiomas. En control o sin asignación no se muestra una sección vacía; control conserva solo el observador de llegada a la nueva ubicación.

La exposición se mide en esta nueva ubicación; no al consultar Distancias. Las impresiones se siguen confirmando por visibilidad del producto o interacción, de modo que pasar por las distancias no cuenta como haber visto publicidad. `recommendation_placement=after_distances` identifica esta presentación en todos los eventos. Como los experimentos siguen en borrador, no se han mezclado resultados de ubicaciones distintas.

## Asignación y presentación

El 100 % de visitantes elegibles se distribuye por el distinct ID del SDK: `control` 20 % sin recomendaciones, `naak` 40 % y `baouw` 40 %. Si la flag no devuelve una variante reconocida, no se muestra el bloque ni se registra exposición. La flag creada está inactiva.

La asignación utiliza la identidad actual de PostHog, como los experimentos existentes. Puede cambiar al identificar al visitante o cambiar de dispositivo. PostHog está configurado para analizar la primera variante vista (`first_seen`), conservando esos usuarios en vez de excluirlos de forma asimétrica. No cambiar porcentajes ni criterios durante el piloto.

Un hash independiente del distinct ID rota las categorías de producto entre posiciones y mantiene el orden estable para cada visitante y conjunto de productos. Las tres categorías pueden ocupar cualquiera de las tres posiciones; en bloques de dos se alterna cuál aparece primero. Se registra la posición real. Los detalles se abren en la propia fila; «Ver producto» abre la ficha oficial en otra pestaña. La navegación no depende del éxito de la analítica.

En desarrollo se muestra por defecto la vista previa Baouw en todas las fichas, respetando las reglas de distancia y desnivel y sin capturar eventos del piloto. Para seleccionar otra variante sin activar la flag:

```sh
NEXT_PUBLIC_PRODUCT_RECOMMENDATION_PREVIEW=baouw pnpm dev
```

Valores admitidos: `control`, `naak`, `baouw`. Reiniciar el servidor tras cambiar esta variable. El override solo funciona con `NODE_ENV=development` y no captura eventos del piloto. Producción lo ignora. El valor por defecto de desarrollo es `baouw`; producción siempre utiliza la flag real.

## Medición

| Evento | Momento |
| --- | --- |
| `race_products_exposed` | Al llegar al grupo de recomendaciones de una carrera, en la sección posterior a Distancias; también en control |
| `race_product_impression` | Al ver al menos el 50 % del producto durante un segundo continuo en una pestaña visible |
| `race_product_details_opened` | Al abrir los detalles; no cuenta como clic saliente |
| `race_product_clicked` | Al pulsar el enlace oficial, incluido el botón central del ratón |

Si el usuario interactúa antes del segundo, la interacción confirma que ha visto el producto: se registra la exposición y la impresión antes del detalle o del clic. `impression_trigger` distingue `visibility` e `interaction`. Esto evita clics sin denominador. Sin IntersectionObserver no se inventan impresiones por montaje; una interacción sigue confirmando exposición. Los timers se cancelan al ocultar la pestaña, salir de pantalla o desmontar el componente.

Propiedades comunes: evento, slug, carrera, distancia, desnivel, banda comercial, locale, variante, `catalog_version=v3`, `recommendation_placement=after_distances` y `$feature/race-product-recommendations`. Los eventos de producto añaden producto, marca, categoría, posición y URL de destino. Los identificadores de sesión y dispositivo los aporta el SDK.

Las capturas se deduplican por producto y montaje. El dashboard deduplica de nuevo por sesión y producto entre todas las carreras: **CTR = sesiones con clic saliente y una impresión del producto / sesiones con impresión del producto**. No sumar CTR ni usuarios únicos diarios. Los cortes por distancia y dispositivo son descriptivos y sus sesiones pueden solaparse; no sumarlos para reconstruir el total.

El dashboard contiene cuatro tablas: CTR y volumen por producto; CTR por distancia; CTR por dispositivo; tráfico y acciones principales por variante. Sus consultas se ejecutaron correctamente antes del despliegue; resultados vacíos son esperables porque estos eventos aún no se han publicado. Las consultas usan una ventana móvil de 30 días y exclusiones explícitas de los hosts y dispositivos internos del proyecto verificadas el 20 de octubre. Si cambian las exclusiones del proyecto, actualizar también estas consultas. Son definiciones del piloto; no hay métricas aprobadas en el catálogo de datos.

El experimento usa exposición personalizada `race_products_exposed`, filtrado de cuentas internas, una métrica principal de exposición a clic de producto y tres métricas secundarias: clic a la web oficial, guardar favorito y elegir calendario personal. Los funnels son por persona y tienen una ventana de un día; el CTR del dashboard es por sesión. No son la misma métrica. Las métricas nuevas se guardaron expresamente antes de su primera ingesta.

La tabla de acciones del dashboard toma la primera exposición de cada sesión y solo cuenta acciones posteriores. Por tanto, estas guardas evalúan la continuación tras llegar a las carreras; no incluyen acciones del encabezado que ocurrieron antes de la exposición. El control no tiene productos y su tasa de salida hacia productos será cero por diseño; ese contraste no demuestra superioridad comercial de una marca.

## Validación y lanzamiento

Antes de lanzar: desplegar el código y verificar los trece productos, imágenes y enlaces en móvil y escritorio; comprobar la primera captura real de exposición, impresión y clic con la variante correspondiente. Utilizar overrides locales para QA y no generar eventos sintéticos en producción. Solo después lanzar el borrador. No se ha desplegado ni activado desde esta tarea.

Revisar los primeros 30 días completos en Europe/Madrid tras la activación. Ajustar las fechas del análisis final al periodo exacto: las tablas móviles del dashboard incluyen el día actual. Presentar muestras y un intervalo de incertidumbre para el CTR; ampliar el periodo si hay pocos clics. Comparar marcas en condiciones equivalentes de distancia, dispositivo y posición, y analizar bastones y zapatillas por separado. No usar un CTR aislado como umbral universal de éxito.

Las UTM permiten reconocer tráfico en el destino. Para atribuir compras, ingresos o comisiones se necesitan enlaces de afiliación, una integración o informes de los proveedores; esta versión no afirma conversiones.


## Experimento independiente: precio en la fila y precio tachado

- [Experimento PostHog 102779](https://eu.posthog.com/project/103358/experiments/102779), en borrador. **Pendiente en PostHog:** añadir la variante `show-discount` a la flag y al experimento (el código ya la reconoce).
- Flag `race-product-price` (322283), desactivada; asignación por distinct ID, sin persistencia adicional, igual que el piloto de marcas.
- Tres variantes en una única flag, reparto propuesto 1/3 cada una:
  - `control`: precio solo al desplegar, tanto en móvil como en desktop, sin precio tachado.
  - `show-price`: precio visible en la fila, también cerrada, en ambos dispositivos, sin precio tachado.
  - `show-discount`: igual que `show-price` y, solo si el catálogo tiene un precio anterior real (`originalPriceEur`), lo muestra tachado junto al actual. Es la única diferencia con `show-price`.
- Una sola flag evita la combinación incoherente de dos flags cruzadas (tachado con el precio oculto en detalles) y la doble asignación. Preguntas: ¿mostrar el precio sube el CTR? (`show-price` frente a `control`, todos los productos); ¿el tachado lo sube aún más? (`show-discount` frente a `show-price`, solo productos con precio de referencia, es decir `reference_price_eur` no nulo).
- El precio tachado debe ser real: el precio anterior publicado por el proveedor y, según la Directiva Ómnibus, el más bajo de los 30 días anteriores. Revisar y actualizar `originalPriceEur` y `sources.json` antes de lanzar y durante el experimento; al eliminar el valor, el producto deja de mostrarse tachado y queda fuera del análisis del descuento. Hoy solo FUGA EX 3 (rama Kailas, <20 km) y TRABUCO MAX 5 (rama ASICS, ≥50 km) son elegibles, por lo que la comparación del tachado tendrá poca muestra. Los importes ficticios de la vista previa local nunca se usan en producción.
- No se oculta el precio de la ficha: todas las variantes permiten consultarlo.
- Asignación independiente de Näak/Baouw y del orden de los productos. Los visitantes del control sin recomendaciones del piloto de marcas no generan impresiones ni entran en este análisis.
- La exposición personalizada es `race_product_impression` con `price_variant` reconocido. Se conserva el requisito de visibilidad del producto o interacción real. Evaluar una flag no cuenta como exposición.
- Los eventos de producto incluyen `price_variant`, `$feature/race-product-price`, `layout` (`mobile` por debajo de 640 px, `desktop` desde 640 px) `price_placement` (`row` o `details`), `reference_price_eur` (precio anterior real del catálogo o `null`) y `discount_shown` (si la fila mostró el tachado). `layout` corresponde al ancho real del componente, no al tipo de dispositivo inferido por el SDK.
- La métrica principal del experimento mide personas expuestas con clic saliente en un día, con corte por layout de primera exposición; no cuenta la apertura de detalles como salida. Se excluyen cuentas internas y usuarios expuestos a más de una variante. Es una tasa por persona; el CTR por sesión/producto del dashboard sigue siendo otra medida y sus tablas actuales no separan aún las variantes de precio.
- Para un análisis por producto, deduplicar impresiones y clics por sesión, producto y variante, y comparar dentro del mismo layout, marca y posición. Excluir asignaciones nulas y sesiones con más de una variante. Para el efecto del tachado, filtrar `reference_price_eur` no nulo en `show-price` y `show-discount`, y comparar producto a producto; el control y `show-price` nunca lo muestran. No sumar porcentajes entre productos ni mezclar desktop y móvil para decidir el resultado principal en móvil.
- Si la flag no está disponible o está apagada, se mantiene la presentación previa (fila en desktop, detalles en móvil, tachado si hay precio anterior real), con `price_variant=null` y sin la propiedad de exposición de esta flag. Estas impresiones no entran en el experimento. Si la asignación llega tras una impresión inicial, la fila inicia un nuevo periodo de visibilidad con la variante efectiva.
- En desarrollo, `NEXT_PUBLIC_PRODUCT_PRICE_PREVIEW=show-price` es la vista previa por defecto; usar `control` o `show-discount` para revisar las otras variantes y reiniciar el servidor. Producción ignora este override. Cualquier preview de marca o precio desactiva todas las capturas del piloto.
- Código y configuración preparados, sin desplegar ni activar. Antes del lanzamiento, verificar ambos layouts, las tres variantes, los precios de referencia vigentes y la primera captura real. Revisar 30 días completos como primer corte orientativo; sin una tasa base aún no se puede fijar una muestra o duración suficiente. No concluir por ausencia de significación con pocos clics.

La conexión de PostHog no permite consultar la biblioteca de métricas compartidas ni el asistente de tamaño de muestra; se ha configurado una métrica propia con los eventos de producto ya aprobados e instrumentados, pendientes de su primera ingesta.


## Calzado ASICS y comparación independiente · catálogo v3

| Banda | Distancia | Kailas FUGA | Equivalente ASICS | Precio ASICS del color enlazado |
| --- | --- | --- | --- | --- |
| Sprint / corta | >0–<20 km | EX 3 | FUJI LITE 7 | 140 € |
| Media | 20–<40 km | DU 2 | TRABUCO 14 | 160 € |
| Maratón | 40–<50 km | EX PRO | METAFUJI TRAIL 2 | 250 € |
| Ultratrail | ≥50 km | EX 330 | TRABUCO MAX 5 | 126 € (antes 180 €) |

La equivalencia es editorial por uso, no una equivalencia técnica exacta ni límites de distancia del fabricante: FUJI LITE 7 prima ligereza y sujeción con FF BLAST PLUS, TRABUCO 14 aporta ajuste de trail, FF BLAST MAX y ASICSGRIP, METAFUJI TRAIL 2 combina placa de carbono con FF LEAP y FF BLAST PLUS, y TRABUCO MAX 5 se orienta a máxima amortiguación con FF BLAST PLUS y ASICSGRIP. La comparación mide el conjunto marca/modelo/imagen/precio, no el efecto aislado del logo.

Fuentes y destinos oficiales de ASICS España: [FUJI LITE 7](https://www.asics.com/es/es-es/fuji-lite-7/p/1013A232-400.html), [TRABUCO 14](https://www.asics.com/es/es-es/trabuco--14/p/1011C166-750.html), [METAFUJI TRAIL 2](https://www.asics.com/es/es-es/metafuji-trail-2/p/1013A178-750.html), [TRABUCO MAX 5](https://www.asics.com/es/es-es/trabuco--max-5/p/1011C164-600.html). Consultados el 20 de octubre de 2026. Las fotos se descargaron de la galería oficial `images.asics.com`; el logo completo procede de [ASICS corporativo](https://corp.asics.com/en/). Los manifiestos guardan SKU/color y precios. La tienda limita peticiones automatizadas directas; las fichas y precios se comprobaron con el navegador de investigación. Revisar promociones y disponibilidad por talla antes de lanzar. FUJI LITE 7 y METAFUJI TRAIL 2 son unisex; las fichas TRABUCO seleccionadas son de hombre. No se infiere el género del visitante.

- [Experimento 102799: Kailas FUGA vs ASICS](https://eu.posthog.com/project/103358/experiments/102799).
- Flag `race-product-shoes` (322548), desactivada. Control `control` = Kailas FUGA, variante `asics` = ASICS. Reparto 50/50 por distinct ID, sin persistencia adicional, siguiendo la convención ya aprobada para el piloto.
- Se muestra una sola zapatilla por carrera. La marca es estable para cada visitante y se asigna de forma independiente a nutrición (`race-product-recommendations`) y ubicación del precio (`race-product-price`). Los bastones, nutrición y posiciones conservan sus reglas. El control del bloque completo sigue sin recomendaciones.
- Si la flag de calzado falta, está desactivada o devuelve un valor desconocido, se mantiene Kailas con `shoe_variant=null` y sin `$feature/race-product-shoes`, por lo que no se enrola artificialmente al visitante en el experimento de calzado. Una asignación que llega después inicia una nueva impresión de la zapatilla efectiva, incluso si conserva Kailas.
- Exposición personalizada: `race_product_impression` filtrado por `category=shoes` y `shoe_variant` reconocido. Solo cuentan impresiones visibles o interacción real con una zapatilla; la nutrición no enrola en este test. Métrica principal: personas expuestas con `race_product_clicked` de calzado en un día. Los cortes por `layout` y `distance_band` se atribuyen a la primera exposición; para CTR de cada producto usar las tablas por sesión/producto del dashboard.
- Todos los eventos incorporan `shoe_variant` y, si está reconocida, `$feature/race-product-shoes`. Se excluyen cuentas internas y usuarios con múltiples variantes. El catálogo de analítica pasa a `v3` para no mezclar con la selección anterior. Se mantiene la campaña UTM `race_products_v1`, identificador del piloto completo.
- Vista previa de desarrollo: ASICS por defecto. `NEXT_PUBLIC_PRODUCT_SHOES_PREVIEW=control pnpm dev` muestra Kailas y `NEXT_PUBLIC_PRODUCT_SHOES_PREVIEW=asics pnpm dev` muestra ASICS; reiniciar tras cambiar la variable. Producción ignora este override. Toda vista previa de marca, precio o calzado desactiva los eventos del piloto.
- No se han desplegado cambios ni activado flags. La configuración se ha guardado antes de la primera ingesta de los eventos de producto, conforme a la instrumentación del piloto aprobada. Biblioteca de métricas compartidas y asistente de estimación de tráfico no disponibles con los permisos actuales de la conexión. Revisar 30 días completos como primer corte orientativo y prolongar si la muestra es insuficiente.

## Vista previa de desarrollo: precio de referencia tachado

Maqueta local para evaluar la jerarquía visual del precio actual junto a un precio de referencia tachado. Desactivada por defecto; solo funciona con `NODE_ENV=development` y producción la ignora.

```sh
NEXT_PUBLIC_PRODUCT_REFERENCE_PRICE_PREVIEW=simulated pnpm dev
```

- Los importes son **ficticios** y viven en `lib/sponsors/reference-price-preview.ts`, separados del catálogo real (`lib/sponsors/product-recommendation.ts` y `sources.json`). No constituyen una verificación de precios del proveedor ni deben publicarse como descuentos reales.
- La vista previa no muestra ningún aviso en pantalla; solo existe en desarrollo local.
- Se combina con los demás overrides (`NEXT_PUBLIC_PRODUCT_RECOMMENDATION_PREVIEW`, `NEXT_PUBLIC_PRODUCT_PRICE_PREVIEW`, `NEXT_PUBLIC_PRODUCT_SHOES_PREVIEW`). Con `NEXT_PUBLIC_PRODUCT_PRICE_PREVIEW=control` el precio solo aparece al desplegar la fila.
- Mientras está activa no se capturan exposiciones, impresiones, aperturas de detalle ni clics, aunque el resto de overrides esté vacío. No cambia reglas, enlaces, UTM, flags ni experimentos.
