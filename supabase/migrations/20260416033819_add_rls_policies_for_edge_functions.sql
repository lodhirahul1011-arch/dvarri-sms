/*
  # Add RLS Policies for Edge Functions

  Service role edge functions need policies to read/write to tables.
  These policies allow service_role to bypass RLS restrictions.

  ## Changes:
  - Add SELECT policy for service_role on phone_numbers
  - Add INSERT policy for service_role on phone_numbers
  - Add UPDATE policy for service_role on phone_numbers
  - Add DELETE policy for service_role on phone_numbers
  - Add SELECT policy for service_role on sms_logs
  - Add INSERT policy for service_role on sms_logs
  - Add DELETE policy for service_role on sms_logs
*/

DO $$
BEGIN
  DROP POLICY IF EXISTS "service_role_select" ON phone_numbers;
  DROP POLICY IF EXISTS "service_role_insert" ON phone_numbers;
  DROP POLICY IF EXISTS "service_role_update" ON phone_numbers;
  DROP POLICY IF EXISTS "service_role_delete" ON phone_numbers;
  DROP POLICY IF EXISTS "service_role_select" ON sms_logs;
  DROP POLICY IF EXISTS "service_role_insert" ON sms_logs;
  DROP POLICY IF EXISTS "service_role_delete" ON sms_logs;
END $$;

CREATE POLICY "service_role_select" ON phone_numbers
  FOR SELECT TO service_role USING (true);

CREATE POLICY "service_role_insert" ON phone_numbers
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "service_role_update" ON phone_numbers
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_delete" ON phone_numbers
  FOR DELETE TO service_role USING (true);

CREATE POLICY "service_role_select" ON sms_logs
  FOR SELECT TO service_role USING (true);

CREATE POLICY "service_role_insert" ON sms_logs
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "service_role_delete" ON sms_logs
  FOR DELETE TO service_role USING (true);
