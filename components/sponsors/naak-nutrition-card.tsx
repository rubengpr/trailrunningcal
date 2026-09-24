'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ArrowRight,
  ChevronLeft,
  Clock3,
  Cookie,
  Droplets,
  Flame,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { FormErrorMessage } from '@/components/ui/error-message';

export interface NaakRaceOption {
  id: string;
  name: string;
  distanceKm: number;
  elevationGainM: number | null;
}

interface NaakNutritionCardProps {
  eventName: string;
  races: NaakRaceOption[];
  className?: string;
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

interface ProductRecommendation {
  image: string;
  name: string;
  timingKey: 'beforeStart' | 'start' | 'fortyMinutes' | 'eightyMinutes';
  url: string;
}

const FORM_STEP_COUNT = 10;
const RESULT_STEP = FORM_STEP_COUNT;

const PRODUCTS: ProductRecommendation[] = [
  {
    image: '/assets/sponsors/naak/boost-drink-mix-neutral.jpg',
    name: 'BOOST Drink Mix 60 · Neutral',
    timingKey: 'beforeStart',
    url: 'https://eu.naak.com/en-eu/products/boost-drink-mix-60-neutral-bag',
  },
  {
    image: '/assets/sponsors/naak/ultra-gel-salted-maple.jpg',
    name: 'ULTRA Gel 200 · Salted Maple',
    timingKey: 'start',
    url: 'https://eu.naak.com/products/ultra-gel-200-salted-maple',
  },
  {
    image: '/assets/sponsors/naak/ultra-puree-apple-strawberry.jpg',
    name: 'ULTRA Puree 200 · Apple Strawberry',
    timingKey: 'fortyMinutes',
    url: 'https://eu.naak.com/en-eu/products/ultra-puree-200-apple-strawberry',
  },
  {
    image: '/assets/sponsors/naak/ultra-waffle-salted-caramel.jpg',
    name: 'ULTRA Waffle 140 · Salted Caramel',
    timingKey: 'eightyMinutes',
    url: 'https://eu.naak.com/collections/hiking/products/ultra-waffle-140-salted-caramel',
  },
];

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 83 }, (_, index) => CURRENT_YEAR - 16 - index);

const INPUT_CLASS =
  'w-full rounded-xl border border-white/25 bg-white/[0.06] px-4 py-3 text-base text-white outline-none transition-colors placeholder:text-white/35 focus:border-[#fff200] focus:ring-2 focus:ring-[#fff200]/20';

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

