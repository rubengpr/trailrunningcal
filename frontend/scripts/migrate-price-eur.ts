/**
 * Migrates priceEur from deprecated-races.ts to race_tiers.
 * Match key: name + date + distance_km (normalized).
 * Loads .env from the frontend directory.
 *
 * Usage:
 *   npx tsx scripts/migrate-price-eur.ts --dry-run  # dry run (recommended first)
 *   npx tsx scripts/migrate-price-eur.ts             # run migration (will prompt for confirmation)
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { races as deprecatedRaces } from '../data/deprecated-races';
import { createClient } from '@supabase/supabase-js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function loadEnv() {
  const path = join(__dirname, '..', '.env');
  if (!existsSync(path)) {
    console.error(
      'Error: .env file not found.\n' +
        'Please create frontend/.env with:\n' +
        '  NEXT_PUBLIC_SUPABASE_URL=your_production_url\n' +
        '  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key',
    );
    process.exit(1);
  }
  const content = readFileSync(path, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      const value = match[2].replace(/^["']|["']$/g, '').trim();
      process.env[match[1]] = value;
    }
  }
  console.log('✓ Loaded environment variables from .env');
}

function maskUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    if (hostname.includes('.')) {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        const domain = parts.slice(-2).join('.');
        return `${urlObj.protocol}//xxx.${domain}`;
      }
    }
    return `${urlObj.protocol}//xxx`;
  } catch {
    return 'xxx';
  }
}

async function promptConfirmation(message: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

loadEnv();

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      'Error: Missing required environment variables.\n' +
        'Please ensure .env contains:\n' +
        '  NEXT_PUBLIC_SUPABASE_URL\n' +
        '  SUPABASE_SERVICE_ROLE_KEY',
    );
    process.exit(1);
  }

  const maskedUrl = maskUrl(supabaseUrl);
  console.log(`\n⚠️  PRODUCTION DATABASE CONNECTION`);
  console.log(`   Database URL: ${maskedUrl}`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will modify database)'}\n`);

  if (!dryRun) {
    console.warn('⚠️  WARNING: This will modify the PRODUCTION database!');
    const confirmed = await promptConfirmation(
      'Type "yes" to confirm you want to proceed with the migration: ',
    );
    if (!confirmed) {
      console.log('Migration cancelled.');
      process.exit(0);
    }
    console.log('');
  } else {
    console.log('Dry run mode: no updates or inserts will be performed.\n');
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
  let migratedWithNullCount = 0;
  let skippedCount = 0;
  const unmatched: Array<{ name: string; date: string | null; distanceKm: number; priceEur: number | null }> = [];
  const duplicateKeyWarnings: string[] = [];
  const seenKeys = new Set<string>();

  for (const legacy of deprecatedRaces) {
    const priceEur = legacy.priceEur;
    // Only skip if priceEur is explicitly not a number (but allow null)
    if (priceEur != null && typeof priceEur !== 'number') {
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
        priceEur: priceEur ?? null,
      });
      continue;
    }

    // Allow null values - convert to null if null, otherwise round to int
    const priceEurInt = priceEur == null ? null : Math.round(priceEur);
    const hasTier = raceIdsWithTier.has(dbRace.id);

    if (priceEurInt == null) {
      migratedWithNullCount++;
    }

    if (dryRun) {
      const priceDisplay = priceEurInt == null ? 'null' : priceEurInt.toString();
      console.log(
        hasTier
          ? `Would UPDATE race_tiers for race_id=${dbRace.id} (${legacy.name}) -> price_eur=${priceDisplay}`
          : `Would INSERT race_tiers for race_id=${dbRace.id} (${legacy.name}) -> price_eur=${priceDisplay}`,
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
  console.log(`Migrated: ${migratedCount} (${migratedWithNullCount} with null prices)`);
  console.log(`Skipped (invalid price type): ${skippedCount}`);
  console.log(`Unmatched: ${unmatched.length}`);

  if (unmatched.length > 0) {
    console.log('\nUnmatched races (name, date, distance_km, priceEur):');
    unmatched.forEach((u) => {
      const priceDisplay = u.priceEur == null ? 'null' : u.priceEur.toString();
      console.log(`  ${u.name} | ${u.date ?? 'null'} | ${u.distanceKm} | ${priceDisplay}`);
    });
  }
}

migratePriceEur().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
