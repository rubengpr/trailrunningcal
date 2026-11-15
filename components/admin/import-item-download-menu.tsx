'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { IconActionMenu } from '@/components/ui/icon-action-menu';
import { getEventImportItemArtifacts } from '@/lib/api/events';
import { triggerDownload } from '@/lib/utils/download';
import type { EventImportItemArtifacts } from '@/types/events-import-api.types';

interface ImportItemDownloadMenuProps {
  itemId: string;
  url: string | null;
  available: boolean;
  initialArtifacts?: EventImportItemArtifacts;
}

export default function ImportItemDownloadMenu({
  itemId,
  url,
  available,
  initialArtifacts,
}: ImportItemDownloadMenuProps) {
  const t = useTranslations('admin.events.import.bulk');
  const [artifacts, setArtifacts] = useState<EventImportItemArtifacts | null>(initialArtifacts ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const inFlight = useRef(false);
  let hostname = 'file';
  try {
    if (url) hostname = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    // Keep the fallback filename for an invalid source URL.
  }

  const loadArtifacts = async () => {
    if (!available || artifacts || inFlight.current) return;
    inFlight.current = true;
    setIsLoading(true);
    try {
      setArtifacts(await getEventImportItemArtifacts(itemId));
    } catch {
      toast.error(t('resultError'));
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  };

  return (
    <IconActionMenu
      triggerAriaLabel={t('columns.actions')}
      triggerTitle={isLoading ? t('actions.loading') : undefined}
      size="sm"
      onOpen={() => void loadArtifacts()}
      items={[
        {
          id: 'downloadMarkdown',
          label: t('actions.downloadMarkdown'),
          disabled: !artifacts?.markdown,
          onSelect: () => {
            if (artifacts?.markdown) {
              triggerDownload(artifacts.markdown, `crawl-${hostname}.md`, 'text/markdown');
            }
          },
        },
        {
          id: 'downloadJson',
          label: t('actions.downloadJson'),
          disabled: !artifacts?.rawModelOutput,
          onSelect: () => {
            if (artifacts?.rawModelOutput) {
              triggerDownload(artifacts.rawModelOutput, `model-raw-${hostname}.json`, 'application/json;charset=utf-8');
            }
          },
        },
      ]}
    />
  );
}
