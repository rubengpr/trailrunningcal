'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Cookie,
  Droplets,
  Flame,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { FormErrorMessage } from '@/components/ui/error-message';
import type { NaakCourseProfile, NaakElevationPoint } from '@/lib/sponsors/naak-mallorca-profiles';

export interface NaakRaceOption {
  id: string;
  name: string;
  distanceKm: number;
  elevationGainM: number | null;
  course: NaakCourseProfile | null;
}

interface NaakNutritionCardProps {
  eventName: string;
  races: NaakRaceOption[];
  className?: string;
  initialResult?: {
    expectedHours: string;
    expectedMinutes: string;
    raceId: string;
  };
}

type RaceGoal = 'compete' | 'improve' | 'finish';
type Weather = 'cold' | 'mild' | 'hot';
type FuelType = 'liquid' | 'semiLiquid' | 'solid';
type DietaryRestriction = 'glutenFree' | 'nutFree' | 'vegan' | 'none';
type StomachSensitivity = 'anything' | 'occasional' | 'frequent';
type SweatRate = 'low' | 'moderate' | 'high';
type WeightUnit = 'kg' | 'lb';

interface NutritionAnswers {
  raceId: string;
  expectedHours: string;
  expectedMinutes: string;
  performanceIndex: string;
  raceGoal: RaceGoal | '';
  weather: Weather | '';
  fuelTypes: FuelType[];
  caffeine: 'yes' | 'no' | '';
  restrictions: DietaryRestriction[];
  stomach: StomachSensitivity | '';
  sweat: SweatRate | '';
  fullName: string;
  weight: string;
  weightUnit: WeightUnit;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  gender: string;
  country: string;
}

interface ChoiceButtonProps {
  detail?: string;
  label: string;
  onClick: () => void;
  selected: boolean;
}

type ResultTab = 'timeline' | 'profile' | 'table';

interface ProductRecommendation {
  category: FuelType;
  image: string;
  id: 'gel' | 'puree' | 'waffle' | 'drinkMix';
  name: string;
  url: string;
}

interface NutritionIntake {
  product: ProductRecommendation;
  timeMinutes: number;
}

const FORM_STEP_COUNT = 10;
const RESULT_STEP = FORM_STEP_COUNT;
const INTAKE_INTERVAL_MINUTES = 40;

const PRODUCTS: ProductRecommendation[] = [
  {
    category: 'semiLiquid',
    image: '/assets/sponsors/naak/ultra-gel-salted-maple-cutout.png',
    id: 'gel',
    name: 'ULTRA Gel 200 · Salted Maple',
    url: 'https://eu.naak.com/products/ultra-gel-200-salted-maple',
  },
  {
    category: 'semiLiquid',
    image: '/assets/sponsors/naak/ultra-puree-apple-strawberry-cutout.png',
    id: 'puree',
    name: 'ULTRA Puree 200 · Apple Strawberry',
    url: 'https://eu.naak.com/en-eu/products/ultra-puree-200-apple-strawberry',
  },
  {
    category: 'solid',
    image: '/assets/sponsors/naak/ultra-waffle-salted-caramel-cutout.png',
    id: 'waffle',
    name: 'ULTRA Waffle 140 · Salted Caramel',
    url: 'https://eu.naak.com/collections/hiking/products/ultra-waffle-140-salted-caramel',
  },
  {
    category: 'liquid',
    image: '/assets/sponsors/naak/boost-drink-mix-neutral-cutout.png',
    id: 'drinkMix',
    name: 'BOOST Drink Mix 60 · Neutral',
    url: 'https://eu.naak.com/en-eu/products/boost-drink-mix-60-neutral-bag',
  },
];

const STRATEGY_ASSETS = {
  flask: '/assets/sponsors/naak/naak-flask.png',
  gel: '/assets/sponsors/naak/naak-gel.png',
  shaker: '/assets/sponsors/naak/naak-shaker.png',
} as const;

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 83 }, (_, index) => CURRENT_YEAR - 16 - index);

const INPUT_CLASS =
  'w-full rounded-xl border border-white/25 bg-white/[0.06] px-4 py-3 text-base text-white outline-none transition-colors placeholder:text-white/35 focus:border-[#fff200] focus:ring-2 focus:ring-[#fff200]/20';

function formatRaceTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return `${hours}:${String(remainingMinutes).padStart(2, '0')}`;
}

function createIntakes(totalMinutes: number): NutritionIntake[] {
  const intakes: NutritionIntake[] = [];

  for (let timeMinutes = 0, index = 0; timeMinutes < totalMinutes; timeMinutes += INTAKE_INTERVAL_MINUTES, index += 1) {
    intakes.push({ product: PRODUCTS[index % PRODUCTS.length], timeMinutes });
  }

  return intakes;
}

