-- ===========================================================================
-- TransitSpotter - 004 private photo storage
-- Objects are stored under <user id>/<sighting id>/<uuid>.<ext>.
-- A dedicated private bucket keeps this archive separate from other apps
-- that may share the same Supabase project.
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'transitspotter-photos',
  'transitspotter-photos',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "transitspotter_storage_select_own" on storage.objects;
create policy "transitspotter_storage_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'transitspotter-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "transitspotter_storage_insert_own" on storage.objects;
create policy "transitspotter_storage_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'transitspotter-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "transitspotter_storage_update_own" on storage.objects;
create policy "transitspotter_storage_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'transitspotter-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'transitspotter-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "transitspotter_storage_delete_own" on storage.objects;
create policy "transitspotter_storage_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'transitspotter-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Policies are scoped to this bucket only; anon has no matching policy.
