-- Separate server-side request registry. Existing notes/backups/audits are untouched.
create table public.a11_device_requests (
  request_id uuid primary key,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  owner_id uuid not null references auth.users(id),
  state text not null default 'pending' check (state in ('pending','approved','revoked')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  expires_at timestamptz not null,
  check ((state = 'approved' and approved_at is not null) or state <> 'approved'),
  check (expires_at > created_at)
);
alter table public.a11_device_requests enable row level security;
revoke all on public.a11_device_requests from public, anon, authenticated, service_role;
-- App can request/read, but cannot approve a row, even with its service key.
grant select, insert on public.a11_device_requests to service_role;
comment on table public.a11_device_requests is 'Device requests: approval is an operator action, never a browser installation badge or request button';
