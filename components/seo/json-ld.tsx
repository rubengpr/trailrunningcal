interface JsonLdProps {
  data: Record<string, unknown>;
}

/**
 * Escapes characters that would otherwise let string content break out of the
 * surrounding <script> tag. `JSON.stringify` leaves `</script>` intact, so any
 * DB- or import-sourced string reaching structured data is an injection vector.
 * U+2028/U+2029 are valid in JSON but not in JS string literals.
 *
 * `<`, `>` and `&` only ever occur inside string values in stringified JSON —
 * the structural characters are `{}[]",:` — so escaping them wholesale is safe
 * and round-trips back to the original text when parsed.
 */
function serialize(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  );
}
