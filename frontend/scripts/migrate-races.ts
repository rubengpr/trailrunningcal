//Importar materia prima
console.log('🤖 Starting script...');
import { races } from '@/data/deprecated-races';
import type { PriceTier } from '@/types/race.types';
import { createClient } from '@supabase/supabase-js';

type LegacyRace = (typeof races)[number];

//Si calidad no es correcta, devolver toda la materia prima
//Si calidad correcta, manipular materia prima y entregar platos secuencialmente, uno detrás de otro
//Al finalizar tarea, dar feedback

//Declarar los valores posibles de la propiedad province
const provinces = ['Barcelona', 'Tarragona', 'Girona', 'Lleida'];

function isValidIsoDate(date: string | null): boolean {
  if (date === null) return true; // allow null

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false; // invalid date

  // Ensure it round-trips exactly as YYYY-MM-DD
  return parsed.toISOString().slice(0, 10) === date;
}

function isValidName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed === '') return false;
  return trimmed.length > 0 && trimmed.length < 200;
}

function isValidDistance(distanceKm: number): boolean {
  if (distanceKm === null) return true;

  if (distanceKm <= 0 || distanceKm > 1000) return false;

  return true;
}

function isValidElevationGain(elevationGainM: number | null): boolean {
  if (elevationGainM === null) return true;

  if (elevationGainM <= 0 || elevationGainM > 100000) return false;

  if (!Number.isInteger(elevationGainM)) return false;

  return true;
}

function isPriceValid(priceEur: number | null | PriceTier[]): boolean {
  if (priceEur === null) return true;
  if (Array.isArray(priceEur)) return true;

  if (priceEur <= 0 || priceEur > 1000) return false;
  if (!Number.isInteger(priceEur)) return false;

  const str = priceEur.toString();
  return !str.startsWith('0') || str === '0' || str.startsWith('.0');
}

function isCityValid(city: string): boolean {
  const trimmed = city.trim();
  return trimmed.length > 0 && trimmed.length < 200;
}

function isProvinceValid(province: string): boolean {
  return provinces.includes(province);
}

function isWebsiteValid(websiteUrl: string | null): boolean {
  if (websiteUrl === null) return true;

  const trimmed = websiteUrl.trim();

  if (!trimmed) return false;

  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isOrganizerIdValid(organizerId: string | null): boolean {
  if (organizerId === null) return true;

  const trimmed = organizerId.trim();
  if (!trimmed) return false;

  // Validate UUID format (optional but recommended)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(trimmed);
}

function isDescriptionValid(description: string | undefined): boolean {
  if (description === undefined) return true;

  const trimmed = description.trim();
  if (!trimmed) return false;

  return true;
}

function isMapUrlValid(mapUrl: string | undefined): boolean {
  if (mapUrl === undefined) return true;

  const trimmed = mapUrl.trim();
  if (!trimmed) return false;

  return true;
}

//Para cada elemento de races[] for...of loop
//Itera cada objeto race de races[]

async function migrateRaces() {
  //Validation loop
  for (const race of races) {
    if (
      (typeof race.date !== 'string' && race.date !== null) ||
      typeof race.name !== 'string' ||
      typeof race.distanceKm !== 'number' ||
      (typeof race.elevationGainM !== 'number' &&
        race.elevationGainM !== null) ||
      (typeof race.priceEur !== 'number' &&
        race.priceEur !== null &&
        !Array.isArray(race.priceEur)) || //Add support for races with price array
      typeof race.city !== 'string' ||
      typeof race.province !== 'string' ||
      (typeof race.websiteUrl !== 'string' && race.websiteUrl !== null) ||
      (typeof race.description !== 'string' &&
        race.description !== undefined) ||
      (typeof race.organizerId !== 'string' && race.organizerId !== null)
    ) {
      console.error('Some of the race data types are invalid:', race);
      return;
    }

    //Validar que race.date es un ISO string
    const verifyDate = isValidIsoDate(race.date);
    if (!verifyDate) {
      console.error('Date format is not valid:', race);
      return;
    }

    //Validar que name tiene formato correcto
    const verifyName = isValidName(race.name);
    if (!verifyName) {
      console.error('Name format is not valid:', race);
      return;
    }

    //Validar que distanceKm tiene formato correcto
    const verifyDistance = isValidDistance(race.distanceKm);
    if (!verifyDistance) {
      console.error('distanceKm format is not valid:', race);
      return;
    }

    const verifyElevationGain = isValidElevationGain(race.elevationGainM);
    if (!verifyElevationGain) {
      console.error('elevationGainM format is not valid:', race);
      return;
    }

    const verifyPriceEur = isPriceValid(race.priceEur);
    if (!verifyPriceEur) {
      console.error('priceEur format is not valid:', race);
      return;
    }

    const verifyCity = isCityValid(race.city);
    if (!verifyCity) {
      console.error('city format is not valid:', race);
      return;
    }

    const verifyProvince = isProvinceValid(race.province);
    if (!verifyProvince) {
      console.error('province format is not valid:', race);
      return;
    }

    const verifyWebsite = isWebsiteValid(race.websiteUrl);
    if (!verifyWebsite) {
      console.error('website format is not valid:', race);
      return;
    }

    const verifyDescription = isDescriptionValid(race.description);
    if (!verifyDescription) {
      console.error('description format is not valid:', race);
      return;
    }

    const verifyOrganizerId = isOrganizerIdValid(race.organizerId);
    if (!verifyOrganizerId) {
      console.error('organizerId format is not valid:', race);
      return;
    }

    const verifyMapUrl = isMapUrlValid(race.mapUrl);
    if (!verifyMapUrl) {
      console.error('mapUrl format is not valid:', race);
      return;
    }
  }

  console.log('✅ All validations passed. Now running database operation');

  // Create Supabase client once
  const supabase = createClient(
    'https://ppmdbmyxgtqvmvtbptmg.supabase.co',
    'sb_secret_9GJxhzTzUg39wfdm-ftvAg_qnWR0oDn',
  );

  const CHUNK_SIZE = 50; // Insert 50 races at a time
  const chunks: LegacyRace[][] = [];

  for (let i = 0; i < races.length; i += CHUNK_SIZE) {
    chunks.push(races.slice(i, i + CHUNK_SIZE));
  }

  let successCount = 0;
  let failureCount = 0;
  const failedRaces: Array<{ race: (typeof races)[0]; error: unknown }> = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(
      `📦 Inserting chunk ${i + 1}/${chunks.length} (${chunk.length} races)...`,
    );

    try {
      const { error } = await supabase.from('races').upsert(
        chunk.map((race) => ({
          name: race.name,
          date: race.date,
          distance_km: race.distanceKm,
          elevation_gain_m: race.elevationGainM,
          city: race.city,
          province: race.province,
          description: race.description,
          map_url: race.mapUrl,
          website_url: race.websiteUrl,
          organizer_id: race.organizerId,
        })),
      );

      if (error) {
        console.error(`❌ Chunk ${i + 1} failed:`, error);
        failureCount += chunk.length;
        failedRaces.push(...chunk.map((race) => ({ race, error })));
      } else {
        successCount += chunk.length;
        console.log(`✅ Chunk ${i + 1} inserted successfully`);
      }
    } catch (error) {
      console.error(`❌ Chunk ${i + 1} threw error:`, error);
      failureCount += chunk.length;
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`✅ Success: ${successCount} races`);
  console.log(`❌ Failed: ${failureCount} races`);
  if (failedRaces.length > 0) {
    console.log(`\n⚠️ Failed races:`, failedRaces);
  }
}

migrateRaces().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
