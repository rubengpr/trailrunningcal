// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventImportPreviewModal } from './event-import-preview-modal';

afterEach(cleanup);

describe('EventImportPreviewModal', () => {
  it.each(['button', 'backdrop', 'escape'])('closes from the %s', (method) => {
    const onClose = vi.fn();
    render(
      <EventImportPreviewModal
        isOpen
        closeLabel="Close preview"
        onClose={onClose}
      >
        <span>Preview content</span>
      </EventImportPreviewModal>,
    );

    if (method === 'button') {
      fireEvent.click(screen.getByTitle('Close preview'));
    } else if (method === 'backdrop') {
      fireEvent.click(screen.getByTestId('event-import-preview-backdrop'));
    } else {
      fireEvent.keyDown(document, { key: 'Escape' });
    }

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders nothing while closed', () => {
    render(
      <EventImportPreviewModal
        isOpen={false}
        closeLabel="Close preview"
        onClose={vi.fn()}
      >
        <span>Preview content</span>
      </EventImportPreviewModal>,
    );

    expect(screen.queryByText('Preview content')).toBeNull();
  });
});
