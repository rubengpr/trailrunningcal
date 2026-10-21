import Ajv from 'ajv';
import { dossierSchema, parseDossier } from '@/lib/blog/research/result';
import { regionIds } from '@/lib/blog/regions';
import es from '@/locales/es/translation.json';
import type { WritingInput, WritingRequest } from '@/types/blog-writing.types';

export class WritingError extends Error {
  constructor(public readonly code: 'invalid_context' | 'invalid_references') { super(code); }
}
const string = {type:'string',minLength:1,maxLength:10_000,pattern:'\\S'};
const validate = new Ajv().compile<WritingRequest>({
  type:'object',additionalProperties:false,required:['regionId','events'],
  properties:{
    regionId:{type:'string',enum:regionIds},
    events:{type:'array',minItems:5,maxItems:5,items:{
      type:'object',additionalProperties:false,
      required:['eventId','eventName','slug','dossier','consultedSources'],
      properties:{
        eventId:string,eventName:string,slug:{type:'string',pattern:'^[a-z0-9]+(?:-[a-z0-9]+)*$'},
        dossier:{...dossierSchema,properties:{...dossierSchema.properties,
          context:{type:'string',minLength:1,maxLength:30_000},
          sources:{...dossierSchema.properties.sources,maxItems:50},
          observations:{type:'array',maxItems:30,items:string},
        }},
        consultedSources:{type:'array',maxItems:500,items:string},
      },
    }},
  },
});
export function normalizeText(text: string): string { return text.normalize('NFKC').replace(/\s+/g,' ').trim(); }
export function prepare(value: unknown): {request:WritingRequest;input:WritingInput} {
  if (!validate(value)) throw new WritingError('invalid_context');
  const request = structuredClone(value);
  if (new Set(request.events.map(event => event.eventId)).size !== 5 ||
    new Set(request.events.map(event => normalizeText(event.eventName).toLocaleLowerCase('es'))).size !== 5) throw new WritingError('invalid_context');
  const events = request.events.map(event => {
    try {event.dossier = parseDossier(event.dossier,event.consultedSources);}
    catch {throw new WritingError('invalid_context');}
    return {eventName:event.eventName,dossier:event.dossier};
  });
  return {request,input:{regionName:es.geography.regions[request.regionId],events}};
}
