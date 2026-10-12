import { categories, llmMaximum, semanticCodes } from '@/lib/blog/scoring/rubric';

const evidence = {
  type: 'object', properties: {
    source: { type:'string',enum:['article','instructions','title','seoTitle','metaDescription','primaryKeyword','slug'] },
    quote:{type:'string'},
  },required:['source','quote'],additionalProperties:false,
};
const finding = (codes: readonly string[]) => ({
  type:'object',properties:{
    code:{type:'string',enum:codes},field:evidence.properties.source,
    explanation:{type:'string'},evidence:{type:'array',items:evidence},
  },required:['code','field','explanation','evidence'],additionalProperties:false,
});
export const evaluationSchema = {
  type:'object',properties:{
    criteria:{type:'array',minItems:5,maxItems:5,items:{anyOf:categories.map(category => ({
      type:'object',properties:{
        category:{type:'string',enum:[category]},score:{type:'integer',minimum:0,maximum:llmMaximum[category]},
        explanation:{type:'string'},evidence:{type:'array',items:evidence},
      },required:['category','score','explanation','evidence'],additionalProperties:false,
    }))}},
    criticalErrors:{type:'array',items:finding(semanticCodes)},
    recommendations:{type:'array',items:finding(['improve_coverage','improve_rigor','improve_structure','improve_metadata','improve_style'])},
  },required:['criteria','criticalErrors','recommendations'],additionalProperties:false,
};
