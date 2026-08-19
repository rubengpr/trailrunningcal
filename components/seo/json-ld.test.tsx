import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { JsonLd } from '@/components/seo/json-ld';

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

function renderJsonLd(data: Record<string, unknown>): string {
  return renderToStaticMarkup(<JsonLd data={data} />);
}

function scriptBody(markup: string): string {
  return markup.replace(/^<script type="application\/ld\+json">/, '').replace(/<\/script>$/, '');
}

describe('JsonLd', () => {
  it('escapes a closing script tag in event-sourced strings', () => {
    const markup = renderJsonLd({
      '@type': 'Event',
      name: 'Cursa </script><script>alert(1)</script>',
    });

    expect(markup).not.toContain('<script>alert(1)');
    expect(scriptBody(markup)).not.toContain('</script>');
  });

  it('escapes angle brackets and ampersands', () => {
    const body = scriptBody(renderJsonLd({ name: 'trail & muntanya <b>10km</b>' }));

    expect(body).not.toMatch(/[<>&]/);
    expect(body).toContain('\\u003c');
    expect(body).toContain('\\u0026');
  });

  it('escapes U+2028 and U+2029, which are invalid in JS string literals', () => {
    const body = scriptBody(
      renderJsonLd({ name: `line${LINE_SEPARATOR}sep${PARAGRAPH_SEPARATOR}here` }),
    );

    expect(body).not.toMatch(/[\u2028\u2029]/);
    expect(body).toContain('\\u2028');
    expect(body).toContain('\\u2029');
  });

  it('round-trips to the original data so crawlers read unchanged values', () => {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: 'Cursa de la Vall  del Riu & <Muntanya>',
      description: `salt${LINE_SEPARATOR}de línia`,
      offers: { '@type': 'Offer', price: '25', priceCurrency: 'EUR' },
    };

    expect(JSON.parse(scriptBody(renderJsonLd(data)))).toEqual(data);
  });
});
