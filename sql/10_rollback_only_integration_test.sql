-- Stage 10: rollback-only integration checks against a connected Supabase SQL editor.
-- Generates disposable IDs; never reads or prints existing note contents or tokens.
-- A SQL error aborts validation; COMMIT must never replace final ROLLBACK.
BEGIN;
DO $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_owner uuid := gen_random_uuid();
  p jsonb;
  result jsonb;
  restored_content text;
  stale_rejected boolean := false;
  others_before text;
  others_after text;
BEGIN
  SELECT encode(extensions.digest(
    coalesce(string_agg(id::text || ':' || owner_id::text || ':' ||
      encode(extensions.digest(title || chr(0) || content, 'sha256'), 'hex'),
      '|' ORDER BY id), ''), 'sha256'), 'hex')
    INTO others_before FROM public.a02_private_notes;

  INSERT INTO public.a02_private_notes(id,owner_id,title,content,created_at)
  VALUES (v_id,v_owner,'S10_ROLLBACK_ONLY','original',now());
  -- Mutated note must be restored from an immutable sealed pre-mutation copy.
  UPDATE public.a02_private_notes SET content='attacker-modification' WHERE id=v_id;
  SELECT public.a10_preview_verified_note(v_id,v_owner) INTO p;
  IF p->>'verified' <> 'true' OR NOT (p->'changedFields' ? 'content') THEN
    RAISE EXCEPTION 'stage10_test_preview_not_verified';
  END IF;
  SELECT public.a10_restore_versioned_note(
    v_id,v_owner,p->>'backupVersion',p->>'stateVersion') INTO result;
  SELECT content INTO restored_content FROM public.a02_private_notes WHERE id=v_id;
  IF result->>'restored' <> 'true' OR result->>'ownerId' <> v_owner::text
    OR result->>'id' <> v_id::text OR restored_content <> 'original'
    OR result->>'contentHash' <> p->>'contentHash' THEN
    RAISE EXCEPTION 'stage10_test_single_restore_mismatch';
  END IF;

  -- A second mutation after preview must cause a clean fail-closed version rejection.
  UPDATE public.a02_private_notes SET content='attacker-modification' WHERE id=v_id;
  SELECT public.a10_preview_verified_note(v_id,v_owner) INTO p;
  UPDATE public.a02_private_notes SET content='attacker-changed-again' WHERE id=v_id;
  BEGIN
    PERFORM public.a10_restore_versioned_note(
      v_id,v_owner,p->>'backupVersion',p->>'stateVersion');
  EXCEPTION WHEN check_violation THEN stale_rejected := true;
  END;
  SELECT content INTO restored_content FROM public.a02_private_notes WHERE id=v_id;
  IF NOT stale_rejected OR restored_content <> 'attacker-changed-again' THEN
    RAISE EXCEPTION 'stage10_test_stale_restore_not_rejected';
  END IF;

  SELECT encode(extensions.digest(
    coalesce(string_agg(id::text || ':' || owner_id::text || ':' ||
      encode(extensions.digest(title || chr(0) || content, 'sha256'), 'hex'),
      '|' ORDER BY id), ''), 'sha256'), 'hex')
    INTO others_after FROM public.a02_private_notes WHERE id<>v_id;
  IF others_before IS DISTINCT FROM others_after THEN
    RAISE EXCEPTION 'stage10_test_other_notes_changed';
  END IF;
END $$;
ROLLBACK;
