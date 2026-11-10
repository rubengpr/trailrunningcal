import type { DraftDetail } from '@/types/blog-draft-record.types';
export const exportFixture: DraftDetail = {
  id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', title: 'Guía para descubrir las carreras de montaña', instructions: 'Test', status: 'completed',
  createdAt: '2026-11-10', updatedAt: '2026-11-10', primaryKeyword: 'trail running', slug: 'mejores-carreras-test',
  seoTitle: 'Cinco carreras para descubrir', metaDescription: 'Una guía para descubrir las carreras.', contentHtml: '<p>Hola montaña</p>',
  errorCode: null, evaluationStatus: 'not_evaluated', evaluationErrorCode: null, editorialStatus: null, criticalCount: 0, evaluation: null,
  publication: { author: 'Ruben Godoy', date: '2026-11-10', imagePath: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa/cover.png', imageAlt: 'Un paisaje', version: 1 },
};
