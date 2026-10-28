'use client';
import Image from 'next/image';
import { Fragment, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, LoaderCircle, PencilLine, Plus, RefreshCw, Trash2, TriangleAlert } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { BlogArticleTypography, BlogTextBlock } from '@/components/admin/blog-article-content';
import { BlogArticleImageEditor } from '@/components/admin/blog-article-image-editor';
import { ErrorMessage } from '@/components/ui/error-message';
import { ImagePreviewModal } from '@/components/ui/image-preview-modal';
import { Tooltip } from '@/components/ui/tooltip';
import { useBlogArticleImages } from '@/hooks/use-blog-article-images';
import { imageTypes, validateFile } from '@/lib/blog/publication';
import { addImage, editImage, imageUrl, removeImage, replaceImage } from '@/lib/api/blog-article-images';
import type { ArticleDocument, ImageBlock } from '@/types/blog-article-block.types';

type Target = { afterId: string | null; imageId?: string; version: number };
const actionClass = 'inline-flex size-8 cursor-pointer items-center justify-center rounded text-gray-400 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-40';
export function BlogArticleEditor({ id, document, links, onSaved }: {
  id: string; document: ArticleDocument; links: readonly string[]; onSaved: (value: ArticleDocument) => void;
}) {
  const t = useTranslations('admin.blog.articleImages');
  const publication = useTranslations('admin.blog.publication');
  const locale = useLocale();
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const file = useRef<HTMLInputElement>(null), target = useRef<Target | null>(null);
  const [editing, setEditing] = useState<{ image: ImageBlock; version: number } | null>(null);
  const [preview, setPreview] = useState<ImageBlock | null>(null);
  const [uploadTarget, setUploadTarget] = useState<Target | null>(null);
  const mutation = useBlogArticleImages(onSaved);
  function choose(afterId: string | null, imageId?: string) {
    target.current = { afterId, imageId, version: document.version };
    file.current?.click();
  }
  function insertion(afterId: string | null) {
    return <div className="group/insert relative flex h-3 items-center justify-center print:hidden">
      <button type="button" aria-label={t('insert')} title={t('insert')} disabled={mutation.sending} onClick={() => choose(afterId)}
        className="absolute z-10 inline-flex cursor-pointer items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-400 opacity-100 transition-opacity hover:border-gray-400 hover:text-gray-900 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-30 sm:opacity-0 sm:group-hover/insert:opacity-100">
        <Plus className="size-3" aria-hidden="true" />{t('insert')}
      </button>
    </div>;
  }
  return <div>
    <input ref={file} aria-label={t('select')} type="file" accept={imageTypes.join(',')} className="sr-only" tabIndex={-1} disabled={mutation.sending}
      onChange={async event => {
        const files = [...event.target.files ?? []]; event.target.value = '';
        if (!files.length || !target.current) return;
        if (files.length !== 1) { mutation.setError('one_image'); return; }
        try { validateFile(files[0]); } catch (error) { mutation.setError(error instanceof Error ? error.message : 'invalid_image'); return; }
        const selected = target.current;
        setUploadTarget(selected);
        if (await mutation.submit(() => selected.imageId ? replaceImage(id, selected.imageId, files[0], selected.version) : addImage(id, files[0], selected.afterId, selected.version))) toast.success(t('saved'));
        setUploadTarget(null);
      }} />
    {mutation.error && !editing ? <ErrorMessage message={t(mutation.error)} showRetry={false} variant="compact" /> : null}
    {mutation.sending ? <p role="status" className="mb-3 flex items-center gap-2 text-xs text-gray-500"><LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />{uploadTarget ? t('uploading') : t('saving')}</p> : null}
    <BlogArticleTypography>
      {insertion(null)}
      {document.blocks.map((block, index) => <Fragment key={block.id}>
        {block.type === 'text' ? <BlogTextBlock html={block.html} links={links} /> : <figure className="my-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs tabular-nums text-gray-500">
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5">{publication('dimensions', { width: block.metadata.width, height: block.metadata.height })}</span>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5">{block.metadata.bytes >= 1024 * 1024
                ? publication('megabytes', { value: number.format(block.metadata.bytes / (1024 * 1024)) })
                : publication('kilobytes', { value: number.format(block.metadata.bytes / 1024) })}</span>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5">{block.metadata.format.toUpperCase()}</span>
            </div>
            <div className="ml-auto flex items-center gap-1">
            {!block.alt ? <Tooltip text={t('missingAlt')} size="sm"><TriangleAlert className="mr-2 size-3.5 text-amber-600" aria-label={t('missingAlt')} /></Tooltip> : null}
            <button type="button" className={actionClass} disabled={mutation.sending || index === 0} aria-label={t('up')} title={t('up')}
              onClick={() => { void mutation.submit(() => editImage(id, block.id, { action: 'move', direction: 'up', version: document.version })); }}><ArrowUp className="size-4" aria-hidden="true" /></button>
            <button type="button" className={actionClass} disabled={mutation.sending || index === document.blocks.length - 1} aria-label={t('down')} title={t('down')}
              onClick={() => { void mutation.submit(() => editImage(id, block.id, { action: 'move', direction: 'down', version: document.version })); }}><ArrowDown className="size-4" aria-hidden="true" /></button>
            <button type="button" className={actionClass} disabled={mutation.sending} aria-label={t('edit')} title={t('edit')}
              onClick={() => { mutation.setError(null); setEditing({ image: block, version: document.version }); }}><PencilLine className="size-4" aria-hidden="true" /></button>
            <button type="button" className={actionClass} disabled={mutation.sending} aria-label={t('replace')} title={t('replace')} onClick={() => choose(null, block.id)}><RefreshCw className="size-4" aria-hidden="true" /></button>
            <button type="button" className={`${actionClass} hover:text-red-600`} disabled={mutation.sending} aria-label={t('remove')} title={t('remove')}
              onClick={async () => { if (await mutation.submit(() => removeImage(id, block.id, document.version))) toast.success(t('removed')); }}><Trash2 className="size-4" aria-hidden="true" /></button>
            </div>
          </div>
          <button type="button" className="block w-full cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900" aria-label={t('preview')} onClick={() => setPreview(block)}>
            <Image src={imageUrl(id, block.id, document.version)} alt={block.alt} width={block.metadata.width} height={block.metadata.height} unoptimized className="max-h-[600px] w-full rounded-lg object-contain" />
          </button>
          {block.caption ? <figcaption className="mt-2 text-center text-xs leading-relaxed text-gray-500">{block.caption}</figcaption> : null}
        </figure>}
        {insertion(block.id)}
      </Fragment>)}
    </BlogArticleTypography>
    {editing ? <BlogArticleImageEditor image={editing.image} sending={mutation.sending} error={mutation.error} onClose={() => setEditing(null)}
      onSave={async (alt, caption) => {
        if (await mutation.submit(() => editImage(id, editing.image.id, { action: 'update', alt, caption, version: editing.version }))) { setEditing(null); toast.success(t('saved')); }
      }} /> : null}
    {preview ? <ImagePreviewModal src={imageUrl(id, preview.id, document.version)} alt={preview.alt} title={t('preview')} closeLabel={t('close')} onClose={() => setPreview(null)} /> : null}
  </div>;
}