function getProfilePath(points: NaakElevationPoint[], width: number, height: number): string {
  if (points.length === 0) return '';

  const maxDistance = points.at(-1)?.[0] ?? 1;
  const elevations = points.map(([, elevation]) => elevation);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const elevationRange = Math.max(1, maxElevation - minElevation);
  const topPadding = 14;
  const chartHeight = height - topPadding - 10;

  const line = points
    .map(([distance, elevation], index) => {
      const x = (distance / maxDistance) * width;
      const y = topPadding + (1 - (elevation - minElevation) / elevationRange) * chartHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return `${line} L ${width} ${height} L 0 ${height} Z`;
}

function getInitialAnswers(): NutritionAnswers {
  return {
    raceId: '',
    expectedHours: '',
    expectedMinutes: '',
    performanceIndex: '',
    raceGoal: '',
    weather: '',
    fuelTypes: [],
    caffeine: '',
    restrictions: [],
    stomach: '',
    sweat: '',
    fullName: '',
    weight: '',
    weightUnit: 'kg',
    birthDay: '',
    birthMonth: '',
    birthYear: '',
    gender: '',
    country: '',
  };
}

function ChoiceButton({
  detail,
  label,
  onClick,
  selected,
}: ChoiceButtonProps) {
  return (
    <button
      type="button"
      className={`min-h-16 rounded-xl border px-4 py-3 text-left transition-[background-color,border-color,color,transform] duration-200 motion-reduce:transition-none ${
        selected
          ? 'border-[#fff200] bg-[#fff200] text-black shadow-[0_0_0_1px_#fff200]'
          : 'border-white/20 bg-white/[0.035] text-white hover:-translate-y-0.5 hover:border-[#fff200]/70 hover:bg-white/[0.07] motion-reduce:hover:translate-y-0'
      }`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="block text-sm font-semibold sm:text-base">{label}</span>
      {detail ? (
        <span
          className={`mt-1 block text-xs leading-4 ${selected ? 'text-black/65' : 'text-white/45'}`}
        >
          {detail}
        </span>
      ) : null}
    </button>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-[#fff200] text-black ${compact ? 'h-12 w-14' : 'h-14 w-16'}`}
    >
      <Image
        src="/assets/sponsors/naak/logo.svg"
        alt="Näak"
        width={106}
        height={82}
        className="h-auto w-11"
      />
    </span>
  );
}

function NutritionCalculatorMark() {
  return (
    <Image
      src="/assets/sponsors/naak/nutrition-calculator.svg"
      alt=""
      width={176}
      height={160}
      className="h-28 w-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)] sm:h-32"
    />
  );
}

export function NaakNutritionCard({
  eventName,
  races,
  className = '',
  initialResult,
}: NaakNutritionCardProps) {
  const t = useTranslations('event.naakNutrition');
  const locale = useLocale();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(Boolean(initialResult));
  const [step, setStep] = useState(initialResult ? RESULT_STEP : 0);
  const [answers, setAnswers] = useState<NutritionAnswers>(() => ({
    ...getInitialAnswers(),
    raceId: initialResult?.raceId ?? '',
    expectedHours: initialResult?.expectedHours ?? '',
    expectedMinutes: initialResult?.expectedMinutes ?? '',
  }));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState<ResultTab>('profile');

  const selectedRace = races.find((race) => race.id === answers.raceId);
  const totalMinutes = Math.max(
    1,
    Number(answers.expectedHours || 0) * 60 + Number(answers.expectedMinutes || 0),
  );
  const intakes = useMemo(() => createIntakes(totalMinutes), [totalMinutes]);
  const progress = step === RESULT_STEP ? 100 : ((step + 1) / FORM_STEP_COUNT) * 100;

  useEffect(() => {
    if (!isOpen) return;
    contentRef.current?.focus();
  }, [isOpen, step]);

  function updateAnswers(patch: Partial<NutritionAnswers>) {
    setAnswers((current) => ({ ...current, ...patch }));
    setValidationError(null);
  }

  function toggleFuelType(value: FuelType) {
    setAnswers((current) => ({
      ...current,
      fuelTypes: current.fuelTypes.includes(value)
        ? current.fuelTypes.filter((item) => item !== value)
        : [...current.fuelTypes, value],
    }));
    setValidationError(null);
  }

  function toggleRestriction(value: DietaryRestriction) {
    setAnswers((current) => {
      if (value === 'none') {
        return { ...current, restrictions: ['none'] };
      }

      const withoutNone = current.restrictions.filter((item) => item !== 'none');
      return {
        ...current,
        restrictions: withoutNone.includes(value)
          ? withoutNone.filter((item) => item !== value)
          : [...withoutNone, value],
      };
    });
    setValidationError(null);
  }

  function getStepError(): string | null {
    if (step === 0 && !answers.raceId) return t('errors.chooseOne');

    if (step === 1) {
      const hours = Number(answers.expectedHours);
      const minutes = Number(answers.expectedMinutes);
      if (
        !answers.expectedHours ||
        !answers.expectedMinutes ||
        !Number.isInteger(hours) ||
        !Number.isInteger(minutes) ||
        hours < 1 ||
        hours > 48 ||
        minutes < 0 ||
        minutes > 59
      ) {
        return t('errors.time');
      }
    }

    if (step === 2 && !answers.raceGoal) return t('errors.chooseOne');
    if (step === 3 && !answers.weather) return t('errors.chooseOne');
    if (step === 4 && answers.fuelTypes.length === 0) return t('errors.fuel');
    if (step === 5 && !answers.caffeine) return t('errors.chooseOne');
    if (step === 6 && answers.restrictions.length === 0) {
      return t('errors.restriction');
    }
    if (step === 7 && !answers.stomach) return t('errors.chooseOne');
    if (step === 8 && !answers.sweat) return t('errors.chooseOne');

    if (step === 9) {
      if (answers.fullName.trim().length < 2) return t('errors.name');
      const weight = Number(answers.weight);
      if (!answers.weight || !Number.isFinite(weight) || weight <= 0) {
        return t('errors.weight');
      }
      if (!answers.birthDay || !answers.birthMonth || !answers.birthYear) {
        return t('errors.birthdate');
      }
      if (!answers.gender) return t('errors.gender');
      if (!answers.country) return t('errors.country');
    }

    return null;
  }

  function continueFlow() {
    const error = getStepError();
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    setStep((current) => Math.min(current + 1, RESULT_STEP));
  }

  function goBack() {
    setValidationError(null);
    setStep((current) => Math.max(0, current - 1));
  }

  function resetFlow({ collapse = false }: { collapse?: boolean } = {}) {
    setAnswers(getInitialAnswers());
    setStep(0);
    setValidationError(null);
    setResultTab('profile');
    if (collapse) setIsOpen(false);
  }

  function renderStep() {
    if (step === 0) {
      return (
        <>
          <h3 className="text-2xl font-semibold tracking-tight sm:text-4xl">
            {t('distance.title')}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">
            {t('distance.description', { eventName })}
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {races.map((race) => (
              <ChoiceButton
                key={race.id}
                label={race.name}
                detail={t('distance.metrics', {
                  distance: new Intl.NumberFormat(locale, {
                    maximumFractionDigits: 1,
                  }).format(race.distanceKm),
                  elevation:
                    race.elevationGainM === null
                      ? '—'
                      : new Intl.NumberFormat(locale).format(race.elevationGainM),
                })}
                selected={answers.raceId === race.id}
                onClick={() => updateAnswers({ raceId: race.id })}
              />
            ))}
          </div>
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <h3 className="text-2xl font-semibold tracking-tight sm:text-4xl">
            {t('estimate.title')}
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/55 sm:text-base">
            {t('estimate.description')}
          </p>
          <div className="mt-7 grid gap-5 sm:grid-cols-[1fr_1fr_1.3fr]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                {t('estimate.hours')}
              </span>
              <input
                type="number"
                min="1"
                max="48"
                inputMode="numeric"
                className={INPUT_CLASS}
                value={answers.expectedHours}
                onChange={(event) => updateAnswers({ expectedHours: event.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                {t('estimate.minutes')}
              </span>
              <input
                type="number"
                min="0"
                max="59"
                inputMode="numeric"
                className={INPUT_CLASS}
                value={answers.expectedMinutes}
                onChange={(event) => updateAnswers({ expectedMinutes: event.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                {t('estimate.index')}{' '}
                <span className="normal-case tracking-normal text-white/30">
                  {t('estimate.optional')}
                </span>
              </span>
              <input
                type="number"
                min="0"
                max="1000"
                inputMode="numeric"
                className={INPUT_CLASS}
                value={answers.performanceIndex}
                onChange={(event) => updateAnswers({ performanceIndex: event.target.value })}
              />
            </label>
          </div>
        </>
      );
    }

    if (step === 2) {
      const choices: RaceGoal[] = ['compete', 'improve', 'finish'];
      return (
        <>
          <h3 className="text-2xl font-semibold tracking-tight sm:text-4xl">
            {t('goal.title')}
          </h3>
          <div className="mt-7 grid gap-3">
            {choices.map((choice) => (
              <ChoiceButton
                key={choice}
                label={t(`goal.options.${choice}`)}
                selected={answers.raceGoal === choice}
                onClick={() => updateAnswers({ raceGoal: choice })}
              />
            ))}
          </div>
        </>
      );
    }

    if (step === 3) {
      const choices: Weather[] = ['cold', 'mild', 'hot'];
      return (
        <>
          <h3 className="text-2xl font-semibold tracking-tight sm:text-4xl">
            {t('weather.title')}
          </h3>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {choices.map((choice) => (
              <ChoiceButton
                key={choice}
                label={t(`weather.options.${choice}.label`)}
                detail={t(`weather.options.${choice}.detail`)}
                selected={answers.weather === choice}
                onClick={() => updateAnswers({ weather: choice })}
              />
            ))}
          </div>
        </>
      );
    }

    if (step === 4) {
      const choices: FuelType[] = ['liquid', 'semiLiquid', 'solid'];
      return (
        <>
          <h3 className="text-2xl font-semibold tracking-tight sm:text-4xl">
            {t('fuel.title')}
          </h3>
          <p className="mt-2 text-sm text-white/50">{t('fuel.description')}</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {choices.map((choice) => (
              <ChoiceButton
                key={choice}
                label={t(`fuel.options.${choice}.label`)}
                detail={t(`fuel.options.${choice}.detail`)}
                selected={answers.fuelTypes.includes(choice)}
                onClick={() => toggleFuelType(choice)}
              />
            ))}
          </div>
        </>
      );
    }

    if (step === 5) {
      return (
        <>
          <h3 className="text-2xl font-semibold tracking-tight sm:text-4xl">
            {t('caffeine.title')}
          </h3>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {(['yes', 'no'] as const).map((choice) => (
              <ChoiceButton
                key={choice}
                label={t(`caffeine.options.${choice}`)}
                selected={answers.caffeine === choice}
                onClick={() => updateAnswers({ caffeine: choice })}
              />
            ))}
          </div>
        </>
      );
    }

    if (step === 6) {
      const choices: DietaryRestriction[] = ['glutenFree', 'nutFree', 'vegan', 'none'];
      return (
        <>
          <h3 className="text-2xl font-semibold tracking-tight sm:text-4xl">
            {t('restrictions.title')}
          </h3>
          <p className="mt-2 text-sm text-white/50">{t('restrictions.description')}</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {choices.map((choice) => (
              <ChoiceButton
                key={choice}
                label={t(`restrictions.options.${choice}`)}
                selected={answers.restrictions.includes(choice)}
                onClick={() => toggleRestriction(choice)}
              />
            ))}
          </div>
        </>
      );
    }

    if (step === 7) {
      const choices: StomachSensitivity[] = ['anything', 'occasional', 'frequent'];
      return (
        <>
          <h3 className="text-2xl font-semibold tracking-tight sm:text-4xl">
            {t('stomach.title')}
          </h3>
          <div className="mt-7 grid gap-3">
            {choices.map((choice) => (
              <ChoiceButton
                key={choice}
                label={t(`stomach.options.${choice}`)}
                selected={answers.stomach === choice}
                onClick={() => updateAnswers({ stomach: choice })}
              />
            ))}
          </div>
        </>
      );
    }

    if (step === 8) {
      const choices: SweatRate[] = ['low', 'moderate', 'high'];
      return (
        <>
          <h3 className="text-2xl font-semibold tracking-tight sm:text-4xl">
            {t('sweat.title')}
          </h3>
          <div className="mt-7 grid gap-3">
            {choices.map((choice) => (
              <ChoiceButton
                key={choice}
                label={t(`sweat.options.${choice}`)}
                selected={answers.sweat === choice}
                onClick={() => updateAnswers({ sweat: choice })}
              />
            ))}
          </div>
        </>
      );
    }

    if (step === 9) {
      return (
        <>
          <h3 className="text-2xl font-semibold tracking-tight sm:text-4xl">
            {t('profile.title')}
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/55 sm:text-base">
            {t('profile.description')}
          </p>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-2 block text-sm text-white/60">{t('profile.name')}</span>
              <input
                type="text"
                autoComplete="off"
                className={INPUT_CLASS}
                value={answers.fullName}
                onChange={(event) => updateAnswers({ fullName: event.target.value })}
              />
            </label>

            <div>
              <span className="mb-2 block text-sm text-white/60">{t('profile.weight')}</span>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  aria-label={t('profile.weight')}
                  type="number"
                  min="1"
                  inputMode="decimal"
                  className={INPUT_CLASS}
                  value={answers.weight}
                  onChange={(event) => updateAnswers({ weight: event.target.value })}
                />
                <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-white/25">
                  {(['kg', 'lb'] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      className={`px-3 text-sm font-semibold uppercase transition-colors ${
                        answers.weightUnit === unit
                          ? 'bg-[#fff200] text-black'
                          : 'bg-white/[0.06] text-white/60'
                      }`}
                      aria-pressed={answers.weightUnit === unit}
                      onClick={() => updateAnswers({ weightUnit: unit })}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label>
              <span className="mb-2 block text-sm text-white/60">{t('profile.gender')}</span>
              <select
                className={INPUT_CLASS}
                value={answers.gender}
                onChange={(event) => updateAnswers({ gender: event.target.value })}
              >
                <option value="" className="text-black">{t('profile.select')}</option>
                <option value="woman" className="text-black">{t('profile.genders.woman')}</option>
                <option value="man" className="text-black">{t('profile.genders.man')}</option>
                <option value="nonBinary" className="text-black">{t('profile.genders.nonBinary')}</option>
                <option value="preferNot" className="text-black">{t('profile.genders.preferNot')}</option>
              </select>
            </label>

            <div className="sm:col-span-2">
              <span className="mb-2 block text-sm text-white/60">{t('profile.birthdate')}</span>
              <div className="grid grid-cols-3 gap-2">
                <select
                  aria-label={t('profile.day')}
                  className={INPUT_CLASS}
                  value={answers.birthDay}
                  onChange={(event) => updateAnswers({ birthDay: event.target.value })}
                >
                  <option value="" className="text-black">{t('profile.day')}</option>
                  {DAYS.map((day) => <option key={day} value={day} className="text-black">{day}</option>)}
                </select>
                <select
                  aria-label={t('profile.month')}
                  className={INPUT_CLASS}
                  value={answers.birthMonth}
                  onChange={(event) => updateAnswers({ birthMonth: event.target.value })}
                >
                  <option value="" className="text-black">{t('profile.month')}</option>
                  {MONTHS.map((month) => <option key={month} value={month} className="text-black">{month}</option>)}
                </select>
                <select
                  aria-label={t('profile.year')}
                  className={INPUT_CLASS}
                  value={answers.birthYear}
                  onChange={(event) => updateAnswers({ birthYear: event.target.value })}
                >
                  <option value="" className="text-black">{t('profile.year')}</option>
                  {YEARS.map((year) => <option key={year} value={year} className="text-black">{year}</option>)}
                </select>
              </div>
            </div>

            <label className="sm:col-span-2">
              <span className="mb-2 block text-sm text-white/60">{t('profile.country')}</span>
              <select
                className={INPUT_CLASS}
                value={answers.country}
                onChange={(event) => updateAnswers({ country: event.target.value })}
              >
                <option value="" className="text-black">{t('profile.select')}</option>
                {(['spain', 'france', 'andorra', 'portugal', 'other'] as const).map((country) => (
                  <option key={country} value={country} className="text-black">
                    {t(`profile.countries.${country}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      );
    }

    return renderResult();
  }

  function renderResult() {
    if (!selectedRace) return null;

    const course = selectedRace.course;
    const totalHours = totalMinutes / 60;
    const timelineWidth = Math.max(980, intakes.length * 104 + 220);
    const profileDistanceKm = course?.points.at(-1)?.[0] ?? selectedRace.distanceKm;
    const targetDefinitions = [
      { icon: Cookie, rate: 45, unit: 'g', label: t('result.targets.carbs'), totalLabel: t('result.targetsTotals.carbs') },
      { icon: Flame, rate: 236, unit: 'kcal', label: t('result.targets.calories'), totalLabel: t('result.targetsTotals.calories') },
      { icon: Droplets, rate: 700, unit: 'ml', label: t('result.targets.water'), totalLabel: t('result.targetsTotals.water') },
      { icon: Zap, rate: 700, unit: 'mg', label: t('result.targets.sodium'), totalLabel: t('result.targetsTotals.sodium') },
    ];
    const targets = [
      ...targetDefinitions.map((target) => ({
        ...target,
        total: Math.round(target.rate * totalHours),
      })),
    ];

    const activeTabIndex = (['timeline', 'profile', 'table'] as ResultTab[]).indexOf(resultTab);
    const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      const tabs: ResultTab[] = ['timeline', 'profile', 'table'];
      let nextIndex = activeTabIndex;

      if (event.key === 'ArrowRight') nextIndex = (activeTabIndex + 1) % tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (activeTabIndex - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex === activeTabIndex) return;

      event.preventDefault();
      setResultTab(tabs[nextIndex]);
      document.getElementById(`naak-result-tab-${tabs[nextIndex]}`)?.focus();
    };

    const scrollTimeline = (direction: 'backward' | 'forward') => {
      document
        .getElementById('naak-result-scroll')
        ?.scrollBy({ left: direction === 'forward' ? 640 : -640, behavior: 'smooth' });
    };

    const renderIntakeMarker = (intake: NutritionIntake, variant: 'timeline' | 'profile') => {
      const left =
        variant === 'timeline'
          ? intake.timeMinutes === 0
            ? 4
            : 10 + (intake.timeMinutes / totalMinutes) * 82
          : 10 + (intake.timeMinutes / totalMinutes) * 82;
      const laneTop =
        intake.product.category === 'liquid'
          ? 24
          : intake.product.category === 'semiLiquid'
            ? 98
            : 172;
      const baselineTop = 240;

      return (
        <div
          key={`${intake.product.id}-${intake.timeMinutes}`}
          className="absolute z-20 w-16 -translate-x-1/2 text-center"
          style={{ left: `${left}%`, top: `${laneTop}px` }}
          title={`${formatRaceTime(intake.timeMinutes)} · ${intake.product.name}`}
        >
          <div className="relative mx-auto h-10 w-10">
            <Image
              src={intake.product.image}
              alt={intake.product.name}
              fill
              sizes="40px"
              className="object-contain"
            />
          </div>
          {variant === 'timeline' ? (
            <>
              <span
                className="mx-auto mt-1 block w-px bg-black"
                style={{ height: `${baselineTop - laneTop - 44}px` }}
                aria-hidden="true"
              />
              <span
                className="absolute left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black"
                style={{ top: `${baselineTop - laneTop}px` }}
                aria-hidden="true"
              />
              {intake.timeMinutes > 0 && (
                <p
                  className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold tabular-nums text-black"
                  style={{ top: `${baselineTop - laneTop + 14}px` }}
                >
                  {formatRaceTime(intake.timeMinutes)}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="mt-1 text-[11px] font-bold tabular-nums text-black">
                {formatRaceTime(intake.timeMinutes)}
              </p>
              <span className="mx-auto mt-1 block h-10 w-px bg-black" aria-hidden="true" />
            </>
          )}
        </div>
      );
    };

    const renderCourseProfile = () => {
      if (!course) {
        return <p className="p-6 text-sm text-black/55">{t('result.profileUnavailable')}</p>;
      }

      const chartHeight = 216;
      const profilePath = getProfilePath(course.points, timelineWidth, chartHeight);

      return (
        <>
          <svg
            aria-label={t('result.profileChartLabel')}
            className="absolute left-0 top-[202px] z-0 h-[216px]"
            role="img"
            style={{ width: `${timelineWidth}px` }}
            viewBox={`0 0 ${timelineWidth} ${chartHeight}`}
            preserveAspectRatio="none"
          >
            {[0.25, 0.5, 0.75].map((ratio) => (
              <line
                key={ratio}
                x1="0"
                x2={timelineWidth}
                y1={ratio * chartHeight}
                y2={ratio * chartHeight}
                stroke="rgba(15,23,42,0.14)"
                strokeDasharray="4 5"
              />
            ))}
            <path d={profilePath} fill="#101010" />
          </svg>
          <div className="absolute left-0 top-[418px] z-10 h-7 bg-[#fff200]" style={{ width: `${timelineWidth}px` }} />
          <div className="absolute left-0 top-[418px] z-20 flex h-7 w-full">
            {course.checkpoints.map((checkpoint) => (
              <span
                key={checkpoint.name}
                className="absolute h-7 border-l border-black/60"
                style={{ left: `${(checkpoint.distanceKm / profileDistanceKm) * 100}%` }}
              />
            ))}
          </div>
          <div className="absolute left-0 top-[452px] h-16" style={{ width: `${timelineWidth}px` }}>
            <p className="absolute top-0 text-xs font-bold text-black" style={{ left: 0 }}>
              {course.start}
            </p>
            {course.checkpoints.map((checkpoint) => (
              <div
                key={checkpoint.name}
                className="absolute top-0 -translate-x-1/2 text-center"
                style={{ left: `${(checkpoint.distanceKm / profileDistanceKm) * 100}%` }}
              >
                <span className="inline-block bg-[#ff617d] px-1.5 py-1 text-[10px] font-bold text-white">
                  {new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(checkpoint.distanceKm)} km
                </span>
                <p className="mt-1 whitespace-nowrap text-xs font-bold text-black">{checkpoint.name}</p>
              </div>
            ))}
            <p className="absolute right-0 top-0 text-right text-xs font-bold text-black">{course.finish}</p>
          </div>
        </>
      );
    };

    const renderTimeline = () => (
      <div className="relative h-[300px]" style={{ width: `${timelineWidth}px` }}>
        {(['liquid', 'semiLiquid', 'solid'] as FuelType[]).map((category, index) => (
          <div
            key={category}
            className="absolute left-0 right-0 border-t border-dashed border-black/15"
            style={{ top: `${index * 74 + 55}px` }}
          >
            <span className="absolute left-0 -top-3 bg-white pr-2 text-[10px] font-bold uppercase tracking-wide text-black/65">
              {t(`fuel.options.${category}.label`)}
            </span>
          </div>
        ))}
        <div className="absolute h-2 bg-[#fff200]" style={{ left: '4%', right: '6%', top: '236px' }} />
        <div className="absolute z-30 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-white text-center text-[10px] font-bold leading-[2.5rem]" style={{ left: '4%', top: '240px' }}>
          {t('result.timeline.start')}
        </div>
        <div className="absolute size-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-white text-center text-[10px] font-bold leading-[2.5rem]" style={{ left: '94%', top: '240px' }}>
          {t('result.timeline.finish')}
        </div>
        {intakes.map((intake) => renderIntakeMarker(intake, 'timeline'))}
      </div>
    );

    return (
      <div className="-mx-5 -my-7 bg-white text-black sm:-mx-8 sm:-my-9">
        <div className="px-5 py-8 sm:px-9 sm:py-11">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/45">
          {t('result.planFor')}
        </p>
        <h3 className="mt-2 max-w-4xl text-3xl font-semibold tracking-tight sm:text-5xl">
          {eventName} · {selectedRace.name}
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-black/55 sm:text-base">
          {t('result.description', { eventName })}
        </p>

        <div className="mt-7 grid gap-3 border-y border-black/10 py-4 sm:grid-cols-3 sm:py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/40">
              {t('result.distance')}
            </p>
            <p className="mt-1 text-xl font-semibold">
              {new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(selectedRace.distanceKm)} km
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/40">
              {t('result.elevation')}
            </p>
            <p className="mt-1 text-xl font-semibold">
              {selectedRace.elevationGainM === null
                ? '—'
                : `${new Intl.NumberFormat(locale).format(selectedRace.elevationGainM)} m`}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/40">
              {t('result.time')}
            </p>
            <p className="mt-1 text-xl font-semibold">
              {t('result.timeValue', {
                hours: answers.expectedHours,
                minutes: answers.expectedMinutes.padStart(2, '0'),
              })}
            </p>
          </div>
        </div>

        <h4 className="mt-8 text-sm font-bold uppercase tracking-[0.14em]">
          {t('result.targetsTitle')}
        </h4>
        <div className="group/targets mt-3 grid grid-cols-2 gap-1 sm:grid-cols-4">
          {targets.map(({ icon: Icon, label, rate, total, totalLabel, unit }) => (
            <div key={label} className="relative h-28 overflow-hidden bg-[#fff200] p-4 sm:p-5">
              <div className="absolute inset-x-4 top-4 transition-transform duration-300 ease-out group-hover/targets:-translate-y-28 motion-reduce:transition-none sm:inset-x-5 sm:top-5">
                <Icon className="size-5" strokeWidth={2.2} aria-hidden="true" />
                <p className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">{rate}{unit}</p>
                <p className="mt-1 text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-black/65">
                  {label}
                </p>
              </div>
              <div className="absolute inset-x-4 top-4 translate-y-28 transition-transform duration-300 ease-out group-hover/targets:translate-y-0 motion-reduce:transition-none sm:inset-x-5 sm:top-5">
                <Icon className="size-5" strokeWidth={2.2} aria-hidden="true" />
                <p className="mt-3 text-xl font-bold tracking-tight tabular-nums sm:text-2xl">{total}{unit}</p>
                <p className="mt-1 text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-black/65">
                  {totalLabel}
                </p>
              </div>
              <span className="sr-only">{t('result.total', { value: total, unit })}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <div role="tablist" aria-label={t('result.views.label')} className="inline-flex rounded-full bg-[#f1f1f1] p-1">
            {(['timeline', 'profile', 'table'] as ResultTab[]).map((tab) => (
              <button
                key={tab}
                id={`naak-result-tab-${tab}`}
                type="button"
                role="tab"
                aria-selected={resultTab === tab}
                aria-controls={`naak-result-panel-${tab}`}
                tabIndex={resultTab === tab ? 0 : -1}
                onClick={() => setResultTab(tab)}
                onKeyDown={onTabKeyDown}
                className={`rounded-full px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors sm:px-5 ${
                  resultTab === tab ? 'bg-black text-[#fff200]' : 'text-black/60 hover:text-black'
                }`}
              >
                {t(`result.views.${tab}`)}
              </button>
            ))}
          </div>
        </div>

        {resultTab === 'table' ? (
          <div id="naak-result-panel-table" role="tabpanel" aria-labelledby="naak-result-tab-table" className="mt-7 overflow-x-auto rounded-2xl border border-black/10">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead className="bg-[#f3f3f3] text-xs font-bold uppercase tracking-[0.12em] text-black/55">
                <tr>
                  <th className="px-4 py-3">{t('result.table.time')}</th>
                  <th className="px-4 py-3">{t('result.table.segment')}</th>
                  <th className="px-4 py-3">{t('result.table.product')}</th>
                  <th className="px-4 py-3">{t('result.table.format')}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...intakes.map((intake) => ({
                    kind: 'intake' as const,
                    at: intake.timeMinutes,
                    intake,
                  })),
                  ...(course?.checkpoints.map((checkpoint) => ({
                    kind: 'checkpoint' as const,
                    at: Math.round((checkpoint.distanceKm / profileDistanceKm) * totalMinutes),
                    checkpoint,
                  })) ?? []),
                ]
                  .sort((a, b) => a.at - b.at)
                  .map((row, index) => (
                    <tr key={`${row.kind}-${row.at}-${index}`} className="border-t border-black/10">
                      <td className="px-4 py-3 font-bold tabular-nums">{formatRaceTime(row.at)}</td>
                      {row.kind === 'checkpoint' ? (
                        <>
                          <td className="px-4 py-3 font-semibold">{row.checkpoint.name}</td>
                          <td className="px-4 py-3 text-black/55">{t('result.table.checkpoint')}</td>
                          <td className="px-4 py-3 text-black/55">—</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3">{t('result.table.race')}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-3">
                              <div className="relative size-10 shrink-0">
                                <Image
                                  src={row.intake.product.image}
                                  alt={row.intake.product.name}
                                  fill
                                  sizes="40px"
                                  className="object-contain"
                                />
                              </div>
                              <span className="font-semibold">{row.intake.product.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-black/55">{t(`fuel.options.${row.intake.product.category}.label`)}</td>
                        </>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            id={`naak-result-panel-${resultTab}`}
            role="tabpanel"
            aria-labelledby={`naak-result-tab-${resultTab}`}
            className="relative mt-7"
          >
            <button
              type="button"
              aria-label={t('result.scrollBack')}
              onClick={() => scrollTimeline('backward')}
              className="absolute left-2 top-1/2 z-30 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={t('result.scrollForward')}
              onClick={() => scrollTimeline('forward')}
              className="absolute right-2 top-1/2 z-30 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
            <div id="naak-result-scroll" className="overflow-x-auto scroll-smooth pb-3">
              {resultTab === 'timeline' ? renderTimeline() : (
                <div className="relative h-[520px]" style={{ width: `${timelineWidth}px` }}>
                  <div className="absolute inset-x-0 top-0 h-[202px] bg-[#fafafa]" />
                  {(['liquid', 'semiLiquid', 'solid'] as FuelType[]).map((category, index) => (
                    <div
                      key={category}
                      className="absolute inset-x-0 border-t border-dashed border-black/15"
                      style={{ top: `${index * 74 + 55}px` }}
                    >
                      <span className="absolute left-3 -top-3 bg-white px-1.5 text-[10px] font-bold uppercase tracking-wide text-black/65">
                        {t(`fuel.options.${category}.label`)}
                      </span>
                    </div>
                  ))}
                  {intakes.map((intake) => renderIntakeMarker(intake, 'profile'))}
                  {renderCourseProfile()}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl bg-[#f2f2f2] p-5">
            <h4 className="text-sm font-bold uppercase tracking-[0.08em]">{t('result.preRace.title')}</h4>
            <div className="mt-4 space-y-3 border-t border-black/10 pt-4">
              {[
                { emoji: '🍚', key: 'meal' },
                { image: STRATEGY_ASSETS.flask, key: 'drink' },
                { image: STRATEGY_ASSETS.gel, key: 'gel' },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-3">
                  <div className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
                    {'emoji' in item ? (
                      <span aria-hidden="true">{item.emoji}</span>
                    ) : (
                      <Image src={item.image} alt="" fill sizes="36px" className="object-contain p-1" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{t(`result.preRace.items.${item.key}.name`)}</p>
                    <p className="text-xs text-black/55">{t(`result.preRace.items.${item.key}.description`)}</p>
                  </div>
                  <span className="bg-[#fff200] px-2 py-1 text-xs font-bold tabular-nums">{t(`result.preRace.items.${item.key}.time`)}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl bg-[#f2f2f2] p-5">
            <h4 className="text-sm font-bold uppercase tracking-[0.08em]">{t('result.postRace.title')}</h4>
            <div className="mt-4 space-y-3 border-t border-black/10 pt-4">
              {[
                { image: STRATEGY_ASSETS.shaker, key: 'shake' },
                { emoji: '🍲', key: 'meal' },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-3">
                  <div className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
                    {'emoji' in item ? (
                      <span aria-hidden="true">{item.emoji}</span>
                    ) : (
                      <Image src={item.image} alt="" fill sizes="36px" className="object-contain p-1" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{t(`result.postRace.items.${item.key}.name`)}</p>
                    <p className="text-xs text-black/55">{t(`result.postRace.items.${item.key}.description`)}</p>
                  </div>
                  <span className="bg-[#fff200] px-2 py-1 text-xs font-bold tabular-nums">{t(`result.postRace.items.${item.key}.time`)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-2xl bg-[#f2f2f2] p-5 sm:p-7">
          <h4 className="text-xl font-semibold tracking-tight">{t('result.summaryTitle')}</h4>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {PRODUCTS.map((product) => {
              const count = intakes.filter((intake) => intake.product.id === product.id).length;
              return (
                <a
                  key={product.id}
                  href={product.url}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-black/5 transition-shadow hover:shadow-md"
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-[#f6f5f1]">
                    <Image src={product.image} alt={product.name} fill sizes="56px" className="object-contain p-1" />
                  </div>
                  <p className="min-w-0 flex-1 text-sm font-semibold leading-5">{product.name}</p>
                  <span className="text-sm font-bold tabular-nums">×{count}</span>
                  <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </section>

        <button
          type="button"
          className="mt-7 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold transition-colors hover:border-black/35 hover:bg-black hover:text-white"
          onClick={() => resetFlow()}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t('result.restart')}
        </button>
        </div>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <aside className={`w-full min-w-0 ${className}`}>
        <button
          type="button"
          data-testid="naak-nutrition-card-trigger"
          className="group relative block min-h-64 w-full overflow-hidden rounded-[1.35rem] bg-[#050505] px-5 py-7 text-left text-white shadow-[0_18px_50px_-30px_rgba(0,0,0,0.7)] transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:min-h-72 sm:px-10 sm:py-8"
          onClick={() => setIsOpen(true)}
        >
          <span
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_56%_115%_at_53%_40%,rgba(255,242,0,0.38)_0%,rgba(211,210,182,0.3)_18%,rgba(104,104,97,0.38)_42%,rgba(28,28,28,0.62)_64%,transparent_83%),linear-gradient(90deg,#000_0%,#050505_100%)]"
            aria-hidden="true"
          />
          <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
            <NutritionCalculatorMark />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex justify-center sm:justify-start">
                <span className="inline-flex h-8 w-11 items-center justify-center rounded-md bg-[#fff200] px-1.5 shadow-[0_6px_16px_rgba(0,0,0,0.24)]">
                  <Image
                    src="/assets/sponsors/naak/logo.svg"
                    alt=""
                    width={106}
                    height={82}
                    className="h-auto w-8"
                  />
                </span>
              </div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {t('intro.productName')}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/65 sm:mx-0 sm:text-base">
                {t('intro.description', { eventName })}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#fff200] px-5 py-3 text-sm font-bold text-black">
                {t('intro.cta')}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              </span>
            </div>
          </div>
        </button>
      </aside>
    );
  }

  return (
    <aside className={`w-full min-w-0 ${className}`} data-testid="naak-nutrition-card">
      <div
        className={
          step === RESULT_STEP
            ? 'bg-white text-black'
            : 'overflow-hidden rounded-[1.35rem] bg-[#050505] text-white shadow-[0_24px_70px_-36px_rgba(0,0,0,0.85)]'
        }
      >
        {step < RESULT_STEP ? <header className="border-b border-white/10 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <BrandMark compact />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white/75">{eventName}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#fff200]">
                {t('sponsored')}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white/55 transition-colors hover:border-white/35 hover:text-white"
              onClick={() => resetFlow({ collapse: true })}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t('reset')}</span>
            </button>
          </div>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#fff200] transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header> : null}

        <div
          ref={contentRef}
          tabIndex={-1}
          className={`${step === RESULT_STEP ? '' : 'min-h-[390px] px-5 py-7 sm:min-h-[430px] sm:px-8 sm:py-9'} outline-none`}
        >
          {renderStep()}
        </div>

        {step < RESULT_STEP ? (
          <footer className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4 sm:px-8">
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                step === 0 ? 'pointer-events-none opacity-0' : 'text-white/55 hover:text-white'
              }`}
              tabIndex={step === 0 ? -1 : 0}
              onClick={goBack}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              {t('back')}
            </button>
            <div className="flex min-w-0 flex-1 flex-col items-end gap-2">
              {validationError ? (
                <FormErrorMessage message={validationError} />
              ) : null}
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-[#fff200] px-5 py-3 text-sm font-bold text-black transition-transform hover:scale-[1.02] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:scale-100"
                onClick={continueFlow}
              >
                {step === FORM_STEP_COUNT - 1 ? t('showPlan') : t('continue')}
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </footer>
        ) : null}
      </div>
    </aside>
  );
}
