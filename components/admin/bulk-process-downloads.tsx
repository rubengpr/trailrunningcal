'use client';

import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { IconActionMenu } from '@/components/ui/icon-action-menu';
import { triggerDownload } from '@/lib/utils/download';
import type { EventImportArtifacts } from '@/types/events-import-api.types';

interface BulkProcessDownloadsProps {
  artifacts: EventImportArtifacts;
  loadArtifacts?: () => Promise<EventImportArtifacts | null>;
  hostname: string;
  disabled: boolean;
  labels: { actions: string; markdown: string; json: string };
}

export default function BulkProcessDownloads({
  artifacts,
  loadArtifacts,
  hostname,
  disabled,
  labels,
}: BulkProcessDownloadsProps) {
  const [loadedArtifacts, setLoadedArtifacts] = useState<EventImportArtifacts | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const content = loadedArtifacts ?? artifacts;

  const load = async () => {
    if (!loadArtifacts || loadedArtifacts || isLoading) return;
    setIsLoading(true);
    try {
      setLoadedArtifacts(await loadArtifacts());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IconActionMenu
      triggerAriaLabel={labels.actions}
      size="sm"
      disabled={disabled}
      triggerIcon={isLoading ? <LoaderCircle className="size-3.5 animate-spin" /> : undefined}
      onOpen={() => { void load(); }}
      items={[
        {
          id: 'downloadMarkdown',
          label: labels.markdown,
          disabled: isLoading || !content.markdown,
          onSelect: () => {
            if (content.markdown) {
              triggerDownload(content.markdown, `crawl-${hostname}.md`, 'text/markdown');
            }
          },
        },
        {
          id: 'downloadJson',
          label: labels.json,
          disabled: isLoading || !content.rawModelOutput,
          onSelect: () => {
            if (content.rawModelOutput) {
              triggerDownload(content.rawModelOutput, `model-raw-${hostname}.json`, 'application/json;charset=utf-8');
            }
          },
        },
      ]}
    />
  );
}
