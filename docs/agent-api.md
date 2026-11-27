# Acceso de agentes a borradores

Configurar `AGENT_API_TOKEN` como secreto del servidor (local o Vercel) y del entorno de comandos de Codex. Nunca usar un nombre `NEXT_PUBLIC_*`. La misma credencial debe estar configurada en el cliente y el servidor destino. El servidor compara hashes SHA-256 en tiempo constante; no se crea una tabla ni un registro de auditoría.

`AGENT_API_PERMISSIONS` es una lista separada por comas. Si no se configura, permite `read,update`. Una cadena vacía deniega todas las operaciones. `AGENT_API_TOKEN_EXPIRES_AT` admite una fecha ISO opcional; una fecha inválida o vencida rechaza el token. Sin fecha, permanece válido hasta rotarlo o eliminarlo. Los cambios en las variables de Vercel requieren un nuevo despliegue; en local, reiniciar el servidor.

| Método y endpoint | Permiso |
| --- | --- |
| GET `/api/events/import/drafts` | read |
| GET `/api/events/import/drafts/{id}` | read |
| PATCH `/api/events/import/drafts/{id}` | update |
| POST `/api/events/import/drafts` | create |
| DELETE `/api/events/import/drafts/{id}` | reject |
| POST `/api/events/import/drafts/{id}/accept` | publish |
| GET `/api/events/import/drafts/{id}/publication?jobId={id}` | read |
| POST `/api/events/{eventId}/drafts` | propose |
| PATCH `/api/events/drafts/{draftId}` (`update`) | propose |
| PATCH `/api/events/drafts/{draftId}` (`reject`) | propose + reject |
| PATCH `/api/events/drafts/{draftId}` (`accept`) | propose + publish |

Los otros endpoints administrativos siguen requiriendo una sesión administrativa. En estos endpoints, si no hay cabecera Authorization se comprueba la sesión administrativa habitual. Una cabecera inválida devuelve 401, incluso con cookies válidas; un token válido sin permiso devuelve 403. Las validaciones y servicios de la aplicación siguen ejecutándose.

## Solicitudes

Elegir explícitamente el entorno indicado por el usuario antes de enviar la credencial. No seguir redirecciones ni imprimir el token o activar trazas de shell/curl. `AGENT_API_TOKEN` debe corresponder al destino; localhost puede usar una base de datos de producción si así está configurado el servidor.

```bash
# Producción. Para local, sustituir por http://localhost:3000.
API_BASE_URL=https://www.trailrunningcal.com
curl --fail-with-body --silent --show-error \
  "$API_BASE_URL/api/events/import/drafts?page=1" \
  -H "Authorization: Bearer $AGENT_API_TOKEN"

curl --fail-with-body --silent --show-error \
  "$API_BASE_URL/api/events/import/drafts/$DRAFT_ID" \
  -H "Authorization: Bearer $AGENT_API_TOKEN"

curl --fail-with-body --silent --show-error --request PATCH \
  "$API_BASE_URL/api/events/import/drafts/$DRAFT_ID" \
  -H "Authorization: Bearer $AGENT_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary @draft.json
```

## Propuestas de actualización de eventos existentes

`propose` no se concede por defecto: añadirlo a `AGENT_API_PERMISSIONS` para permitir que el agente proponga nuevas ediciones de eventos ya publicados. POST `/api/events/{eventId}/drafts` con `{ "data": { "event": {...}, "races": [...] } }` crea un borrador pendiente (201) que un administrador revisa y acepta; sin cuerpo, genera el borrador rastreando la web del evento. Devuelve 409 si el evento ya tiene un borrador pendiente y 422 si alguna carrera no tiene fecha, tiene una fecha pasada o una provincia no canónica. Al aceptar, el nombre, la web y la descripción del evento se sobrescriben con los del borrador (una descripción vacía borra la actual) y sus carreras se añaden junto a las de ediciones anteriores, así que el documento debe incluir todas las modalidades de la nueva edición. Seguir `lib/prompts/trail-event-agent-instructions.ts` para el contenido.

```bash
curl --fail-with-body --silent --show-error --request POST \
  "$API_BASE_URL/api/events/$EVENT_ID/drafts" \
  -H "Authorization: Bearer $AGENT_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary @proposal.json
```

## Borradores de importación

PATCH recibe el documento completo `{ "event": { "name": "...", "websiteUrl": "...", "description": "..." }, "races": [...] }`, no un parche parcial. Leer primero el borrador y conservar sus demás campos y modalidades. Consultar `lib/events/write-validation.ts` para la estructura admitida. DELETE retira el borrador mediante rechazo lógico. La publicación puede devolver 202 y un jobId, que debe consultarse hasta su resultado final. La disponibilidad técnica de estos permisos no sustituye el alcance autorizado por el usuario.
