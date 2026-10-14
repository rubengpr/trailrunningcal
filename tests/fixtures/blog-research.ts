import { context } from '@/tests/fixtures/blog-selection';
import type { Dossier, ResearchOutput, ResearchRun } from '@/types/blog-research.types';
export const dossier: Dossier = {eventName:context.events[0].name,context:'El evento sucede en Bagà según su organizador. [1]',sources:[{title:'Organizador',url:'https://example.com/event'}],observations:[]};
export const output: ResearchOutput = {dossier,consultedSources:['https://example.com/event'],model:'gpt-6.1-sol',responseId:'response',usage:null,searchCalls:2,durationMs:100};
export const run: ResearchRun = {
  id:'00000000-0000-4000-8000-100000000000',draftId:'00000000-0000-4000-8000-200000000000',provider:'openai',model:'gpt-6.1-sol',status:'queued',
  input:{regionName:context.regionName,events:context.events.slice(0,2).map(event => ({id:event.id,name:event.name}))},
  createdAt:'2026-10-13T10:00:00Z',finishedAt:null,errorCode:null,
  results:context.events.slice(0,2).map((event,index) => ({id:`result-${index}`,eventId:event.id,eventName:event.name,position:index,status:'queued',dossier:null,consultedSources:[],errorCode:null,startedAt:null,finishedAt:null})),
};
