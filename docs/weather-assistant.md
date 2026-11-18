# Admin weather assistant

Open `/es/admin/weather` from the admin sidebar. Access to both the page and
`POST /api/weather-assistant` requires the existing `ADMIN_EMAILS` allowlist.
The current local configuration has one administrator. No anonymous access or
agent bearer-token access is accepted.

The page contains a question textarea, a submit button and the answer. Each
submission is independent; if asked for a location, submit a new complete
question such as “¿Qué tiempo hace ahora en Berga, España?”. There is no saved
chat history in the application and no tool inspector in the UI.

## Configuration

- `OPENAI_API_KEY`: existing server-side credential.
- `WEATHER_ASSISTANT_MODEL`: optional override; default `gpt-4.1-mini`.
- Weather provider: Open-Meteo current weather and geocoding, with no API key
  for this personal learning prototype. Review provider subscription terms
  before expanding it to commercial/public use.

## Request flow

1. `components/admin/weather-form.tsx` sends `{ question, locale }` through
   `lib/api/weather-assistant.ts`.
2. The route authenticates the admin and validates the input.
3. `lib/services/weather-assistant.ts` calls Responses API with instructions
   and a single `get_weather` function tool.
4. The tool accepts a location name. Its implementation geocodes that name
   and fetches model-based current conditions through the Open-Meteo client.
5. The service sends `function_call_output` with the original `call_id` and
   uses `previous_response_id` to continue the same chain. Instructions and
   tools are supplied on every model request.
6. A completed response with no pending function calls and nonempty text is
   returned as `{ success: true, data: { answer, usedWeather } }`.

The browser cannot supply a previous response ID or choose tools/models.
There are at most three model requests and two weather lookups per submission,
with an overall timeout. Invalid arguments, missing locations and provider
failures are returned to the model as structured tool results. Unknown tools,
incomplete responses and upstream model errors fail safely.

The geocoder uses its highest-ranked match, which is included in the answer.
Add a country or region to distinguish towns with the same name. Only current
conditions are supported, not future or historical weather. The UI links to
Open-Meteo whenever weather data were used, as required for attribution.

OpenAI responses use `store: true` for the response chain; no IDs or weather
results are persisted in the Trailrunningcal database.

## Observability

When `LATITUDE_API_KEY` and `LATITUDE_PROJECT_SLUG` are configured, the existing
startup instrumentation exports the run to Latitude. Each question is grouped
under `weather-assistant`, with a `weather-assistant` tag and feature/locale
metadata. OpenAI calls include the model, messages and token usage. Each
`get_weather` execution has a child tool span with its call ID, arguments,
result, duration and error status, including errors returned as tool results.
There is no persistent conversation memory to instrument.

`next.config.ts` keeps `openai` external to the server bundle so startup
instrumentation and route handlers share the same patched SDK instance.

The existing Langfuse instrumentation remains enabled. The existing masking
rules also apply to Latitude's tool argument and result attributes. Short-lived
verification scripts must initialize telemetry before importing the agent,
await its readiness, and flush telemetry before exiting.
