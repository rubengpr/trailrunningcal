import type { ReactNode } from 'react';
import { safeSourceUrl } from '@/lib/blog/research/result';
import type { Dossier } from '@/types/blog-research.types';

function CitedText({text,sources}: {text:string;sources:Dossier['sources']}) {
  const parts: ReactNode[] = [];
  let offset = 0;
  for (const match of text.matchAll(/\[(\d+)\]/g)) {
    const index = match.index!;
    parts.push(text.slice(offset,index));
    const source = sources[Number(match[1])-1];
    const url = source ? safeSourceUrl(source.url) : null;
    parts.push(url ? <a key={index} href={url} target="_blank" rel="noopener noreferrer" title={source.title}
      className="cursor-pointer text-blue-700 underline underline-offset-2">{match[0]}</a> : match[0]);
    offset = index+match[0].length;
  }
  parts.push(text.slice(offset));
  return <span className="whitespace-pre-wrap">{parts}</span>;
}

export function BlogResearchDossier({dossier,labels}: {dossier:Dossier;labels:{sources:string;observations:string}}) {
  return <div lang="es" className="space-y-4 text-sm leading-relaxed text-gray-700">
    <p><CitedText text={dossier.context} sources={dossier.sources} /></p>
    {dossier.observations.length ? <div><h4 className="font-semibold text-gray-900">{labels.observations}</h4>
      <ul className="mt-2 list-disc space-y-1 pl-5">{dossier.observations.map((text,index) => <li key={index}><CitedText text={text} sources={dossier.sources} /></li>)}</ul>
    </div> : null}
    {dossier.sources.length ? <div><h4 className="font-semibold text-gray-900">{labels.sources}</h4>
      <ol className="mt-2 list-decimal space-y-1 pl-5">{dossier.sources.map(source => <li key={source.url}>
        {safeSourceUrl(source.url) ? <a href={source.url} target="_blank" rel="noopener noreferrer" className="cursor-pointer break-words text-blue-700 underline underline-offset-2">{source.title}</a> : source.title}
      </li>)}</ol>
    </div> : null}
  </div>;
}
