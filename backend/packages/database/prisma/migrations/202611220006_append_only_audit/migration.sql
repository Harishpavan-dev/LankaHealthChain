-- Defense in depth: block accidental or application-level modification of audit records.
-- This does NOT make the database tamper-proof against its owner/superuser;
-- signed, independently replicated audit exports are still necessary for production.
CREATE FUNCTION lhc_reject_audit_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent records are append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER lhc_audit_append_only BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION lhc_reject_audit_mutation();
