'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, PencilLine, Trash2, TriangleAlert } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { ErrorMessage } from '@/components/ui/error-message';
import { ImagePreviewModal } from '@/components/ui/image-preview-modal';
import { Tooltip } from '@/components/ui/tooltip';
import { imageTypes, validateFile } from '@/lib/blog/publication';
import { imageUrl, removeImage, saveImage } from '@/lib/api/blog-publication';
import { useBlogPublication } from '@/hooks/use-blog-publication';
import { useBlogImageMetadata } from '@/hooks/use-blog-image-metadata';
import type { Publication } from '@/types/blog-publication.types';

export function BlogPublicationImage({ id, publication, onSaved }: {
  id: string; publication: Publication; onSaved: (value: Publication) => void;
}) {
  const t = useTranslations('admin.blog.publication');
  const locale = useLocale();
  const [pending, setPending] = useState<{ file: File; version: number } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [enlarged, setEnlarged] = useState<{ src: string; alt: string } | null>(null);
  const [dimensions, setDimensions] = useState<{ src: string; width: number; height: number } | null>(null);
  const metadata = useBlogImageMetadata(id, publication.imagePath);
  const input = useRef<HTMLInputElement>(null);
  const mutation = useBlogPublication(onSaved);
  useEffect(() => {
    if (!pending) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(pending.file);
    return () => { reader.onload = null; if (reader.readyState === FileReader.LOADING) reader.abort(); };
  }, [pending]);
  function select(files: File[]) {
    if (mutation.sending) return;
    mutation.setError(null);
    if (files.length !== 1) { mutation.setError('one_image'); return; }
    try { validateFile(files[0]); }
    catch (error) { mutation.setError(error instanceof Error ? error.message : 'invalid_image'); return; }
    const selection = { file: files[0], version: publication.version };
    setPreview(null); setPending(selection);
    void upload(selection);
  }
  function clear() { setPending(null); setPreview(null); setEnlarged(null); mutation.setError(null); if (input.current) input.current.value = ''; }
  async function upload(selection: { file: File; version: number }) {
    if (await mutation.submit(() => saveImage(id, selection.file, selection.version))) { clear(); toast.success(t('imageSaved')); }
  }
  const src = preview ?? (publication.imagePath ? imageUrl(id, publication.version) : null);
  const details = pending ? preview && dimensions?.src === preview ? { ...dimensions, bytes: pending.file.size, format: pending.file.type.split('/')[1] } : null : metadata.data;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const size = details ? details.bytes >= 1024 * 1024 ? t('megabytes', { value: number.format(details.bytes / (1024 * 1024)) }) : t('kilobytes', { value: number.format(details.bytes / 1024) }) : '';
  return <section className="space-y-3" aria-label={t('image')}>
    <input ref={input} type="file" accept={imageTypes.join(',')} className="sr-only" tabIndex={-1} disabled={mutation.sending}
      aria-label={t('chooseImage')} onChange={event => { if (event.target.files?.length) select([...event.target.files]); event.target.value = ''; }} />
    {src || pending ? <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 p-3">
      {src ? <button type="button" aria-label={t('openPreview')} onClick={() => setEnlarged({ src, alt: pending ? t('preview') : publication.imageAlt ?? '' })}
        className="shrink-0 cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900">
        <Image src={src} alt={pending ? t('preview') : publication.imageAlt ?? ''} width={112} height={80} unoptimized className="h-20 w-28 rounded-md bg-gray-50 object-contain"
          onLoad={event => setDimensions({ src, width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} />
      </button>
        : <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-md bg-gray-50"><ImagePlus className="size-6 text-gray-400" aria-hidden="true" /></div>}
      <div className="min-w-0 flex-1 basis-32">
        <p className="text-sm font-medium">{pending ? t('selectedImage') : t('image')}</p>
        {details ? <p className="mt-1 text-xs tabular-nums text-gray-500">{t('dimensions', { width: details.width, height: details.height })} · {size} · {details.format === 'jpeg' ? 'JPEG' : details.format.toUpperCase()}</p> : null}
        {pending ? <p className="mt-1 truncate text-xs text-gray-500">{pending.file.name}</p> : publication.imagePath ?
          <div className="mt-1 flex items-center gap-1.5 text-xs leading-relaxed text-gray-500">
            <span className="break-words"><span className="font-medium">{t('altLabel')}: </span>{publication.imageAlt?.trim() || ''}</span>
            {!publication.imageAlt?.trim() ? <Tooltip text={t('missingAlt')} size="sm"><TriangleAlert aria-label={t('missingAlt')} className="size-3.5 shrink-0 text-amber-600" /></Tooltip> : null}
          </div> : null}
        {mutation.sending ? <p role="status" className="mt-1 flex items-center gap-1.5 text-xs text-gray-500"><LoaderCircle className="size-3 animate-spin" aria-hidden="true" />{pending ? t('uploading') : t('removing')}</p> : null}
      </div>
      <div className="mr-3 flex shrink-0 items-center gap-1">
        <button type="button" aria-label={t('replace')} title={t('replace')} disabled={mutation.sending} onClick={() => input.current?.click()}
          className="inline-flex size-8 cursor-pointer items-center justify-center text-gray-400 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-50">
          <PencilLine className="size-4" strokeWidth={1.5} aria-hidden="true" />
        </button>
        <button type="button" aria-label={t('removeImage')} title={t('removeImage')} disabled={mutation.sending}
          className="inline-flex size-8 cursor-pointer items-center justify-center text-gray-400 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={async () => {
            if (pending) { clear(); return; }
            if (await mutation.submit(() => removeImage(id, publication.version))) { clear(); toast.success(t('imageRemoved')); }
          }}>
          <Trash2 className="size-4" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </div> : <button type="button" disabled={mutation.sending} onClick={() => input.current?.click()}
      onDragOver={event => { event.preventDefault(); if (!mutation.sending) setDragging(true); }}
      onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); select([...event.dataTransfer.files]); }}
      className={`flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-7 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${dragging ? 'border-gray-900 bg-gray-100' : 'border-gray-300 bg-gray-50/50 hover:border-gray-500'}`}>
      <ImagePlus className="size-6 text-gray-400" aria-hidden="true" />
      <span>{t('dropImage')}</span>
      <span className="text-xs text-gray-500">{t('imageHelp')}</span>
    </button>}
    {mutation.error ? <ErrorMessage message={t(mutation.error)} variant="compact" showRetry={!!pending && !mutation.sending}
      onRetry={pending ? () => { void upload(pending); } : undefined} /> : null}
    {!pending && metadata.failed ? <ErrorMessage message={t('metadataFailed')} variant="compact" showRetry={false} /> : null}
    {enlarged ? <ImagePreviewModal src={enlarged.src} alt={enlarged.alt} title={t('image')} closeLabel={t('closePreview')} onClose={() => setEnlarged(null)} /> : null}
  </section>;
}
