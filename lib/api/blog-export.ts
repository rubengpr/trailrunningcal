export async function downloadDraft(id: string): Promise<void> {
  const response = await fetch(`/api/blog-drafts/${id}/export`, { method: 'POST' });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? 'export_failed');
  }
  const blob = await response.blob();
  const filename = response.headers.get('Content-Disposition')?.match(/filename="([a-z0-9-]+\.mdx)"/)?.[1] ?? 'article.mdx';
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
