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

PATCH recibe el documento completo `{ "event": { "name": "...", "websiteUrl": "...", "description": "..." }, "races": [...] }`, no un parche parcial. Leer primero el borrador y conservar sus demás campos y modalidades. Consultar `lib/events/write-validation.ts` para la estructura admitida. DELETE retira el borrador mediante rechazo lógico. La publicación puede devolver 202 y un jobId, que debe consultarse hasta su resultado final. La disponibilidad técnica de estos permisos no sustituye el alcance autorizado por el usuario.
