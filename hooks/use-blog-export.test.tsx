// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const download = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/blog-export', () => ({ downloadDraft: download }));
import { useBlogExport } from './use-blog-export';
function Harness() {
  const exporting = useBlogExport('id');
  return <><button onClick={() => { void exporting.submit(); }}>Export</button><span>{exporting.sending ? 'sending' : exporting.error}</span></>;
}
afterEach(cleanup); beforeEach(() => vi.resetAllMocks());
describe('export interaction', () => {
  it('blocks duplicate submissions until the download finishes', async () => {
    let finish!: () => void; download.mockReturnValue(new Promise<void>(resolve => { finish = resolve; })); render(<Harness />);
    fireEvent.click(screen.getByText('Export')); fireEvent.click(screen.getByText('Export'));
    expect(download).toHaveBeenCalledTimes(1); expect(screen.getByText('sending')).toBeTruthy();
    finish(); await waitFor(() => expect(screen.queryByText('sending')).toBeNull());
  });
  it('keeps domain errors and permits retry', async () => {
    download.mockRejectedValueOnce(new Error('missing_alt')); render(<Harness />); fireEvent.click(screen.getByText('Export'));
    await screen.findByText('missing_alt'); fireEvent.click(screen.getByText('Export'));
    await waitFor(() => expect(download).toHaveBeenCalledTimes(2));
  });
});
