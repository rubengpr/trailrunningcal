import { NaakNutritionResultPreview } from '@/components/sponsors/naak-nutrition-result-preview';

/** Temporary local-only route for fast visual verification of the Näak result. */
export default function NaakResultPreviewPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <NaakNutritionResultPreview />
    </main>
  );
}
