# El tráfico de las fichas se concentra en la semana de competición

Verificado el 27 de noviembre de 2026. En Trailrunningcal, las entradas a fichas suelen crecer antes de la competición, alcanzar su máximo en la semana del evento y caer al terminar. El patrón aparece tanto en Google orgánico como en el conjunto de canales.

## Evidencia

La cohorte incluye 539 eventos que comenzaron entre el 3 de agosto y el 8 de noviembre de 2026. Cada evento aporta cinco semanas completas, alineadas por la semana de su primera carrera. Entran también los eventos con cero sesiones.

| Semana relativa | Sesiones de todos los canales | Sesiones de Google orgánico | Mediana de Google orgánico por evento |
| --- | ---: | ---: | ---: |
| Dos semanas antes | 3.181 | 2.533 | 1 |
| Semana previa | 4.735 | 3.784 | 3 |
| Semana de competición | 16.868 | 14.705 | 13 |
| Semana siguiente | 3.594 | 2.962 | 3 |
| Dos semanas después | 752 | 557 | 0 |

Entre los 452 eventos con alguna sesión desde Google orgánico en la ventana, 394 (87,2 %) tuvieron su máximo estricto en la semana de competición y 15 (3,3 %) en la semana previa. En 273 (60,4 %) el tráfico subió entre las dos semanas anteriores al evento. Quitando las diez fichas con más tráfico orgánico en la semana de competición, esa semana todavía multiplicó por 3,8 el total de la semana previa.

## Cuándo se visitan las fichas y se buscan resultados

En la misma cohorte, el día con más visitas fue el de la última carrera registrada en Supabase. El patrón también aparece en los 505 eventos de un solo día. Las entradas desde Google del día siguiente fueron 2,4 veces las del mismo día de la semana anterior. Al segundo día ya estaban cerca de ese nivel.

| Día respecto a la última carrera | Sesiones con vista de la ficha | Entradas desde Google orgánico | Formularios que seleccionaron resultados | Clics en enlaces de resultados |
| --- | ---: | ---: | ---: | ---: |
| Dos días antes | 1.640 | 1.283 | 4 de 32 | 0 |
| Día anterior | 3.490 | 2.889 | 9 de 74 | 0 |
| Día de la última carrera | 6.607 | 5.771 | 119 de 189 | 0 |
| Día siguiente | 2.468 | 2.138 | 31 de 63 | 56 |
| Dos días después | 1.161 | 970 | 12 de 35 | 57 |
| Tres días después | 582 | 478 | 9 de 21 | 14 |

La opción de resultados apareció en el 8,9 % de los formularios enviados durante los siete días previos, el 63,0 % el día de la última carrera y el 45,3 % durante los siete días posteriores. El día de la última carrera, 101 de las 119 peticiones se enviaron a partir del mediodía. La subida se observó en las dos variantes del formulario. Estas proporciones describen a quienes lo enviaron, una muestra autoseleccionada.

El máximo de tráfico por hora fue de 09:00 a 09:59, con 514 sesiones que vieron una ficha y 435 entradas desde Google orgánico. Las peticiones de resultados alcanzaron su máximo de 13:00 a 13:59, con 15 de los 19 formularios de esa hora. Desde las 12:00 se registraron 3.776 de las 5.771 entradas desde Google (65,4 %) y 101 de las 119 peticiones (84,9 %). Todas las horas son de Madrid. Las entradas de Google se asignan a la hora de inicio de sesión. Una sesión que ve fichas en varias horas puede aparecer en más de una franja de visitas.

De las 1.190 sesiones que entraron desde Google entre las 08:00 y las 10:59, 289 (24,3 %) hicieron clic en la web oficial y 269 (22,6 %) abrieron o usaron un mapa de la ficha en la misma sesión. Entre las 12:00 y las 14:59, 130 de 1.249 (10,4 %) usaron un mapa. Los formularios, consultados para todos los canales, pasaron de 11 de 37 con la opción de resultados por la mañana a 40 de 51 en la franja del mediodía.

La hipótesis para futuras exploraciones es que, a primera hora del día de competición, parte de la audiencia usa la ficha para orientarse y confirmar información práctica del evento o de una modalidad concreta, como el lugar y la hora de salida o el recorrido. A partir del mediodía, los resultados ganan peso entre quienes responden al formulario. Los clics en mapas y en la web oficial son compatibles con esa interpretación. La consulta exacta y el papel del visitante en la competición quedan indeterminados.

PostHog registró 215 clics en enlaces de resultados para 12 fichas de la cohorte hasta el 22 de noviembre. El 52,6 % ocurrió durante los dos días siguientes a la última carrera y el 75,3 % en los primeros siete días. Pedraforca Xtrail concentró 157 clics. Entre las demás fichas, 27 de 58 clics se produjeron igualmente en los dos primeros días. En la consulta a Supabase, 28 de los 539 eventos tenían al menos un enlace de resultados para una modalidad de 2026. De las 182 peticiones enviadas desde el día de la última carrera hasta siete días después, 165 correspondían a fichas sin enlace de 2026 en esa consulta. Sin una fecha de publicación del enlace ni la hora de fin de cada carrera, los clics indican cuándo se usaron los enlaces disponibles. Las peticiones del formulario permiten observar interés también el día de competición.

Para reproducir este corte diario, alinear cada ficha por la última fecha de sus carreras de 2026 y usar el día local de Madrid. Contar sesiones con vista por ficha y día, entradas desde Google por fecha de inicio y ruta de entrada, selecciones de `results` en `event_feature_feedback_submitted` y clics en `event_race_results_clicked`. Reconciliar los clics por `race_id` con Supabase. Una misma sesión puede contar en más de una ficha o día.

## Cómo usarlo

Al investigar una variación semanal, cruzar las fichas de entrada con las fechas de competición. Ver cuánto tráfico aportaron los eventos que empezaban esa semana, los próximos y los recién celebrados. Comparar fases equivalentes al medir el rendimiento de las fichas. Las visitas pueden caer después de un fin de semana potente aunque el calendario siguiente tenga más eventos.

Los valores son una referencia para la cohorte de agosto a noviembre de 2026. La magnitud puede variar con la época del año, los eventos presentes y el canal. Las sesiones reflejan entradas registradas y no permiten distinguir por sí solas demanda de búsqueda y visibilidad en resultados.

## Cómo reproducirlo

1. En [Supabase de producción](https://supabase.com/dashboard/project/ppmdbmyxgtqvmvtbptmg), unir `public.events` y `public.races` por el ID del evento. Elegir la primera fecha de carrera de 2026 por evento y conservar los inicios del 3 de agosto al 8 de noviembre, inclusive.
2. En [PostHog](https://eu.posthog.com/project/103358/sql), seleccionar sesiones con `$pageview` cuya primera ruta sea `/{es|ca|fr|en}/e/{slug}` en Trailrunningcal. Contar IDs de sesión distintos por slug y semana de inicio en `Europe/Madrid`. Aplicar los filtros del proyecto para cuentas de test e internas. Identificar Google orgánico con el canal `Organic Search` y un dominio de entrada de Google Search. Excluir referentes ambiguos de la app de Google.
3. Unir por slug y alinear la semana de la sesión con la semana de la primera carrera. Conservar las cinco semanas de −2 a +2 y rellenar con cero las combinaciones sin sesiones. La ventana de observación abarca del 20 de julio al 22 de noviembre de 2026.
