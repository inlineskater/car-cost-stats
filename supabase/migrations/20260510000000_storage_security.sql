-- Keep uploaded receipts, odometer photos, and attachments private.
-- Files are stored under the authenticated user's UUID as the first path segment.

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('receipts', 'receipts', false),
  ('odometers', 'odometers', false),
  ('attachments', 'attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'car_cost_files_select_own_folder'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "car_cost_files_select_own_folder"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id IN ('receipts', 'odometers', 'attachments')
        AND public.is_allowed_user()
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'car_cost_files_insert_own_folder'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "car_cost_files_insert_own_folder"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id IN ('receipts', 'odometers', 'attachments')
        AND public.is_allowed_user()
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'car_cost_files_update_own_folder'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "car_cost_files_update_own_folder"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id IN ('receipts', 'odometers', 'attachments')
        AND public.is_allowed_user()
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
      WITH CHECK (
        bucket_id IN ('receipts', 'odometers', 'attachments')
        AND public.is_allowed_user()
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'car_cost_files_delete_own_folder'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "car_cost_files_delete_own_folder"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id IN ('receipts', 'odometers', 'attachments')
        AND public.is_allowed_user()
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
    $policy$;
  END IF;
END $$;
