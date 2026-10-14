create table public.a12_operations_runs (
 run_id uuid primary key,
 checked_at timestamptz not null,
 commit_sha text check (commit_sha is null or commit_sha ~ '^[a-f0-9]{40}$'),
 redacted_report jsonb not null check (jsonb_typeof(redacted_report)='object')
);
alter table public.a12_operations_runs enable row level security;
revoke all on public.a12_operations_runs from public, anon, authenticated, service_role;
grant select, insert on public.a12_operations_runs to service_role;
create trigger a12_operations_runs_append_only before update or delete on public.a12_operations_runs
 for each row execute function public.a10_no_rewrite();
