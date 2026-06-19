create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists aomi_users (
  id uuid primary key default gen_random_uuid(),
  better_auth_user_id text unique,
  display_name text,
  primary_email citext,
  avatar_url text,
  metadata jsonb not null default '{}'::jsonb,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aomi_users_primary_email_idx
  on aomi_users (primary_email)
  where primary_email is not null and deactivated_at is null;

create table if not exists aomi_auth_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references aomi_users(id),
  provider text not null,
  subject text not null,
  email citext,
  display_label text,
  provider_metadata jsonb not null default '{}'::jsonb,
  linked_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint aomi_auth_identities_provider_check
    check (provider in ('better_auth', 'siwe', 'privy', 'para', 'email'))
);

create unique index if not exists aomi_auth_identities_active_unique
  on aomi_auth_identities (provider, subject)
  where revoked_at is null;

create unique index if not exists aomi_auth_identities_active_email_unique
  on aomi_auth_identities (provider, email)
  where provider = 'email' and email is not null and revoked_at is null;

create table if not exists aomi_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references aomi_users(id),
  family text not null,
  address text not null,
  normalized_address text not null,
  caip10 text,
  chain_scope text,
  kind text not null default 'external',
  provider text,
  provider_wallet_id text,
  linked_via text not null,
  label text,
  display_metadata jsonb not null default '{}'::jsonb,
  verified_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint aomi_wallets_family_check check (family in ('evm', 'svm')),
  constraint aomi_wallets_kind_check check (kind in ('external', 'embedded', 'smart_account')),
  constraint aomi_wallets_linked_via_check check (linked_via in ('siwe', 'siws', 'privy', 'para', 'import', 'observed', 'migration'))
);

create unique index if not exists aomi_wallets_active_unique
  on aomi_wallets (family, normalized_address, coalesce(chain_scope, '*'))
  where revoked_at is null;

create table if not exists aomi_account_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references aomi_users(id),
  actor_user_id uuid references aomi_users(id),
  event_type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists aomi_account_events_user_idx
  on aomi_account_events (user_id, created_at desc);
