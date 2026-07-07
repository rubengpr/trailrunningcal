'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import type { ScrapeUsage } from '@/types/races-scrape-api.types';

type ImportCostSummaryNamespace = 'admin.races.import' | 'admin.events.import';

const NUMBER_FORMATTER = new Intl.NumberFormat('es-ES');

interface ImportCostSummaryProps {
    openRouterUsage: OpenRouterScrapeUsage | null;
    scrapeUsage: ScrapeUsage | null;
    translationsNamespace: ImportCostSummaryNamespace;
}

function formatCost(value: number | null): string {
    if (value === null || !Number.isFinite(value)) {
        return '—';
    }
    if (value === 0) {
        return '$0';
    }
    if (value < 0.01) {
        return '<$0.01';
    }

    const precision = 2;
    const formatted = value
        .toFixed(precision)
        .replace(/(\.\d*?[1-9])0+$/, '$1')
        .replace(/\.0+$/, '');

    return `$${formatted}`;
}

function formatNumber(value: number | null): string {
    return value === null ? '—' : NUMBER_FORMATTER.format(value);
}

function sumCosts(...values: Array<number | null>): number | null {
    let total = 0;
    let found = false;

    for (const value of values) {
        if (value === null || !Number.isFinite(value)) {
            continue;
        }
        total += value;
        found = true;
    }

    return found ? total : null;
}

function DetailRow({ label, value }: { label: string; value: string }): React.ReactElement {
    return (
        <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-800 tabular-nums">{value}</span>
        </div>
    );
}

export function ImportCostSummary({
    openRouterUsage,
    scrapeUsage,
    translationsNamespace,
}: ImportCostSummaryProps): React.ReactElement {
    const t = useTranslations(translationsNamespace);
    const aiCost = openRouterUsage?.cost ?? null;
    const totalCost = sumCosts(aiCost, scrapeUsage?.totalCost ?? null);
    const summaryLabel = t('costSummary.aiCostLabel');

    return (
        <details className="group max-w-3xl">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-sm text-gray-700 marker:hidden">
                <ChevronRight className="size-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90" strokeWidth={2} aria-hidden />
                <span className="text-gray-600 tabular-nums">
                    <span>{summaryLabel} </span>
                    <span className="font-semibold">{formatCost(totalCost)}</span>
                </span>
            </summary>
            <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4">
                <section className="grid gap-2">
                    <h3 className="text-xs font-semibold text-gray-900">{t('costSummary.crawlProviderTitle')}</h3>
                    <DetailRow label={t('costSummary.crawlTotalCost')} value={formatCost(scrapeUsage?.totalCost ?? null)} />
                </section>
                <section className="grid gap-2">
                    <h3 className="text-xs font-semibold text-gray-900">{t('costSummary.openRouterTitle')}</h3>
                    <DetailRow label={t('costSummary.openRouterCost')} value={formatCost(aiCost)} />
                    <details className="group/tokens">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xs text-gray-600 marker:hidden">
                            <span className="inline-flex items-center gap-0.5">
                                <ChevronRight className="size-3.5 shrink-0 text-gray-400 transition-transform group-open/tokens:rotate-90" strokeWidth={2} aria-hidden />
                                <span>{t('costSummary.tokensTitle')}</span>
                            </span>
                            <span className="font-medium tabular-nums text-gray-800">
                                {formatNumber(openRouterUsage?.totalTokens ?? null)}
                            </span>
                        </summary>
                        <div className="mt-2 grid gap-2 pl-5">
                            <DetailRow label={t('costSummary.promptTokens')} value={formatNumber(openRouterUsage?.promptTokens ?? null)} />
                            <DetailRow label={t('costSummary.completionTokens')} value={formatNumber(openRouterUsage?.completionTokens ?? null)} />
                            <DetailRow label={t('costSummary.reasoningTokens')} value={formatNumber(openRouterUsage?.reasoningTokens ?? null)} />
                            <DetailRow label={t('costSummary.totalTokens')} value={formatNumber(openRouterUsage?.totalTokens ?? null)} />
                        </div>
                    </details>
                </section>
            </div>
        </details>
    );
}
