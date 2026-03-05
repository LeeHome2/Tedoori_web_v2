-- Enable Row Level Security on about_audit_log table
ALTER TABLE about_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users (admins) can read audit logs
CREATE POLICY "Enable read access for authenticated users only" ON about_audit_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: No direct inserts allowed (only via trigger)
-- The trigger uses SECURITY DEFINER, so it bypasses RLS
CREATE POLICY "Deny all direct inserts" ON about_audit_log
  FOR INSERT WITH CHECK (false);

-- Policy: No updates allowed on audit logs (immutable)
CREATE POLICY "Deny all updates" ON about_audit_log
  FOR UPDATE USING (false);

-- Policy: No deletes allowed on audit logs (immutable)
CREATE POLICY "Deny all deletes" ON about_audit_log
  FOR DELETE USING (false);
