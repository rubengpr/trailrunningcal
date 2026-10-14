'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { LoaderCircle, Sparkles, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ErrorMessage, FormErrorMessage } from '@/components/ui/error-message';
import { Button } from '@/components/ui/button';
import { SelectMenu } from '@/components/ui/select-menu';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { useBlog } from '@/hooks/use-blog';
import { useBlogEvents } from '@/hooks/use-blog-events';
import { regionIds } from '@/lib/blog/regions';

export function BlogDraftForm() {
  const t = useTranslations('admin.blog');
  const geography = useTranslations('geography.regions');
  const {regionId, setRegion, selected, setSelected, submit, isSubmitting, requestFailed, acceptedId, clearRequestError} = useBlog();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [invalid, setInvalid] = useState(false);
  const options = useBlogEvents(regionId, search, page);
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    if (!regionId || selected.length !== 5) { setInvalid(true); return; }
    setInvalid(false);
    void submit({regionId, eventIds: selected.map(event => event.id)});
  }
  return <form onSubmit={handleSubmit} noValidate className="space-y-4">
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-60 flex-1">
        <SelectMenu id="blog-region" label={t('selection.region')} value={regionId} placeholder={t('selection.regionPlaceholder')}
          disabled={isSubmitting} options={regionIds.map(id => ({value: id, label: geography(id)}))}
          onValueChange={value => { setRegion(value); setSearch(''); setPage(1); setInvalid(false); }} />
      </div>
      <Button type="submit" disabled={isSubmitting} className="h-10 w-36 shrink-0 gap-2 whitespace-nowrap px-3">
        {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {isSubmitting ? t('sending') : t('submitArticle')}
      </Button>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">{t('selection.count', {count: selected.length})}</span>
      {selected.map(event => <button type="button" key={event.id} disabled={isSubmitting}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs disabled:opacity-50"
        title={t('selection.remove', {name: event.name})}
        onClick={() => { setSelected(current => current.filter(item => item.id !== event.id)); setInvalid(false); clearRequestError(); }}>
        {event.name}<X className="size-3" aria-hidden="true" />
      </button>)}
    </div>
    {regionId ? <div className="space-y-3">
      <label className="block text-sm" htmlFor="blog-event-search">{t('selection.search')}</label>
      <input id="blog-event-search" type="search" value={search} disabled={isSubmitting} placeholder={t('selection.searchPlaceholder')}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        onChange={event => { setSearch(event.target.value); setPage(1); }} />
      {options.loading ? <p role="status" className="flex items-center gap-2 text-sm text-gray-500"><LoaderCircle className="size-4 animate-spin" />{t('selection.loading')}</p> : null}
      {options.failed ? <ErrorMessage message={t('selection.readFailed')} onRetry={options.retry} variant="compact" /> : null}
      {options.data ? <>
        {!options.data.events.length ? <p className="text-sm text-gray-500">{t('selection.empty')}</p> :
          <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
            {options.data.events.map(event => {
              const checked = selected.some(item => item.id === event.id);
              return <label key={event.id} className="flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-gray-50">
                <input type="checkbox" checked={checked} disabled={isSubmitting || (!checked && selected.length >= 5)} className="mt-1 cursor-pointer accent-black"
                  onChange={() => { setSelected(current => checked ? current.filter(item => item.id !== event.id) : current.length < 5 ? [...current, event] : current); setInvalid(false); clearRequestError(); }} />
                <span className="min-w-0"><span className="block text-sm font-medium">{event.name}</span>
                  <span className="mt-1 block text-xs text-gray-500">{[...new Set(event.races.map(race => `${race.city}, ${race.province}`))].join(' · ')}</span>
                  <span className="mt-1 block text-xs text-gray-500">{event.races.map(race => `${race.distanceKm} km${race.elevationGainM === null ? '' : ` / +${race.elevationGainM} m`}`).join(' · ')}</span>
                </span>
              </label>;
            })}
          </div>}
        {options.data.pagination.totalPages > 1 ? <AdminPagination page={page} totalPages={options.data.pagination.totalPages}
          getHref={value => `#blog-events-${value}`} onPageChange={value => {if (!isSubmitting) setPage(value);}} /> : null}
      </> : null}
    </div> : null}
    {invalid ? <FormErrorMessage message={t('selection.required')} /> : null}
    {requestFailed ? <ErrorMessage message={t('selection.requestFailed')} showRetry={false} variant="compact" /> : null}
    {(isSubmitting || acceptedId) ? <p role="status" className="text-xs text-gray-500">{isSubmitting ? t('sendingNotice') : t('acceptedNotice')}</p> : null}
  </form>;
}
