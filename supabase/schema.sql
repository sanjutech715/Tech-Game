create table if not exists public.students (
    reg text primary key,
    payload jsonb not null check (jsonb_typeof(payload) = 'object'),
    updated_at timestamptz not null default now()
);

alter table public.students enable row level security;
revoke all on table public.students from anon, authenticated;
grant all on table public.students to service_role;
