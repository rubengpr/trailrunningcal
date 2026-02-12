/**
 * Migrates priceEur from deprecated-races.ts to race_tiers.
 * Match key: name + date + distance_km (normalized).
 * Loads .env.local from the frontend directory.
 *
 * Usage:
 *   npx tsx scripts/migrate-price-eur.ts           # run migration
 *   npx tsx scripts/migrate-price-eur.ts --dry-run  # log only, no writes
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { races as deprecatedRaces } from '../data/deprecated-races';
import { createClient } from '@supabase/supabase-js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function loadEnvLocal() {
  const path = join(__dirname, '..', '.env.local');
  if (!existsSync(path)) return;
  const content = readFileSync(path, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      const value = match[2].replace(/^["']|["']$/g, '').trim();
      process.env[match[1]] = value;
    }
  }
}

loadEnvLocal();

type DbRace = {
  id: string;
  name: string;
  date: string | null;
  distance_km: number;
  city: string;
};

function buildMatchKey(name: string, date: string | null, distanceKm: number): string {
  const normalizedName = (name ?? '').trim();
  const normalizedDate = date ?? '';
  const normalizedDistance = Number(distanceKm);
  return `${normalizedName}|${normalizedDate}|${normalizedDistance}`;
}

async function migratePriceEur() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('Dry run: no updates or inserts will be performed.\n');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      'Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Add them to frontend/.env.local or export before running.',
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: dbRaces, error: racesError } = await supabase
    .from('races')
    .select('id, name, date, distance_km, city')
    .order('date', { ascending: true, nullsFirst: false });

  if (racesError) {
    console.error('Failed to fetch races:', racesError);
    process.exit(1);
  }

  const { data: existingTiers, error: tiersError } = await supabase
    .from('race_tiers')
    .select('race_id');

  if (tiersError) {
    console.error('Failed to fetch race_tiers:', tiersError);
    process.exit(1);
  }

  const raceIdsWithTier = new Set((existingTiers ?? []).map((r) => r.race_id));
  const keyToRace = new Map<string, DbRace>();

  for (const r of dbRaces ?? []) {
    const row = r as DbRace;
    const key = buildMatchKey(row.name, row.date, row.distance_km);
    if (keyToRace.has(key)) {
      console.warn(`Duplicate DB key (using first): ${key}`);
      continue;
    }
    keyToRace.set(key, row);
  }

  let migratedCount = 0;
  let skippedCount = 0;
  const unmatched: Array<{ name: string; date: string | null; distanceKm: number; priceEur: number }> = [];
  const duplicateKeyWarnings: string[] = [];
  const seenKeys = new Set<string>();

  for (const legacy of deprecatedRaces) {
    const priceEur = legacy.priceEur;
    if (priceEur == null || typeof priceEur !== 'number') {
      skippedCount++;
      continue;
    }

    const key = buildMatchKey(legacy.name, legacy.date, legacy.distanceKm);
    if (seenKeys.has(key)) {
      duplicateKeyWarnings.push(key);
      continue;
    }
    seenKeys.add(key);

    const dbRace = keyToRace.get(key);
    if (!dbRace) {
      unmatched.push({
        name: legacy.name,
        date: legacy.date,
        distanceKm: legacy.distanceKm,
        priceEur,
      });
      continue;
    }

    const priceEurInt = Math.round(priceEur);
    const hasTier = raceIdsWithTier.has(dbRace.id);

    if (dryRun) {
      console.log(
        hasTier
          ? `Would UPDATE race_tiers for race_id=${dbRace.id} (${legacy.name}) -> price_eur=${priceEurInt}`
          : `Would INSERT race_tiers for race_id=${dbRace.id} (${legacy.name}) -> price_eur=${priceEurInt}`,
      );
      migratedCount++;
      continue;
    }

    const now = new Date().toISOString();
    const raceDate = dbRace.date ?? '1970-01-01';
    const tierStartsAt = raceDate;
    const tierEndsAt = raceDate;

    if (hasTier) {
      const { error } = await supabase
        .from('race_tiers')
        .update({ price_eur: priceEurInt, updated_at: now })
        .eq('race_id', dbRace.id);

      if (error) {
        console.error(`Update failed for race_id=${dbRace.id} (${legacy.name}):`, error);
        continue;
      }
    } else {
      const { error } = await supabase.from('race_tiers').insert({
        id: crypto.randomUUID(),
        race_id: dbRace.id,
        price_eur: priceEurInt,
        starts_at: tierStartsAt,
        ends_at: tierEndsAt,
        created_at: now,
        updated_at: now,
      });

      if (error) {
        console.error(`Insert failed for race_id=${dbRace.id} (${legacy.name}):`, error);
        continue;
      }
      raceIdsWithTier.add(dbRace.id);
    }

    migratedCount++;
  }

  if (duplicateKeyWarnings.length > 0) {
    console.warn('\nDuplicate deprecated keys (first occurrence used):', duplicateKeyWarnings);
  }

  console.log('\n--- Summary ---');
  console.log(`Migrated: ${migratedCount}`);
  console.log(`Skipped (null/invalid price): ${skippedCount}`);
  console.log(`Unmatched: ${unmatched.length}`);

  if (unmatched.length > 0) {
    console.log('\nUnmatched races (name, date, distance_km, priceEur):');
    unmatched.forEach((u) => {
      console.log(`  ${u.name} | ${u.date ?? 'null'} | ${u.distanceKm} | ${u.priceEur}`);
    });
  }
}

migratePriceEur().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