export function NaakNutritionCard({
  eventName,
  races,
  className = '',
}: NaakNutritionCardProps) {
  const t = useTranslations('event.naakNutrition');
  const locale = useLocale();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<NutritionAnswers>(getInitialAnswers);
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedRace = races.find((race) => race.id === answers.raceId);
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

    const targets = [
      { icon: Cookie, value: '45 g', label: t('result.targets.carbs') },
      { icon: Flame, value: '236 kcal', label: t('result.targets.calories') },
      { icon: Droplets, value: '700 ml', label: t('result.targets.water') },
      { icon: Zap, value: '700 mg', label: t('result.targets.sodium') },
    ];

    return (
      <div className="-mx-5 -my-7 rounded-b-[1.35rem] bg-[#f6f5f1] px-5 py-7 text-black sm:-mx-8 sm:-my-9 sm:px-8 sm:py-9">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/45">
          {t('result.eyebrow')}
        </p>
        <h3 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
          {t('result.title', { name: answers.fullName.trim() })}
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-black/55 sm:text-base">
          {t('result.description', { eventName })}
        </p>

        <div className="mt-7 grid gap-3 rounded-2xl border border-black/10 bg-white p-4 sm:grid-cols-3 sm:p-5">
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
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {targets.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl bg-[#fff200] p-4 sm:p-5">
              <Icon className="size-5" strokeWidth={2.2} aria-hidden="true" />
              <p className="mt-5 text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-black/65">
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-9 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/40">
              {t('result.rotationEyebrow')}
            </p>
            <h4 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {t('result.rotationTitle')}
            </h4>
          </div>
          <Clock3 className="hidden size-7 text-black/25 sm:block" aria-hidden="true" />
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="absolute left-[12.5%] right-[12.5%] top-5 hidden h-px bg-black/15 sm:block" />
          {PRODUCTS.map((product) => (
            <article key={product.name} className="relative rounded-2xl border border-black/10 bg-white p-3 shadow-sm">
              <span className="relative z-10 inline-flex rounded-full bg-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                {t(`result.timeline.${product.timingKey}`)}
              </span>
              <div className="relative mt-3 aspect-square overflow-hidden rounded-xl bg-[#f3f1ea]">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(min-width: 640px) 190px, 45vw"
                  className="object-contain p-2"
                />
              </div>
              <h5 className="mt-3 min-h-10 text-sm font-semibold leading-5">{product.name}</h5>
              <a
                href={product.url}
                target="_blank"
                rel="sponsored noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold underline decoration-black/25 underline-offset-4 transition-colors hover:decoration-black"
              >
                {t('result.viewProduct')}
                <ArrowRight className="size-3.5 -rotate-45" aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>

        <button
          type="button"
          className="mt-7 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold transition-colors hover:border-black/35 hover:bg-black hover:text-white"
          onClick={() => resetFlow()}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t('result.restart')}
        </button>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <aside className={`w-full min-w-0 ${className}`}>
        <button
          type="button"
          data-testid="naak-nutrition-card-trigger"
          className="group relative block w-full overflow-hidden rounded-[1.35rem] bg-[#050505] px-5 py-5 text-left text-white shadow-[0_18px_50px_-30px_rgba(0,0,0,0.7)] transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:px-7 sm:py-6"
          onClick={() => setIsOpen(true)}
        >
          <svg
            viewBox="0 0 620 180"
            className="pointer-events-none absolute -right-8 -top-7 h-[155%] w-2/3 text-[#fff200]/20"
            fill="none"
            aria-hidden="true"
          >
            <path d="M8 147 114 70l72 34 82-79 66 62 68-35 92 73 118-94" stroke="currentColor" strokeWidth="2" />
            <path d="M0 166 104 92l76 33 88-75 64 58 72-34 91 69 125-91" stroke="currentColor" strokeWidth="1" />
          </svg>
          <div className="relative flex items-center gap-4 sm:gap-6">
            <BrandMark />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#fff200]">
                {t('intro.eyebrow')}
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                {t('intro.title')}
              </h2>
              <p className="mt-1 hidden max-w-2xl text-sm leading-5 text-white/55 sm:block">
                {t('intro.description', { eventName })}
              </p>
            </div>
            <span className="relative hidden shrink-0 items-center gap-2 rounded-full bg-[#fff200] px-5 py-3 text-sm font-bold text-black sm:inline-flex">
              {t('intro.cta')}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
            </span>
            <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-[#fff200] text-black sm:hidden">
              <ArrowRight className="size-4" aria-hidden="true" />
            </span>
          </div>
        </button>
      </aside>
    );
  }

  return (
    <aside className={`w-full min-w-0 ${className}`} data-testid="naak-nutrition-card">
      <div className="overflow-hidden rounded-[1.35rem] bg-[#050505] text-white shadow-[0_24px_70px_-36px_rgba(0,0,0,0.85)]">
        <header className="border-b border-white/10 px-5 py-4 sm:px-8">
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
          <p className="mt-2 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
            {step === RESULT_STEP
              ? t('complete')
              : t('progress', { current: step + 1, total: FORM_STEP_COUNT })}
          </p>
        </header>

        <div
          ref={contentRef}
          tabIndex={-1}
          className="min-h-[390px] px-5 py-7 outline-none sm:min-h-[430px] sm:px-8 sm:py-9"
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
