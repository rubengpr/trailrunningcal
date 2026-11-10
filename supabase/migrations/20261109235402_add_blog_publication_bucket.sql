-- Public reads; writes remain backend-only (no client policies for this bucket).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-publications', 'blog-publications', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);
