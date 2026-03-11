create table users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  salt text not null,
  sentinel_cipher text not null,
  sentinel_iv text not null,
  created_at timestamptz default now()
);