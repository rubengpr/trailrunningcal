import { useLocale, useTranslations } from 'next-intl';
import { ClipboardCheck, Coins, PenLine, Search } from 'lucide-react';
import { BlogDraftSection } from '@/components/admin/blog-draft-section';
import { DetailRow } from '@/components/admin/import-cost-summary';
import { ErrorMessage } from '@/components/ui/error-message';
import { formatCost } from '@/lib/utils/format-cost';
import type { CostLine, CostSummary } from '@/types/blog-cost.types';

const precision = 4;
const stageIcons = { research: Search, writing: PenLine, evaluation: ClipboardCheck };

export function BlogCostSummary({ costs }: { costs: CostSummary | null }) {
  const t = useTranslations('admin.blog.costs');
  const numbers = new Intl.NumberFormat(useLocale());
  const amount = ({ costUsd, partial }: { costUsd: number | null; partial: boolean }) =>
    costUsd === null ? t('unavailable') : partial ? t('partial', { cost: formatCost(costUsd, precision) }) : formatCost(costUsd, precision);
  const count = (value: number | undefined) => value === undefined ? '—' : numbers.format(value);
  const label = (line: CostLine) => line.stage === 'research' ? line.eventName ?? t('unknownEvent')
    : line.stage === 'writing' ? t('writingCall') : t('attempt', { number: line.attempt ?? 1 });
  if (!costs) return <BlogDraftSection title={t('title')}>
    <div className="mt-3"><ErrorMessage message={t('readFailed')} showRetry={false} variant="compact" /></div>
  </BlogDraftSection>;
  return (
    <BlogDraftSection title={t('heading', { total: amount(costs) })}>
      <div className="mt-4 grid max-w-md gap-2">
        <DetailRow icon={<Coins className="size-3.5 shrink-0" aria-hidden="true" />} label={t('total')} value={amount(costs)} />
        {costs.groups.map(group => {
          const Icon = stageIcons[group.stage];
          return <DetailRow key={group.stage} icon={<Icon className="size-3.5 shrink-0" aria-hidden="true" />}
            label={t(`stages.${group.stage}`)} value={group.lines.length ? amount(group) : t('noCalls')} />;
        })}
      </div>
      {costs.groups.filter(group => group.lines.length).map(group => (
        <section key={group.stage} className="mt-6">
          <h3 className="text-xs font-semibold text-gray-900">{t(`stages.${group.stage}`)}</h3>
          <div tabIndex={0} className="mt-2 overflow-x-auto rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900">
            <table className="w-full min-w-[40rem] text-left text-xs tabular-nums">
              <thead className="text-gray-500">
                <tr className="border-b border-gray-100">
                  {(['call', 'model', 'status', 'input', 'cachedInput', 'cacheWrite', 'output', 'reasoning', 'searches', 'cost'] as const).map(column => (
                    <th key={column} scope="col" title={t(`columns.${column}`)} className={`py-2 pr-3 font-medium ${column === 'call' || column === 'model' || column === 'status' ? '' : 'text-right'}`}>{t(`shortColumns.${column}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-gray-800">
                {group.lines.map(line => (
                  <tr key={line.id} className="border-b border-gray-100 last:border-0">
                    <th scope="row" className="max-w-48 py-2 pr-3 font-medium break-words">{label(line)}</th>
                    <td className="py-2 pr-3 whitespace-nowrap">{line.model ?? '—'}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{line.status ? t(`statuses.${line.status}`) : '—'}</td>
                    <td className="py-2 pr-3 text-right">{count(line.tokens?.input)}</td>
                    <td className="py-2 pr-3 text-right">{count(line.tokens?.cachedInput)}</td>
                    <td className="py-2 pr-3 text-right">{count(line.tokens ? line.tokens.cacheWrite30m + line.tokens.cacheWrite12h : undefined)}</td>
                    <td className="py-2 pr-3 text-right">{count(line.tokens?.output)}</td>
                    <td className="py-2 pr-3 text-right">{count(line.tokens?.reasoning)}</td>
                    <td className="py-2 pr-3 text-right">{count(line.searches ?? undefined)}</td>
                    <td className="py-2 text-right font-medium whitespace-nowrap">{line.costUsd === null ? t('unavailable') : formatCost(line.costUsd, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="mt-4 max-w-3xl text-xs text-gray-500">{t('note')}</p>
    </BlogDraftSection>
  );
}
