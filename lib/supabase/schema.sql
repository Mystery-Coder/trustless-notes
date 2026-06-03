create table users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  ecdh_public_key text not null,
  ecdh_private_key_cipher text not null,
  ecdh_private_key_iv text not null,
  salt text not null,
  sentinel_cipher text not null,
  sentinel_iv text not null,
  sentinel_hash text not null,
  created_at timestamptz default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  title_cipher text not null,
  title_iv text not null,
  content_cipher text not null,
  content_iv text not null,
  wrapped_key_cipher text not null,
  wrapped_key_iv text not null,
  created_at timestamptz default now()
);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references notes(id) on delete cascade not null,
  storage_path text not null,
  iv text not null,
  name text not null,
  mime_type text not null,
  created_at timestamptz default now()
);

create table shared_notes (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references notes(id) on delete cascade not null,
  sender_id uuid references users(id) not null,
  receiver_id uuid references users(id) not null,
  wrapped_notes text not null,
  wrapped_notes_iv text not null,
  created_at timestamptz default now(),
  unique (note_id, receiver_id)
);
