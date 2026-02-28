import { createClient } from '@supabase/supabase-js';
import { generateRaceSlug } from '../lib/race-utils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const BASE_URL = 'https://www.trailrunningcal.com';
const INDEXNOW_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
const LOCALES = ['es', 'ca'] as const;

async function main(): Promise<void> {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  const today = new Date().toISOString().split('T')[0];

  const { data: races, error } = await supabase
    .from('races')
    .select('name, date')
    .or(`date.gte.${today},date.is.null`);

  if (error) {
    console.error('Failed to fetch races:', error.message);
    process.exit(1);
  }

  if (!races || races.length === 0) {
    console.log('No upcoming races found.');
    return;
  }

  const urls: string[] = [];

  for (const race of races) {
    const slug = generateRaceSlug(race.name);
    for (const locale of LOCALES) {
      urls.push(`${BASE_URL}/${locale}/carrera/${slug}`);
    }
  }

  console.log(`Submitting ${urls.length} URLs to IndexNow (${races.length} races × ${LOCALES.length} locales)...`);

  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: 'www.trailrunningcal.com',
      key: INDEXNOW_KEY,
      urlList: urls,
    }),
  });

  console.log(`Response: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const body = await response.text();
    console.error('Response body:', body);
    process.exit(1);
  }

  console.log(`Done. ${urls.length} URLs submitted successfully.`);
}

main();
