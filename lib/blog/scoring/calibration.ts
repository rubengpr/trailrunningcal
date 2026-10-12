import type { ScoringInput } from '@/types/blog-evaluation.types';

// Display markers on the local A/B/C fixtures are not part of their article.
// Remove only those paired markers; never alter body, scoring rules or thresholds.
export function calibrationInput(input:ScoringInput,url:string|undefined):ScoringInput {
  if (!url || new URL(url).hostname !== 'wghqldoshvwulyqqbqln.supabase.co') return input;
  const marker = input.title.match(/^\[Prueba scorer · ([ABC])\] (.+)$/);
  if (!marker) return input;
  const suffix = '-prueba-scorer-'+marker[1].toLowerCase();
  if (!input.slug.endsWith(suffix)) return input;
  return {...input,title:marker[2],slug:input.slug.slice(0,-suffix.length)};
}
