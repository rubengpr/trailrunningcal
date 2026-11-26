-- Event-owned social profiles. Distinct from organizers.*_url, which hold the
-- organizer's (club/company) profiles edited from the organizer profile page.
alter table public.events
  add column facebook_url text,
  add column instagram_url text,
  add column youtube_url text,
  add column tiktok_url text,
  add constraint events_facebook_url_valid check (facebook_url is null or facebook_url ~* '^https://([a-z0-9-]+\.)?facebook\.com/.+'),
  add constraint events_instagram_url_valid check (instagram_url is null or instagram_url ~* '^https://([a-z0-9-]+\.)?instagram\.com/.+'),
  add constraint events_youtube_url_valid check (youtube_url is null or youtube_url ~* '^https://(([a-z0-9-]+\.)?youtube\.com|youtu\.be)/.+'),
  add constraint events_tiktok_url_valid check (tiktok_url is null or tiktok_url ~* '^https://([a-z0-9-]+\.)?tiktok\.com/.+');

-- Seed from organizers that run a single event: their profiles belong to that event.
update public.events e
set
  facebook_url = nullif(o.facebook_url, ''),
  instagram_url = nullif(o.instagram_url, ''),
  youtube_url = nullif(o.youtube_url, ''),
  tiktok_url = nullif(o.tiktok_url, '')
from public.organizers o
where e.organizer_id = o.id
  and (select count(*) from public.events x where x.organizer_id = o.id) = 1
  and coalesce(nullif(o.facebook_url, ''), nullif(o.instagram_url, ''), nullif(o.youtube_url, ''), nullif(o.tiktok_url, '')) is not null;
