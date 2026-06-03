import { describe, expect, it } from 'vitest';
import { sanitizeEventDescription } from '@/lib/services/event-description';

describe('sanitizeEventDescription', () => {
  it('allows clearing an event description', () => {
    expect(sanitizeEventDescription(null)).toEqual({
      value: null,
      error: null,
    });
    expect(sanitizeEventDescription('   ')).toEqual({
      value: null,
      error: null,
    });
  });

  it('rejects non-string descriptions', () => {
    expect(sanitizeEventDescription(123).error).toBe('Invalid description');
  });

  it('rejects short descriptions', () => {
    expect(sanitizeEventDescription('Demasiado corta').error).toBe(
      'Description is too short',
    );
  });

  it('trims valid descriptions', () => {
    const description =
      '  La prueba recorre senderos de montaña con una propuesta variada para corredores populares y experimentados. El entorno combina pistas, caminos y tramos técnicos según la distancia elegida.\n\nEl evento reúne varias modalidades adultas y mantiene un ambiente cercano en torno al municipio organizador, con una oferta pensada para distintos niveles de experiencia en trail running.  ';

    expect(sanitizeEventDescription(description)).toEqual({
      value: description.trim(),
      error: null,
    });
  });
});
