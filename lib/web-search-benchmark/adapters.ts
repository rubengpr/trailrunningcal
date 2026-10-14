import { createAdapter as exa } from '@/lib/integrations/exa/client';
import { createAdapter as tavily } from '@/lib/integrations/tavily/client';
import { createAdapter as linkup } from '@/lib/integrations/linkup/client';
import { createAdapter as contextDev } from '@/lib/integrations/context-dev/benchmark-client';
import type { Provider, RecordEvent } from '@/types/web-search-benchmark.types';

export function createAdapter(
  provider: Exclude<Provider, 'openai'>,
  record: RecordEvent,
  fetcher?: typeof fetch,
) {
  return { exa, tavily, linkup, 'context-dev': contextDev }[provider](
    record,
    fetcher,
  );
}
