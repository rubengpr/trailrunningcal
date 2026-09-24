// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import es from '@/locales/es/translation.json';
import { getMallorcaNaakCourse } from '@/lib/sponsors/naak-mallorca-profiles';
import { NaakNutritionCard, type NaakRaceOption } from './naak-nutrition-card';

const RACES: NaakRaceOption[] = [
  { id: '138', name: 'Serra de Tramuntana', distanceKm: 138, elevationGainM: 5350, course: getMallorcaNaakCourse(138) },
  { id: '104', name: 'Camins de Pedra en Sec', distanceKm: 104, elevationGainM: 3740, course: getMallorcaNaakCourse(104) },
  { id: '56', name: 'Els Tres Mils', distanceKm: 56, elevationGainM: 2450, course: getMallorcaNaakCourse(56) },
  { id: '26', name: 'Camins de s’Arxiduc', distanceKm: 26, elevationGainM: 1000, course: getMallorcaNaakCourse(26) },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderCard() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <NaakNutritionCard eventName="Mallorca by UTMB®" races={RACES} />
    </NextIntlClientProvider>,
  );
}

function openCard() {
  fireEvent.click(screen.getByTestId('naak-nutrition-card-trigger'));
}

function continueFlow() {
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
}

function reachRestrictionsStep() {
  openCard();
  fireEvent.click(screen.getByRole('button', { name: /Serra de Tramuntana/ }));
  continueFlow();
  fireEvent.change(screen.getByLabelText('Horas'), { target: { value: '21' } });
  fireEvent.change(screen.getByLabelText('Minutos'), { target: { value: '22' } });
  continueFlow();
  fireEvent.click(screen.getByRole('button', { name: 'Quiero competir' }));
  continueFlow();
  fireEvent.click(screen.getByRole('button', { name: /Templado/ }));
  continueFlow();
  fireEvent.click(screen.getByRole('button', { name: /Líquido/ }));
  continueFlow();
  fireEvent.click(screen.getByRole('button', { name: 'No' }));
  continueFlow();
}

function completeFlow() {
  reachRestrictionsStep();
  fireEvent.click(screen.getByRole('button', { name: 'Sin restricciones' }));
  continueFlow();
  fireEvent.click(screen.getByRole('button', { name: 'Puedo comer cualquier cosa' }));
  continueFlow();
  fireEvent.click(screen.getByRole('button', { name: 'Sudo moderadamente' }));
  continueFlow();

  fireEvent.change(screen.getByLabelText('Nombre completo'), {
    target: { value: 'Ana' },
  });
  fireEvent.change(screen.getByLabelText('Peso'), { target: { value: '55' } });
  fireEvent.change(screen.getByLabelText('Género'), { target: { value: 'woman' } });
  fireEvent.change(screen.getByLabelText('Día'), { target: { value: '12' } });
  fireEvent.change(screen.getByLabelText('Mes'), { target: { value: '5' } });
  fireEvent.change(screen.getByLabelText('Año'), { target: { value: '1990' } });
  fireEvent.change(screen.getByLabelText('País'), { target: { value: 'spain' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ver mi plan' }));
}

describe('NaakNutritionCard', () => {
  it('opens and shows the four supplied Mallorca distances', () => {
    renderCard();

    expect(screen.queryByText('¿Qué distancia vas a correr?')).toBeNull();
    openCard();

    expect(screen.getByText('¿Qué distancia vas a correr?')).not.toBeNull();
    for (const race of RACES) {
      expect(screen.getByRole('button', { name: new RegExp(race.name) })).not.toBeNull();
    }
  });

  it('blocks incomplete steps with a translated validation message', () => {
    renderCard();
    openCard();
    continueFlow();

    expect(screen.getByText('Selecciona una opción para continuar.')).not.toBeNull();
    expect(screen.getByText('¿Qué distancia vas a correr?')).not.toBeNull();
  });

  it('keeps the selected distance when moving forwards and backwards', () => {
    renderCard();
    openCard();
    const raceButton = screen.getByRole('button', { name: /Serra de Tramuntana/ });
    fireEvent.click(raceButton);
    continueFlow();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(
      screen.getByRole('button', { name: /Serra de Tramuntana/ }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('treats no restrictions as an exclusive option', () => {
    renderCard();
    reachRestrictionsStep();
    const glutenFree = screen.getByRole('button', { name: 'Sin gluten' });
    const noRestrictions = screen.getByRole('button', { name: 'Sin restricciones' });

    fireEvent.click(glutenFree);
    expect(glutenFree.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(noRestrictions);

    expect(noRestrictions.getAttribute('aria-pressed')).toBe('true');
    expect(glutenFree.getAttribute('aria-pressed')).toBe('false');
  });

  it('shows fixed targets, dynamic race data and exactly four official product links', () => {
    renderCard();
    completeFlow();

    expect(screen.getByText('138 km')).not.toBeNull();
    expect(screen.getByText(/5[.\s]?350 m/)).not.toBeNull();
    expect(screen.getByText('21 h 22 min')).not.toBeNull();
    expect(screen.getByText('45g')).not.toBeNull();
    expect(screen.getByText('236kcal')).not.toBeNull();
    expect(screen.getByText('700ml')).not.toBeNull();
    expect(screen.getByText('700mg')).not.toBeNull();
    expect(screen.getByText('Total: 962 g')).not.toBeNull();

    const productLinks = screen.getAllByRole('link');
    expect(productLinks).toHaveLength(4);
    for (const link of productLinks) {
      expect(link.getAttribute('rel')).toBe('sponsored noopener noreferrer');
      expect(link.getAttribute('href')).toMatch(/^https:\/\/eu\.naak\.com\//);
      expect(link.getAttribute('href')).not.toContain('utm_');
    }
  });

  it('renders every 40-minute intake to the estimated finish and supports all result views', () => {
    renderCard();
    completeFlow();

    expect(screen.getByText('21:20')).not.toBeNull();
    expect(screen.getByRole('tab', { name: 'Perfil' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Cronología' }));
    expect(screen.getByRole('tabpanel').id).toBe('naak-result-panel-timeline');
    expect(screen.getByText('START')).not.toBeNull();
    expect(screen.getByText('FINISH')).not.toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Tabla' }));
    expect(screen.getAllByText('En carrera').length).toBeGreaterThan(10);
  });

  it('resets the completed flow without network or browser storage', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderCard();
    completeFlow();

    fireEvent.click(screen.getByRole('button', { name: 'Crear otro plan' }));

    expect(screen.getByText('¿Qué distancia vas a correr?')).not.toBeNull();
    const card = screen.getByTestId('naak-nutrition-card');
    expect(
      within(card)
        .getByRole('button', { name: /Serra de Tramuntana/ })
        .getAttribute('aria-pressed'),
    ).toBe('false');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });
});
