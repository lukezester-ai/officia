insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'officia-documents',
  'officia-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Service role can manage Officia documents"
on storage.objects
for all
to service_role
using (bucket_id = 'officia-documents')
with check (bucket_id = 'officia-documents');
