-- Stage 10: append-only, private incident observability; already applied to Supabase.
-- No JWTs, personal data, memo text, note/owner IDs or backup material.


-- Stage 10: privacy-preserving recovery instrumentation for signed callers.
-- Never record JWTs, note IDs, owner IDs, request bodies or hashes.
CREATE TABLE IF NOT EXISTS public.a10_restore_observations(
 observation_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 observed_at timestamptz NOT NULL DEFAULT now(),
 identity_kind text NOT NULL CHECK(identity_kind IN ('judge','student')),
 checkpoint text NOT NULL CHECK(checkpoint IN (
  'auth_verified','backup_verified','backup_rejected',
  'version_rejected','restore_committed','restore_rejected',
  'retest_passed','retest_failed')),
 reason text NOT NULL CHECK(reason IN (
  'authenticated','verified_snapshot','not_found','integrity_failed',
  'version_changed','db_rejected','committed','checks_passed',
  'checks_failed','unavailable'))
);
ALTER TABLE public.a10_restore_observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.a10_restore_observations FROM PUBLIC,anon,authenticated;
GRANT INSERT,SELECT ON public.a10_restore_observations TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.a10_restore_observations_observation_id_seq TO service_role;
CREATE TRIGGER a10_restore_observations_append_only
 BEFORE UPDATE OR DELETE ON public.a10_restore_observations
 FOR EACH ROW EXECUTE FUNCTION public.a10_no_rewrite();

CREATE OR REPLACE FUNCTION public.a10_record_restore_observation(
 p_identity_kind text,p_checkpoint text,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_identity_kind NOT IN ('judge','student')
    OR p_checkpoint NOT IN ('auth_verified','backup_verified','backup_rejected',
    'version_rejected','restore_committed','restore_rejected',
    'retest_passed','retest_failed')
    OR p_reason NOT IN ('authenticated','verified_snapshot','not_found',
    'integrity_failed','version_changed','db_rejected','committed',
    'checks_passed','checks_failed','unavailable') THEN
    RAISE EXCEPTION 'restore_telemetry_bad_params' USING ERRCODE='23514';
 END IF;
 INSERT INTO public.a10_restore_observations(identity_kind,checkpoint,reason)
 VALUES(p_identity_kind,p_checkpoint,p_reason);
END $$;
REVOKE ALL ON FUNCTION public.a10_record_restore_observation(text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.a10_record_restore_observation(text,text,text)
 TO service_role;

