-- Private append-only diagnostic events; no credentials or resource identities.
CREATE TABLE IF NOT EXISTS public.a10_recovery_ingress (
 event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 observed_at timestamptz NOT NULL DEFAULT now(),
 trace_id uuid NOT NULL,
 stage text NOT NULL CHECK(stage IN ('auth_received','auth_rejected','auth_verified'))
);
ALTER TABLE public.a10_recovery_ingress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.a10_recovery_ingress FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.a10_recovery_ingress TO service_role;
CREATE TRIGGER a10_recovery_ingress_append_only BEFORE UPDATE OR DELETE
 ON public.a10_recovery_ingress FOR EACH ROW EXECUTE FUNCTION public.a10_no_rewrite();
CREATE OR REPLACE FUNCTION public.a10_record_recovery_ingress(p_trace_id uuid,p_stage text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_trace_id IS NULL OR p_stage IS NULL OR p_stage NOT IN
 ('auth_received','auth_rejected','auth_verified') THEN
  RAISE EXCEPTION 'invalid_recovery_ingress' USING ERRCODE='23514';
 END IF;
 INSERT INTO public.a10_recovery_ingress(trace_id,stage) VALUES(p_trace_id,p_stage);
END $$;
REVOKE ALL ON FUNCTION public.a10_record_recovery_ingress(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.a10_record_recovery_ingress(uuid,text) TO service_role;
