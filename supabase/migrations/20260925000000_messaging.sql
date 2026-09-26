-- =========================================================
-- TRIBE 2.0 — REAL MESSAGING SYSTEM
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- CONVERSATIONS
-- =========================================================

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_group boolean not null default false,
  title text
);

-- =========================================================
-- CONVERSATION MEMBERS
-- =========================================================

create table if not exists public.conversation_members (
  conversation_id uuid not null
    references public.conversations(id)
    on delete cascade,

  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  joined_at timestamptz not null default now(),

  last_read_at timestamptz,

  muted boolean not null default false,

  archived boolean not null default false,

  primary key (conversation_id, user_id)
);

-- =========================================================
-- MESSAGES
-- =========================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null
    references public.conversations(id)
    on delete cascade,

  sender_id uuid not null
    references public.profiles(id)
    on delete cascade,

  body text,

  message_type text not null default 'text'
    check (
      message_type in (
        'text',
        'image',
        'video',
        'file',
        'system'
      )
    ),

  attachment_url text,

  reply_to_id uuid
    references public.messages(id)
    on delete set null,

  created_at timestamptz not null default now(),

  edited_at timestamptz,

  deleted_at timestamptz
);

-- =========================================================
-- MESSAGE REQUESTS
-- =========================================================

create table if not exists public.message_requests (
  id uuid primary key default gen_random_uuid(),

  sender_id uuid not null
    references public.profiles(id)
    on delete cascade,

  recipient_id uuid not null
    references public.profiles(id)
    on delete cascade,

  conversation_id uuid
    references public.conversations(id)
    on delete cascade,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'accepted',
        'declined'
      )
    ),

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  unique(sender_id, recipient_id, conversation_id)
);

-- =========================================================
-- BLOCKS
-- =========================================================

create table if not exists public.user_blocks (
  blocker_id uuid not null
    references public.profiles(id)
    on delete cascade,

  blocked_id uuid not null
    references public.profiles(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  primary key (blocker_id, blocked_id),

  check (blocker_id <> blocked_id)
);

-- =========================================================
-- REPORTS
-- =========================================================

create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),

  reporter_id uuid not null
    references public.profiles(id)
    on delete cascade,

  message_id uuid
    references public.messages(id)
    on delete set null,

  reported_user_id uuid
    references public.profiles(id)
    on delete set null,

  reason text not null,

  details text,

  created_at timestamptz not null default now()
);

-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists conversations_updated_at_idx
on public.conversations(updated_at desc);

create index if not exists conversation_members_user_idx
on public.conversation_members(user_id);

create index if not exists conversation_members_conversation_idx
on public.conversation_members(conversation_id);

create index if not exists messages_conversation_created_idx
on public.messages(conversation_id, created_at);

create index if not exists messages_sender_idx
on public.messages(sender_id);

create index if not exists message_requests_recipient_idx
on public.message_requests(recipient_id, status);

create index if not exists message_requests_sender_idx
on public.message_requests(sender_id, status);

create index if not exists blocks_blocker_idx
on public.user_blocks(blocker_id);

create index if not exists blocks_blocked_idx
on public.user_blocks(blocked_id);

-- =========================================================
-- UPDATED_AT HELPER
-- =========================================================

create or replace function public.update_conversation_timestamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists messages_update_conversation_timestamp
on public.messages;

create trigger messages_update_conversation_timestamp
after insert or update on public.messages
for each row
execute function public.update_conversation_timestamp();

-- =========================================================
-- RLS
-- =========================================================

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_requests enable row level security;
alter table public.user_blocks enable row level security;
alter table public.message_reports enable row level security;

-- =========================================================
-- CONVERSATIONS
-- =========================================================

create policy "Members can view conversations"
on public.conversations
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conversations.id
      and cm.user_id = auth.uid()
  )
);

create policy "Authenticated users can create conversations"
on public.conversations
for insert
to authenticated
with check (true);

-- =========================================================
-- MEMBERS
-- =========================================================

create policy "Users can view their memberships"
on public.conversation_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conversation_members.conversation_id
      and cm.user_id = auth.uid()
  )
);

create policy "Users can add themselves to conversations"
on public.conversation_members
for insert
to authenticated
with check (
  user_id = auth.uid()
);

create policy "Users can update their membership"
on public.conversation_members
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);

-- =========================================================
-- MESSAGES
-- =========================================================

create policy "Members can read messages"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
  )
);

create policy "Members can send messages"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
  )
  and not exists (
    select 1
    from public.conversation_members cm
    join public.user_blocks b
      on b.blocker_id = cm.user_id
     and b.blocked_id = auth.uid()
    where cm.conversation_id = messages.conversation_id
  )
);

create policy "Users can edit their messages"
on public.messages
for update
to authenticated
using (
  sender_id = auth.uid()
)
with check (
  sender_id = auth.uid()
);

-- =========================================================
-- MESSAGE REQUESTS
-- =========================================================

create policy "Users can view their requests"
on public.message_requests
for select
to authenticated
using (
  sender_id = auth.uid()
  or recipient_id = auth.uid()
);

create policy "Users can send requests"
on public.message_requests
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and sender_id <> recipient_id
);

create policy "Recipients can update requests"
on public.message_requests
for update
to authenticated
using (
  recipient_id = auth.uid()
)
with check (
  recipient_id = auth.uid()
);

-- =========================================================
-- BLOCKS
-- =========================================================

create policy "Users can view their blocks"
on public.user_blocks
for select
to authenticated
using (
  blocker_id = auth.uid()
);

create policy "Users can block"
on public.user_blocks
for insert
to authenticated
with check (
  blocker_id = auth.uid()
);

create policy "Users can unblock"
on public.user_blocks
for delete
to authenticated
using (
  blocker_id = auth.uid()
);

-- =========================================================
-- REPORTS
-- =========================================================

create policy "Users can report messages"
on public.message_reports
for insert
to authenticated
with check (
  reporter_id = auth.uid()
);

-- =========================================================
-- REALTIME
-- =========================================================

alter table public.messages replica identity full;

alter table public.conversation_members replica identity full;

alter table public.message_requests replica identity full;

do $$
begin
  alter publication supabase_realtime
  add table public.messages;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime
  add table public.conversation_members;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime
  add table public.message_requests;
exception
  when duplicate_object then null;
end $$;