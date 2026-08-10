// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BaseModal } from './base-modal';

afterEach(cleanup);

function getModal(title: string): HTMLElement {
  const modal = screen.getByRole('heading', { name: title }).parentElement
    ?.parentElement?.parentElement;

  if (!modal) throw new Error('Modal container not found');
  return modal;
}

describe('BaseModal', () => {
  it('preserves the default centered dialog presentation', () => {
    render(
      <BaseModal isOpen onClose={vi.fn()} title="Default dialog">
        Default content
      </BaseModal>,
    );

    const classes = getModal('Default dialog').className.split(' ');
    expect(classes).toContain('mx-4');
    expect(classes).toContain('rounded-lg');
    expect(classes).not.toContain('h-dvh');
  });

  it('opts into a full-height mobile presentation with a labeled close target', () => {
    render(
      <BaseModal
        closeLabel="Cerrar"
        isOpen
        mobileFullscreen
        onClose={vi.fn()}
        title="Mobile map"
      >
        Map content
      </BaseModal>,
    );

    const classes = getModal('Mobile map').className.split(' ');
    expect(classes).toContain('h-dvh');
    expect(classes).toContain('sm:mx-4');
    expect(classes).not.toContain('mx-4');
    expect(screen.getByRole('button', { name: 'Cerrar' }).className).toContain(
      'size-11',
    );
  });
});
