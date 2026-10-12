import { describe, expect, it } from 'vitest';
import { inspect } from './rules';
import { categories, editorialStatus, llmMaximum } from './rubric';
import { combine, parseResult } from './result';
import { calibrationInput } from './calibration';
import type { ScoringInput } from '@/types/blog-evaluation.types';

const input:ScoringInput = {
  instructions:'Explica distancia, desnivel y logística.',title:'Cómo elegir tu primera carrera de trail',
  contentHtml:'<p>Información clara para elegir.</p><h2>Distancia</h2><p>Compara opciones.</p><h3>Perfil</h3><p>Revisa desnivel.</p>',
  primaryKeyword:'primera carrera de trail',slug:'primera-carrera-trail',seoTitle:'Cómo elegir tu primera carrera de trail',
  metaDescription:'Aprende a comparar carreras de montaña.',
};
function response() { return {criteria:categories.map(category=>({category,score:llmMaximum[category],explanation:'Adecuado.',evidence:[]})),criticalErrors:[],recommendations:[]}; }

describe('deterministic scoring',()=>{
  it('assigns exactly 13 baseline points',()=>{
    expect(inspect(input).points).toEqual({utility:0,rigor:0,structure:5,metadata:8,clarity:0});
  });
  it.each([[19,true],[20,false]])('checks title minimum %i', (length,critical)=>{
    expect(inspect({...input,title:'x'.repeat(length)}).criticalErrors.some(x=>x.code==='short_title')).toBe(critical);
  });
  it.each([
    ['<p>Solo texto</p>','missing_h2'],['<h3>Antes</h3><h2>Después</h2>','invalid_hierarchy'],
    ['<h2> </h2>','empty_heading'],['<script>alert(1)</script><h2>Sección</h2>','unsafe_html'],
    ['<h2>Sección</h2><p onclick="evil()">Texto</p>','unsafe_html'],
    ['<h2>Sección</h2><a href="/es">Enlace</a>','links_not_allowed'],
    ['<h2>Sección</h2><img src="/x">','images_not_allowed'],['','empty_content'],
  ])('detects critical %s', (html,code)=>{
    expect(inspect({...input,contentHtml:html}).criticalErrors.some(x=>x.code===code)).toBe(true);
  });
  it('decodes entities and does not confuse heading markup in text with real headings',()=>{
    const result=inspect({...input,contentHtml:'<p>&lt;h2&gt; &amp; texto</p>'});
    expect(result.metrics.text).toBe('<h2> & texto');
    expect(result.metrics.headings).toEqual([]);
  });
  it('reports optional lengths without penalizing',()=>{
    const result=inspect({...input,seoTitle:'Breve',metaDescription:'Breve'});
    expect(result.points.metadata).toBe(8);
    expect(result.observations.some(x=>x.code==='length_outside_target')).toBe(true);
  });
  it('deduplicates critical codes and fields',()=>{
    const result=inspect({...input,contentHtml:'<h2>Uno</h2><script>a()</script><iframe></iframe>'});
    expect(result.criticalErrors.filter(x=>x.code==='unsafe_html')).toHaveLength(1);
  });
});
describe('LLM validation and final score',()=>{
  it('calculates 100 from capped components rather than a model total',()=>{
    const checks=inspect(input);
    const llm=parseResult(response(),input,checks);
    expect(combine(checks,llm).score).toBe(100);
  });
  it('allows a zero total when all components fail',()=>{
    const empty={...input,title:'',contentHtml:'<h1></h1>',primaryKeyword:'',slug:'',seoTitle:'',metaDescription:''};
    const checks=inspect(empty);
    const body=response();
    body.criteria.forEach(item=>{item.score=0;});
    expect(combine(checks,parseResult(body,empty,checks)).score).toBe(0);
  });
  it('keeps critical errors independent of the numerical score',()=>{
    const short={...input,title:'Corto'};
    const checks=inspect(short);
    const result=combine(checks,parseResult(response(),short,checks));
    expect(result.score).toBe(100);
    expect(editorialStatus(result.score,result.criticalErrors.length)).toBe('requires_corrections');
  });
  it.each([[79,0,'needs_improvement'],[80,0,'ready_for_review'],[100,1,'requires_corrections']])('derives editorial state %#',(score,count,state)=>{
    expect(editorialStatus(Number(score),Number(count))).toBe(state);
  });
  it.each([-1,31,0.5])('rejects utility score %s',score=>{
    const body=response();body.criteria[0].score=score;
    expect(()=>parseResult(body,input,inspect(input))).toThrow('invalid_evaluation');
  });
  it('rejects duplicate or missing categories',()=>{
    const body=response();body.criteria[1]=body.criteria[0];
    expect(()=>parseResult(body,input,inspect(input))).toThrow('invalid_evaluation');
  });
  it('requires literal evidence for semantic criticals',()=>{
    const body={...response(),criticalErrors:[{code:'missing_essential_topic',field:'article',explanation:'No cubre el encargo.',evidence:[{source:'instructions',quote:'desnivel y logística.'}]}]};
    expect(parseResult(body,input,inspect(input)).criticalErrors).toHaveLength(1);
    body.criticalErrors[0].evidence[0].quote='Una cita inventada';
    expect(()=>parseResult(body,input,inspect(input))).toThrow('invalid_evidence');
    body.criticalErrors[0].evidence=[];
    expect(()=>parseResult(body,input,inspect(input))).toThrow('invalid_evaluation');
  });
  it('normalizes only paired local calibration markers',()=>{
    const marked={...input,title:'[Prueba scorer · A] '+input.title,slug:input.slug+'-prueba-scorer-a'};
    expect(calibrationInput(marked,'https://wghqldoshvwulyqqbqln.supabase.co')).toEqual(input);
    expect(calibrationInput(marked,'https://ppmdbmyxgtqvmvtbptmg.supabase.co')).toEqual(marked);
  });
});
