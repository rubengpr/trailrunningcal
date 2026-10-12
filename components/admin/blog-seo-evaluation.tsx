'use client';
import { useTranslations } from 'next-intl';
import { ErrorMessage } from '@/components/ui/error-message';
import type { Evaluation, Finding } from '@/types/blog-evaluation.types';

function EvidenceList({finding}:{finding:Finding}) {
  const t = useTranslations('admin.blog');
  const isLength = ['length_outside_target','keyword_length','slug_length'].includes(finding.code);
  const explanation = isLength ? t(finding.field === 'article' || finding.code !== 'length_outside_target' ? 'observedWords' : 'observedCharacters',{count:Number(finding.explanation)}) : finding.explanation;
  return <>{explanation ? <p className="mt-1 text-sm leading-relaxed text-gray-600">{explanation}</p> : null}
    {finding.evidence.map((proof,index) => <blockquote key={index} className="mt-2 border-l-2 border-gray-200 pl-3 text-xs leading-relaxed text-gray-600">
      <span className="font-medium">{t('evaluationFields.'+proof.source)}: </span>{proof.quote}
    </blockquote>)}</>;
}
export function BlogSeoEvaluation({evaluation}:{evaluation:Evaluation}) {
  const t = useTranslations('admin.blog');
  return <section className="space-y-6">
    <p className="text-4xl font-semibold tabular-nums">{evaluation.score}<span className="text-lg font-normal text-gray-400">/100</span></p>
    <p className="text-xs leading-relaxed text-gray-500">{t('scorerHelp')}</p>
    <section className="space-y-3"><h3 className="font-semibold">{t('criticalErrors')}</h3>
      {evaluation.criticalErrors.length === 0 ? <p className="text-sm text-emerald-700">{t('noCriticalErrors')}</p> : evaluation.criticalErrors.map(finding =>
        <div key={finding.code+finding.field}>
          <ErrorMessage title={t('findingCodes.'+finding.code)} message={t('findingField',{field:t('evaluationFields.'+finding.field)})} showRetry={false} variant="compact" />
          <EvidenceList finding={finding} />
        </div>)}
    </section>
    <section className="space-y-4"><h3 className="font-semibold">{t('scoreBreakdown')}</h3>
      {evaluation.criteria.map(criterion => <div key={criterion.category} className="rounded-lg border border-gray-200 p-3">
        <div className="flex justify-between gap-3"><h4 className="text-sm font-medium">{t('scoringCategories.'+criterion.category)}</h4><span className="text-sm font-semibold tabular-nums">{criterion.score}/{criterion.maximum}</span></div>
        <p className="mt-1 text-xs text-gray-500">{t('scoreSources',{deterministic:criterion.deterministic,llm:criterion.llm})}</p>
        <EvidenceList finding={{code:criterion.category,field:'article',explanation:criterion.explanation,evidence:criterion.evidence}} />
      </div>)}
    </section>
    <section className="space-y-3"><h3 className="font-semibold">{t('recommendations')}</h3>
      {evaluation.recommendations.length === 0 ? <p className="text-sm text-gray-500">{t('noRecommendations')}</p> : evaluation.recommendations.map(finding =>
        <div key={finding.code+finding.field} className="rounded-lg bg-gray-50 p-3"><h4 className="text-sm font-medium">{t('findingCodes.'+finding.code)} · {t('evaluationFields.'+finding.field)}</h4><EvidenceList finding={finding} /></div>)}
    </section>
  </section>;
}
