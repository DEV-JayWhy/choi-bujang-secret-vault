-- Stage 10 SQL migration; already applied 20261013061323.
-- Contains no note contents, real user IDs, tokens, or keys.


-- Stage 10: private immutable point-in-time backups and isolated policy laboratory.
-- All existing notes and production RLS policy definitions are preserved.
CREATE TABLE IF NOT EXISTS public.a10_note_backups (
  note_id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL,
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  title_sha256 text NOT NULL CHECK (title_sha256 ~ '^[0-9a-f]{64}$'),
  backed_up_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.a10_policy_backups (
  policy_name text PRIMARY KEY,
  definition jsonb NOT NULL,
  definition_sha256 text NOT NULL CHECK (definition_sha256 ~ '^[0-9a-f]{64}$'),
  backed_up_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.a10_test_policies (
  policy_name text PRIMARY KEY REFERENCES public.a10_policy_backups(policy_name),
  definition jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.a10_recovery_audit (
  audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  happened_at timestamptz NOT NULL DEFAULT now(),
  operation text NOT NULL CHECK (operation IN ('restore_note','restore_test_policy')),
  note_id uuid,
  owner_id uuid,
  reason_code text NOT NULL,
  changed_count integer NOT NULL DEFAULT 0
);
ALTER TABLE public.a10_note_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.a10_policy_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.a10_test_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.a10_recovery_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.a10_note_backups, public.a10_policy_backups,
 public.a10_test_policies, public.a10_recovery_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.a10_note_backups, public.a10_policy_backups,
 public.a10_test_policies, public.a10_recovery_audit TO service_role;
GRANT INSERT ON public.a10_recovery_audit TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.a10_recovery_audit_audit_id_seq TO service_role;

-- Immutable backups and append-only audit: even the service_role must not rewrite evidence.
CREATE OR REPLACE FUNCTION public.a10_no_rewrite() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  RAISE EXCEPTION 'stage10_immutable_record' USING ERRCODE='23514';
END;
$$;
REVOKE ALL ON FUNCTION public.a10_no_rewrite() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER a10_note_backup_immutable BEFORE UPDATE OR DELETE ON public.a10_note_backups
  FOR EACH ROW EXECUTE FUNCTION public.a10_no_rewrite();
CREATE TRIGGER a10_policy_backup_immutable BEFORE UPDATE OR DELETE ON public.a10_policy_backups
  FOR EACH ROW EXECUTE FUNCTION public.a10_no_rewrite();
CREATE TRIGGER a10_audit_append_only BEFORE UPDATE OR DELETE ON public.a10_recovery_audit
  FOR EACH ROW EXECUTE FUNCTION public.a10_no_rewrite();

-- Capture CURRENT live notes before the future simulated Stage-10 incident.
-- This is NOT evidence of any earlier pre-existing backup.
INSERT INTO public.a10_note_backups
 (note_id,owner_id,title,content,created_at,content_sha256,title_sha256)
SELECT n.id,n.owner_id,n.title,n.content,n.created_at,
 encode(extensions.digest(n.content,'sha256'),'hex'),
 encode(extensions.digest(n.title,'sha256'),'hex')
FROM public.a02_private_notes AS n
WHERE n.owner_id IS NOT NULL
ON CONFLICT (note_id) DO NOTHING;

-- For future simulated accounts, capture baseline atomically when their notes are first created.
CREATE OR REPLACE FUNCTION public.a10_capture_new_note() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.a10_note_backups
  (note_id,owner_id,title,content,created_at,content_sha256,title_sha256)
  VALUES (NEW.id,NEW.owner_id,NEW.title,NEW.content,NEW.created_at,
    encode(extensions.digest(NEW.content,'sha256'),'hex'),
    encode(extensions.digest(NEW.title,'sha256'),'hex'))
  ON CONFLICT (note_id) DO NOTHING;
  IF EXISTS(SELECT 1 FROM public.a10_note_backups b
    WHERE b.note_id=NEW.id AND b.owner_id <> NEW.owner_id) THEN
    RAISE EXCEPTION 'stage10_backup_owner_conflict' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.a10_capture_new_note() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER a10_backup_after_note_insert AFTER INSERT ON public.a02_private_notes
  FOR EACH ROW EXECUTE FUNCTION public.a10_capture_new_note();

-- Validated point-in-time copy of the actual current note RLS policies.
WITH definitions AS (
 SELECT p.policyname AS name,
 jsonb_build_object('table',p.tablename,'command',p.cmd,
   'roles',p.roles,'permissive',p.permissive,
   'using',p.qual,'with_check',p.with_check) AS def
 FROM pg_policies p
 WHERE p.schemaname='public' AND p.tablename='a02_private_notes'
)
INSERT INTO public.a10_policy_backups(policy_name,definition,definition_sha256)
SELECT name,def,encode(extensions.digest(def::text,'sha256'),'hex')
FROM definitions
ON CONFLICT (policy_name) DO NOTHING;
INSERT INTO public.a10_test_policies(policy_name,definition)
SELECT b.policy_name,b.definition FROM public.a10_policy_backups b
ON CONFLICT (policy_name) DO NOTHING;

-- Only a server caller with a cryptographically verified owner may request previews.
CREATE OR REPLACE FUNCTION public.a10_note_restore_preview(p_note_id uuid,p_owner_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.a10_note_backups%ROWTYPE;
        current_row public.a02_private_notes%ROWTYPE;
        present boolean := false;
        changed boolean := true;
BEGIN
  SELECT * INTO b FROM public.a10_note_backups
    WHERE note_id=p_note_id AND owner_id=p_owner_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'stage10_backup_not_found' USING ERRCODE='P0002'; END IF;
  IF b.content_sha256 <> encode(extensions.digest(b.content,'sha256'),'hex')
    OR b.title_sha256 <> encode(extensions.digest(b.title,'sha256'),'hex') THEN
    RAISE EXCEPTION 'stage10_backup_corrupt' USING ERRCODE='23514';
  END IF;
  SELECT * INTO current_row FROM public.a02_private_notes WHERE id=p_note_id;
  present := FOUND;
  IF present AND current_row.owner_id IS DISTINCT FROM p_owner_id THEN
    RAISE EXCEPTION 'stage10_current_owner_conflict' USING ERRCODE='23514';
  END IF;
  IF present THEN
    changed := current_row.title IS DISTINCT FROM b.title
      OR current_row.content IS DISTINCT FROM b.content;
  END IF;
  RETURN jsonb_build_object('id',b.note_id,'ownerId',b.owner_id,
    'contentHash',b.content_sha256,'titleHash',b.title_sha256,
    'backupAt',b.backed_up_at,'existsNow',present,'wouldRestore',changed,
    'verified',true);
END;
$$;
REVOKE ALL ON FUNCTION public.a10_note_restore_preview(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.a10_note_restore_preview(uuid,uuid) TO service_role;

-- Atomic one-note recovery. No other note is updated and audit is append-only.
CREATE OR REPLACE FUNCTION public.a10_restore_note(p_note_id uuid,p_owner_id uuid,p_expected_hash text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.a10_note_backups%ROWTYPE;
        current_owner uuid;
        restored_id uuid;
BEGIN
  SELECT * INTO b FROM public.a10_note_backups
    WHERE note_id=p_note_id AND owner_id=p_owner_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'stage10_backup_not_found' USING ERRCODE='P0002'; END IF;
  IF b.content_sha256 <> encode(extensions.digest(b.content,'sha256'),'hex')
    OR b.title_sha256 <> encode(extensions.digest(b.title,'sha256'),'hex')
    OR (p_expected_hash IS NOT NULL AND b.content_sha256 <> p_expected_hash) THEN
    RAISE EXCEPTION 'stage10_backup_corrupt_or_mismatched' USING ERRCODE='23514';
  END IF;
  SELECT owner_id INTO current_owner FROM public.a02_private_notes
    WHERE id=p_note_id FOR UPDATE;
  IF FOUND AND current_owner IS DISTINCT FROM p_owner_id THEN
    RAISE EXCEPTION 'stage10_current_owner_conflict' USING ERRCODE='23514';
  END IF;
  INSERT INTO public.a02_private_notes AS n
    (id,owner_id,title,content,created_at)
  VALUES (b.note_id,b.owner_id,b.title,b.content,b.created_at)
  ON CONFLICT (id) DO UPDATE
    SET title=excluded.title, content=excluded.content
    WHERE n.owner_id=excluded.owner_id
  RETURNING id INTO restored_id;
  IF restored_id IS NULL THEN RAISE EXCEPTION 'stage10_restore_conflict' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.a02_private_notes n
    WHERE n.id=b.note_id AND n.owner_id=b.owner_id
      AND encode(extensions.digest(n.content,'sha256'),'hex')=b.content_sha256
      AND encode(extensions.digest(n.title,'sha256'),'hex')=b.title_sha256
  ) THEN RAISE EXCEPTION 'stage10_post_restore_hash_mismatch' USING ERRCODE='23514'; END IF;
  INSERT INTO public.a10_recovery_audit(operation,note_id,owner_id,reason_code,changed_count)
  VALUES ('restore_note',b.note_id,b.owner_id,'verified_backup_restore',1);
  RETURN jsonb_build_object('id',b.note_id,'ownerId',b.owner_id,
    'contentHash',b.content_sha256,'restored',true);
END;
$$;
REVOKE ALL ON FUNCTION public.a10_restore_note(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.a10_restore_note(uuid,uuid,text) TO service_role;

-- Only the isolated TEST policy copy is eligible for rollback.
CREATE OR REPLACE FUNCTION public.a10_policy_diff()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE total integer; test_total integer; manifest text; changes jsonb;
BEGIN
  SELECT count(*),encode(extensions.digest(string_agg(policy_name || ':' || definition_sha256,'|' ORDER BY policy_name),'sha256'),'hex')
    INTO total,manifest FROM public.a10_policy_backups;
  IF total < 1 OR manifest IS NULL THEN
    RAISE EXCEPTION 'stage10_policy_backup_missing' USING ERRCODE='P0002';
  END IF;
  IF EXISTS (SELECT 1 FROM public.a10_policy_backups b WHERE
    encode(extensions.digest(b.definition::text,'sha256'),'hex')<>b.definition_sha256) THEN
    RAISE EXCEPTION 'stage10_policy_backup_corrupt' USING ERRCODE='23514';
  END IF;
  SELECT count(*) INTO test_total FROM public.a10_test_policies;
  IF total <> test_total OR EXISTS (SELECT 1 FROM public.a10_policy_backups b
    WHERE NOT EXISTS(SELECT 1 FROM public.a10_test_policies t WHERE t.policy_name=b.policy_name)) THEN
    RAISE EXCEPTION 'stage10_test_policy_scope_mismatch' USING ERRCODE='23514';
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('rule',b.policy_name,
    'safeHash',b.definition_sha256,
    'currentHash',encode(extensions.digest(t.definition::text,'sha256'),'hex'))
    ORDER BY b.policy_name),'[]'::jsonb)
  INTO changes
  FROM public.a10_policy_backups b
  JOIN public.a10_test_policies t USING(policy_name)
  WHERE b.definition IS DISTINCT FROM t.definition;
  RETURN jsonb_build_object('backupVerified',true,'backupVersion',manifest,
    'policyCount',total,'changes',changes,'scope','test_only');
END;
$$;
REVOKE ALL ON FUNCTION public.a10_policy_diff() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.a10_policy_diff() TO service_role;

CREATE OR REPLACE FUNCTION public.a10_restore_test_policies(p_expected_version text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE preview jsonb; changed integer;
BEGIN
  SELECT public.a10_policy_diff() INTO preview;
  IF preview->>'backupVersion' IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION 'stage10_backup_version_mismatch' USING ERRCODE='23514';
  END IF;
  UPDATE public.a10_test_policies t SET definition=b.definition,updated_at=now()
  FROM public.a10_policy_backups b
  WHERE t.policy_name=b.policy_name AND t.definition IS DISTINCT FROM b.definition;
  GET DIAGNOSTICS changed = ROW_COUNT;
  INSERT INTO public.a10_recovery_audit(operation,reason_code,changed_count)
  VALUES ('restore_test_policy','verified_policy_backup',changed);
  RETURN jsonb_build_object('backupVersion',p_expected_version,
    'restoredRuleCount',changed,'scope','test_only','verified',true);
END;
$$;
REVOKE ALL ON FUNCTION public.a10_restore_test_policies(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.a10_restore_test_policies(text) TO service_role;

