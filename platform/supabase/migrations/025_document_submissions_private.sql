-- Document Submissions — Private Storage Bucket
--
-- document_submissions files (waivers, intake forms — potential PII) were
-- landing in the `assets` bucket under `{client_id}/documents/...`,
-- protected only by UUID-in-path obscurity. `assets` is a *public* bucket
-- (Storage > public, see 002_rls_policies.sql) — its public URL endpoint
-- serves any object unconditionally, so storage.objects RLS policies never
-- actually applied to it. `assets` stays public as-is for logos/product/
-- pet/property photos, which is intentional. Document submissions move to
-- their own private bucket instead, readable only by the owning client's
-- staff (or service_role), served to the seller UI via createSignedUrl()
-- rather than a public URL.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- ponytail: no INSERT policy — uploads only ever go through the
-- service_role client (api/document-checklist/submit), which bypasses
-- storage RLS same as it does table RLS. Add a staff-write policy if
-- staff ever get a direct upload path.
create policy "staff_or_service_read_documents" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (
      auth.role() = 'service_role'
      or (
        auth.role() = 'authenticated'
        and storage.foldername(name)[1]::uuid = (auth.jwt() -> 'app_metadata' ->> 'client_id')::uuid
        and (auth.jwt() -> 'app_metadata' ->> 'role') = 'client_staff'
      )
    )
  );
