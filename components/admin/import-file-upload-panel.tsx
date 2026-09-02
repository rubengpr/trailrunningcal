'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { FileText, ImageIcon, X } from 'lucide-react';
import type { FileUpload } from '@/hooks/use-file-upload';

interface ImportFileUploadPanelProps {
  fileUpload: FileUpload;
  isScraping: boolean;
  onClear: () => void;
}

export function ImportFileUploadPanel({
  fileUpload,
  isScraping,
  onClear,
}: ImportFileUploadPanelProps): React.ReactElement {
  const t = useTranslations('admin.events.import');
  const {
    markdownFileInputRef,
    imageFileInputRef,
    uploadedFileName,
    uploadedImages,
    uploadKind,
    handleMarkdownFileChange,
    handleImageFilesChange,
    handleRemoveImage,
  } = fileUpload;

  return (
    <div className="grid w-full gap-2">
      <label className="text-sm font-medium leading-none text-gray-900">
        {t('uploadTypeLabel')}
      </label>
      <div className="flex items-center gap-2">
        <input
          ref={markdownFileInputRef}
          id="uploadMarkdownFile"
          type="file"
          accept=".md,.json,text/markdown,text/plain,application/json"
          className="sr-only"
          onChange={handleMarkdownFileChange}
          disabled={isScraping}
        />
        <input
          ref={imageFileInputRef}
          id="uploadImageFiles"
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={handleImageFilesChange}
          disabled={isScraping}
        />
        <button
          type="button"
          onClick={() => markdownFileInputRef.current?.click()}
          disabled={isScraping || uploadKind === 'images'}
          title={t('uploadMarkdownButtonTitle')}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-md border shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${uploadKind === 'markdown'
            ? 'border-gray-900 bg-gray-50 text-gray-900'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
        >
          <FileText className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => imageFileInputRef.current?.click()}
          disabled={isScraping || uploadKind === 'markdown'}
          title={t('uploadImagesButtonTitle')}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-md border shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${uploadKind === 'images'
            ? 'border-gray-900 bg-gray-50 text-gray-900'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
        >
          <ImageIcon className="h-4 w-4" strokeWidth={2} />
        </button>
        {uploadKind !== null ? (
          <button
            type="button"
            onClick={onClear}
            disabled={isScraping}
            title={t('clearUpload')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        ) : null}
      </div>
      {uploadKind === 'markdown' && uploadedFileName ? (
        <span className="max-w-full truncate text-sm text-gray-600 sm:max-w-md">{uploadedFileName}</span>
      ) : null}
      {uploadKind === 'images' && uploadedImages.length > 0 ? (
        <>
          <span className="text-xs text-gray-500">
            {uploadedImages.length === 1
              ? t('imageCountOne')
              : t('imageCount', { count: uploadedImages.length })}
          </span>
          <div className="flex flex-wrap gap-2">
            {uploadedImages.map((image, index) => (
              <div key={index} className="relative flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
                <Image
                  src={image.dataUrl}
                  alt={image.name}
                  width={32}
                  height={32}
                  unoptimized
                  className="h-8 w-8 rounded object-cover"
                />
                <span className="max-w-[120px] truncate text-xs text-gray-600">{image.name}</span>
                {!isScraping ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="ml-1 text-gray-400 hover:text-gray-700"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
