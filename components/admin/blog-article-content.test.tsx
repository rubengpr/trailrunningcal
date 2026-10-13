// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BlogArticleContent } from './blog-article-content';

afterEach(cleanup);
describe('article heading indicators', () => {
  it('shows the icon for the actual heading level without changing its text', () => {
    render(<BlogArticleContent html="<h2>Distancia</h2><h3>Perfil <em>técnico</em></h3><p>Texto.</p>" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Distancia' }).querySelector('.lucide-heading-2')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Perfil técnico' }).querySelector('.lucide-heading-3')).toBeTruthy();
    expect(screen.getByText('Texto.').querySelector('svg')).toBeNull();
  });
  it('preserves formatting and safely renders escaped markup', () => {
    const { container } = render(<BlogArticleContent html={"<p><strong>Trail</strong> &amp; montaña &lt;script&gt;</p><ul><li>Uno</li></ul><script>alert(1)</script><h2 onclick='evil()'>Título</h2>"} />);
    expect(container.querySelector('strong')?.textContent).toBe('Trail');
    expect(screen.getByRole('listitem').textContent).toBe('Uno');
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByRole('heading').getAttribute('onclick')).toBeNull();
    expect(container.textContent).toContain('Trail & montaña <script>');
  });
  it('renders line breaks and separators without invalid children', () => {
    const { container } = render(<BlogArticleContent html="<p>Uno<br>Dos</p><hr><h2>Sección</h2>" />);
    expect(container.querySelector('br')).toBeTruthy();
    expect(container.querySelector('hr')).toBeTruthy();
  });
});
