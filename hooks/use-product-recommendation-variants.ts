'use client';

import { useFeatureFlagVariant } from '@/hooks/use-feature-flag-variant';
import { getPriceVariant, getShoeVariant, getVariant, PRICE_FLAG, RECOMMENDATIONS_FLAG, SHOES_FLAG } from '@/lib/sponsors/product-recommendation';
import { isReferencePricePreview } from '@/lib/sponsors/reference-price-preview';

export function useProductRecommendationVariants() {
  const assignedVariant = getVariant(useFeatureFlagVariant(RECOMMENDATIONS_FLAG));
  const assignedPriceVariant = getPriceVariant(useFeatureFlagVariant(PRICE_FLAG));
  const assignedShoeVariant = getShoeVariant(useFeatureFlagVariant(SHOES_FLAG));
  const previewVariant = process.env.NODE_ENV === 'development'
    ? getVariant(process.env.NEXT_PUBLIC_PRODUCT_RECOMMENDATION_PREVIEW ?? 'baouw')
    : null;
  const previewPriceVariant = process.env.NODE_ENV === 'development'
    ? getPriceVariant(process.env.NEXT_PUBLIC_PRODUCT_PRICE_PREVIEW ?? 'show-price')
    : null;
  const previewShoeVariant = process.env.NODE_ENV === 'development'
    ? getShoeVariant(process.env.NEXT_PUBLIC_PRODUCT_SHOES_PREVIEW ?? 'asics')
    : null;
  // Off by default: simulated reference prices are never shown unless explicitly requested in development.
  const simulatedReferencePrices = process.env.NODE_ENV === 'development'
    && isReferencePricePreview(process.env.NEXT_PUBLIC_PRODUCT_REFERENCE_PRICE_PREVIEW);

  return {
    variant: previewVariant ?? assignedVariant,
    priceVariant: previewPriceVariant ?? assignedPriceVariant,
    shoeVariant: previewShoeVariant ?? assignedShoeVariant,
    simulatedReferencePrices,
    isPreview: Boolean(previewVariant || previewPriceVariant || previewShoeVariant || simulatedReferencePrices),
  };
}
