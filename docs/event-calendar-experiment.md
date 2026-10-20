# Personal calendar usage

The event page offers a calendar icon menu to every visitor when its date range is valid. It exports one all-day event covering the displayed range, with no account or calendar connection. Downloads and Google links are snapshots and do not synchronize later changes.

## Neutral icon, explicit label and Google Calendar icon experiment

[PostHog experiment 102758](https://eu.posthog.com/project/103358/experiments/102758), flag `event-calendar-button-label`, is prepared as a draft. Launch only after deploying the code and checking capture. Split all eligible visitors approximately equally (34% / 33% / 33%) using the project's default distinct-ID assignment:

- `control`: calendar icon only.
- `icon_text`: the same icon plus the translated “Add to my calendar” label, on a full-width row directly below the official website button, using the same Button component and 40px height with 14px text. Favorites and WhatsApp occupy the row below.

- `google_icon`: only the full-color Google Calendar product icon, at the same 20px size and button dimensions as control.

The icon is served locally from `public/icons/google-calendar.png`, copied without recoloring from [Google's official product asset](https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png). It does not introduce external requests for visitors.

In the icon-only variants, actions are ordered favorites → WhatsApp → calendar. On mobile the calendar trigger is a fixed 42×42px square, while favorites and WhatsApp retain their text labels and existing sizing styles. The menu, export content and destinations are identical. Without a recognized assignment the icon remains usable, but its clicks carry `calendar_variant = unassigned` and are outside the experiment.

`event_calendar_button_viewed` is the custom exposure event. It fires once per mounted event/variant after a recognized flag resolves, with `calendar_variant` and `$feature/event-calendar-button-label` set to the actual rendered variant. This explicit event also supports the installed SDK, which does not emit the newer `$experiment_exposure` event. A mounted button is availability, not a viewport impression.

The primary metric is a person-level funnel from exposure to `event_calendar_option_clicked`, within one day. The secondary metric is exposure to `event_calendar_menu_opened` in the same window. PostHog automatically prepends exposure; metric definitions contain only the completion step. Internal/test users and people exposed to multiple variants are excluded. No calendar save is confirmed. Shared metric inspection was unavailable with the current connector scopes, so metrics are inline on this experiment.

Both click events include `calendar_variant`. The third arm tests whether the familiar branded icon increases export intent relative to the neutral icon. This comparison combines brand recognition and color; it cannot attribute a lift to color alone. Review conversion by assigned variant, not total click counts, and compare Google versus `.ics` only as supporting context. Do not treat clicks before assignment as control conversions.

## PostHog measurement

- `event_page_viewed` with `calendar_available = true`: eligible event-page visitors.
- `event_calendar_menu_opened`: visitors opening the menu.
- `event_calendar_option_clicked`, broken down by `option` (`google`, `ics`): visitors choosing an export method.
- Both new events include `event_id`, `event_slug` and `locale`. Reopening the menu emits another opening; use unique persons for adoption, not event totals.

After deployment, verify the custom exposure, one opening and each option in live events using a local test override of each variant; clear the override afterwards. Verify variant assignment before launching the draft. Confirm the locale, option, event identifiers and availability property. Do not generate synthetic production clicks to inflate the experiment.

Review the first 30 complete days after launching the experiment, using Europe/Madrid and the project's internal/test exclusions. Report unique eligible visitors, menu openers, option selectors, opening rate (openers / eligible visitors), selection rate (selectors / eligible visitors), and menu completion (selectors / openers). Deduplicate across options and the whole period; do not sum daily unique users. Use an ordered funnel for menu-to-option conversion. Break down selections by option and locale; count people selecting in multiple sessions as a separate recurrence signal.

Option clicks measure intent, not confirmed calendar saves or willingness to register. Eligible pageviews do not prove that the icon was visible. Without identified accounts, multiple devices can count as different people. Never compare historical pageviews missing `calendar_available` as if they were eligible exposures. Low counts should be reported as limited evidence, without declaring a winning option or inventing a success threshold.

## Manual compatibility check

Before release, open a Google link and import the downloaded `.ics` in Apple Calendar and Outlook. Check the title, localized description, location, event-page URL and inclusive displayed dates, especially for multi-day events. Export tests cover the wire format; they do not replace checking actual calendar applications.
