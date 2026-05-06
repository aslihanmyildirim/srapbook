drop policy if exists "Anon can read test scrapbook media" on storage.objects;
create policy "Anon can read test scrapbook media"
on storage.objects for select
to anon
using (
  bucket_id = 'scrapbook-media'
  and (storage.foldername(name))[1] = 'anon'
);

drop policy if exists "Anon can upload test scrapbook media" on storage.objects;
create policy "Anon can upload test scrapbook media"
on storage.objects for insert
to anon
with check (
  bucket_id = 'scrapbook-media'
  and (storage.foldername(name))[1] = 'anon'
);

drop policy if exists "Anon can update test scrapbook media" on storage.objects;
create policy "Anon can update test scrapbook media"
on storage.objects for update
to anon
using (
  bucket_id = 'scrapbook-media'
  and (storage.foldername(name))[1] = 'anon'
)
with check (
  bucket_id = 'scrapbook-media'
  and (storage.foldername(name))[1] = 'anon'
);
