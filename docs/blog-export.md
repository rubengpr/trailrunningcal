# Exportar un borrador a MDX

En el detalle del admin, completar autor y fecha desde **Editar**, subir portada y añadir alt text a todas las imágenes. El alt text de portada también se completa en **Editar**.

Elegir **Exportar MDX** en el menú de tres puntos. Guardar el archivo descargado como `content/blog/{slug}/es.mdx`, usando el slug del frontmatter como nombre de carpeta. Revisar el resultado en `/{locale}/blog/{slug}` antes de hacer commit.

La exportación publica copias inmutables en el bucket `blog-publications` del entorno que sirve el admin. No usar URLs del entorno de pruebas para artículos de producción. Los originales siguen privados. Borrar el borrador no elimina las copias públicas y repetir una exportación reutiliza los archivos de contenido idéntico.

El endpoint `POST /api/blog-drafts/[id]/export` requiere admin. Devuelve un archivo MDX o el contrato JSON habitual de error. No hace inferencias ni publica el artículo en el repositorio.

## Verificación

- Pruebas del conversor, del servicio, del endpoint y de interacción de descarga.
- Integración local opt-in: `RUN_SUPABASE_INTEGRATION_TESTS=true node --env-file=.env.local node_modules/vitest/vitest.mjs run lib/db/blog-export.integration.test.ts`.
- La integración exige explícitamente `trailrunningcal-local`, usa registros temporales, renderiza el MDX con los componentes del blog y limpia sus datos. Comprueba lectura pública, bloqueo de subidas anónimas y supervivencia de imágenes tras eliminar el borrador.
- Verificado también desde el menú del navegador, descargando el archivo y renderizándolo en escritorio y móvil. El artículo temporal se retira tras la comprobación.

Fallos globales previos encontrados durante la implementación: lint de `.bt/functions-runners`, `scripts/.cache/search-comparison` y `lib/services/sponsor-report.ts`; advertencias de imports/variables sin usar en importación de eventos y mapa. El auditor de autorización global conserva tres tests fallidos por las rutas de marcas e importación de eventos, ajenas al endpoint de exportación.

Supabase mantiene avisos previos sobre [search_path de funciones](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) y [protección de contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). El bucket nuevo no añade políticas de escritura para clientes.
