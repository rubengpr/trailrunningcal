'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, LoaderCircle, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { ErrorMessage } from '@/components/ui/error-message';
import { useModal } from '@/hooks/use-modal';
import {
  TrackTransportSizeError,
  uploadRaceTrack,
} from '@/lib/api/race-tracks';
import { MAX_TRACK_FILE_SIZE_BYTES } from '@/lib/race-tracks/limits';
import type { RaceTrackSaveResult } from '@/types/race-track.types';

interface RaceTrackUploadProps {
  raceId?: string;
  raceName: string;
  initialHasTrack: boolean;
  disabled?: boolean;
  onUploaded?: (result: RaceTrackSaveResult) => void;
}

export function RaceTrackUpload({
  raceId,
  raceName,
  initialHasTrack,
  disabled = false,
  onUploaded,
}: RaceTrackUploadProps): React.ReactElement {
  const t = useTranslations('adminEvents.form.track');
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasTrack, setHasTrack] = useState(initialHasTrack);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<RaceTrackSaveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    isOpen: isReplaceModalOpen,
    open: openReplaceModal,
    close: closeReplaceModal,
  } = useModal();

  const clearInput = (): void => {
    if (inputRef.current) inputRef.current.value = '';
  };

  const upload = async (file: File): Promise<void> => {
    if (!raceId) return;

    setIsUploading(true);
    setError(null);
    try {
      const uploadResult = await uploadRaceTrack(raceId, file);
      setResult(uploadResult);
      setHasTrack(true);
      onUploaded?.(uploadResult);
      toast.success(t('success'));
    } catch (uploadError) {
      const message = t(
        uploadError instanceof TrackTransportSizeError
          ? 'errors.transportSize'
          : 'errors.upload',
      );
      setError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
      setPendingFile(null);
      clearInput();
    }
  };

  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      return t('errors.type');
    }
    if (file.size === 0) {
      return t('errors.empty');
    }
    if (file.size > MAX_TRACK_FILE_SIZE_BYTES) {
      return t('errors.size');
    }
    return null;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      clearInput();
      return;
    }

    setError(null);
    if (hasTrack) {
      setPendingFile(file);
      openReplaceModal();
      return;
    }

    void upload(file);
  };

  const closeConfirmation = (): void => {
    if (isUploading) return;
    setPendingFile(null);
    clearInput();
    closeReplaceModal();
  };

  const confirmReplacement = (): void => {
    if (!pendingFile) return;
    closeReplaceModal();
    void upload(pendingFile);
  };

  if (!raceId) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-sm font-medium text-gray-700">{t('title')}</p>
        <p className="mt-1 text-sm text-gray-500">{t('saveFirst')}</p>
      </div>
    );
  }

  const geometryLabel = result
    ? t(`geometry.${result.geometryType}`)
    : null;
  const summary = result && geometryLabel
    ? result.simplified && result.toleranceMeters !== null
      ? t(result.targetMet ? 'summary.simplified' : 'summary.bestEffort', {
          geometryType: geometryLabel,
          pointCount: result.pointCount,
          segmentCount: result.segmentCount,
          sourcePointCount: result.sourcePointCount,
          toleranceMeters: result.toleranceMeters,
        })
      : t('summary.normalized', {
          geometryType: geometryLabel,
          pointCount: result.pointCount,
          segmentCount: result.segmentCount,
        })
    : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">{t('title')}</p>
          {result && summary ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-emerald-700">
              <CheckCircle2 className="size-4" strokeWidth={2} />
              {summary}
            </p>
          ) : hasTrack ? (
            <p className="mt-1 text-sm text-gray-500">{t('stored')}</p>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".gpx,application/gpx+xml"
          aria-label={t('inputLabel')}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? (
            <LoaderCircle className="size-4 animate-spin" strokeWidth={2} />
          ) : (
            <Upload className="size-4" strokeWidth={2} />
          )}
          {isUploading ? t('uploading') : hasTrack ? t('replace') : t('add')}
        </button>
      </div>

      {error && (
        <ErrorMessage
          title={t('errorTitle')}
          message={error}
          showRetry={false}
          variant="inline"
          className="mt-2 rounded-lg border border-red-100 bg-red-50"
        />
      )}

      <ConfirmationModal
        isOpen={isReplaceModalOpen}
        onClose={closeConfirmation}
        onConfirm={confirmReplacement}
        title={t('confirm.title')}
        message={t('confirm.message', { raceName: raceName || t('unnamed') })}
        confirmButtonText={t('confirm.replace')}
        cancelButtonText={t('confirm.cancel')}
        isSubmitting={isUploading}
      />
    </div>
  );
}
