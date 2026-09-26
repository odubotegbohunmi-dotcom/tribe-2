-- Tribe 2.0 core data model and row-level security.
-- This migration is additive: it does not delete existing user or profile data.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username = lower(username) and username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  bio text not null default '' check (char_length(bio) <= 500),
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Make pre-existing profiles compatible without removing or rewriting their data.
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.profiles add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and contype = 'f' and confrelid = 'auth.users'::regclass) then
    alter table public.profiles add constraint profiles_id_auth_users_fkey foreign key (id) references auth.users(id) on delete cascade not valid;
  end if;
end;
$$;

create unique index if not exists profiles_username_unique_idx on public.profiles (username) where username is not null;

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);

create table if not exists public.tribes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9-]{3,60}$'),
  name text not null check (char_length(name) between 3 and 80),
  description text not null default '' check (char_length(description) <= 1000),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tribe_members (
  tribe_id uuid not null references public.tribes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'moderator', 'member')),
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (tribe_id, user_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  tribe_id uuid references public.tribes(id) on delete set null,
  body text not null default '' check (char_length(body) <= 5000),
  media jsonb not null default '[]'::jsonb check (jsonb_typeof(media) = 'array'),
  visibility text not null default 'public' check (visibility in ('public', 'followers', 'tribe', 'private')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint posts_has_content check (char_length(trim(body)) > 0 or jsonb_array_length(media) > 0),
  constraint posts_tribe_visibility check (visibility <> 'tribe' or tribe_id is not null)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete set null,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, post_id)
);

create table if not exists public.reposts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, post_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'direct' check (kind in ('direct', 'group')),
  title text check (char_length(title) <= 120),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  media jsonb not null default '[]'::jsonb check (jsonb_typeof(media) = 'array'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('follow', 'like', 'comment', 'repost', 'mention', 'message', 'tribe')),
  entity_type text,
  entity_id uuid,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('profile', 'post', 'comment', 'tribe', 'message')),
  target_id uuid not null,
  reason text not null check (char_length(trim(reason)) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  moderator_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint reports_one_per_target unique (reporter_id, target_type, target_id)
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self_block check (blocker_id <> blocked_id)
);

create index if not exists follows_following_created_idx on public.follows (following_id, created_at desc);
create index if not exists posts_author_created_idx on public.posts (author_id, created_at desc);
create index if not exists posts_tribe_created_idx on public.posts (tribe_id, created_at desc) where tribe_id is not null;
create index if not exists posts_public_created_idx on public.posts (created_at desc) where visibility = 'public';
create index if not exists comments_post_created_idx on public.comments (post_id, created_at);
create index if not exists likes_post_created_idx on public.likes (post_id, created_at desc);
create index if not exists reposts_post_created_idx on public.reposts (post_id, created_at desc);
create index if not exists tribe_members_user_idx on public.tribe_members (user_id, joined_at desc);
create index if not exists conversation_members_user_idx on public.conversation_members (user_id, conversation_id);
create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index if not exists notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);
create index if not exists reports_status_created_idx on public.reports (status, created_at);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists tribes_set_updated_at on public.tribes;
create trigger tribes_set_updated_at before update on public.tribes for each row execute function public.set_updated_at();
drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts for each row execute function public.set_updated_at();
drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at before update on public.comments for each row execute function public.set_updated_at();
drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at before update on public.conversations for each row execute function public.set_updated_at();
drop trigger if exists messages_set_updated_at on public.messages;
create trigger messages_set_updated_at before update on public.messages for each row execute function public.set_updated_at();
drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at before update on public.notifications for each row execute function public.set_updated_at();

create or replace function public.is_tribe_member(target_tribe_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tribe_members where tribe_id = target_tribe_id and user_id = auth.uid());
$$;

create or replace function public.is_tribe_moderator(target_tribe_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tribe_members where tribe_id = target_tribe_id and user_id = auth.uid() and role in ('owner', 'moderator'));
$$;

create or replace function public.is_tribe_owner(target_tribe_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tribes where id = target_tribe_id and owner_id = auth.uid());
$$;

create or replace function public.can_read_post(target_post_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.posts p
    where p.id = target_post_id and (
      p.visibility = 'public' or p.author_id = auth.uid()
      or (p.visibility = 'followers' and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.author_id))
      or (p.tribe_id is not null and public.is_tribe_member(p.tribe_id))
    )
  );
$$;

create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_members where conversation_id = target_conversation_id and user_id = auth.uid());
$$;

create or replace function public.is_conversation_creator(target_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversations where id = target_conversation_id and created_by = auth.uid());
$$;

create or replace function public.add_tribe_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.tribe_members (tribe_id, user_id, role) values (new.id, new.owner_id, 'owner') on conflict (tribe_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists tribes_add_owner on public.tribes;
create trigger tribes_add_owner after insert on public.tribes for each row execute function public.add_tribe_owner();

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.reposts enable row level security;
alter table public.tribes enable row level security;
alter table public.tribe_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;

drop policy if exists profiles_read_authenticated on public.profiles;
create policy profiles_read_authenticated on public.profiles for select to authenticated using (true);
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists follows_read_authenticated on public.follows;
create policy follows_read_authenticated on public.follows for select to authenticated using (true);
drop policy if exists follows_insert_self on public.follows;
create policy follows_insert_self on public.follows for insert to authenticated with check (follower_id = auth.uid() and follower_id <> following_id);
drop policy if exists follows_delete_self on public.follows;
create policy follows_delete_self on public.follows for delete to authenticated using (follower_id = auth.uid());

drop policy if exists tribes_read_visible on public.tribes;
create policy tribes_read_visible on public.tribes for select to authenticated using (visibility = 'public' or public.is_tribe_member(id));
drop policy if exists tribes_create_self on public.tribes;
create policy tribes_create_self on public.tribes for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists tribes_update_owner on public.tribes;
create policy tribes_update_owner on public.tribes for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists tribes_delete_owner on public.tribes;
create policy tribes_delete_owner on public.tribes for delete to authenticated using (owner_id = auth.uid());

drop policy if exists tribe_members_read_visible on public.tribe_members;
create policy tribe_members_read_visible on public.tribe_members for select to authenticated using (public.is_tribe_member(tribe_id) or exists (select 1 from public.tribes t where t.id = tribe_id and t.visibility = 'public'));
drop policy if exists tribe_members_join_public on public.tribe_members;
create policy tribe_members_join_public on public.tribe_members for insert to authenticated with check (user_id = auth.uid() and role = 'member' and exists (select 1 from public.tribes t where t.id = tribe_id and t.visibility = 'public'));
drop policy if exists tribe_members_manage_by_moderator on public.tribe_members;
drop policy if exists tribe_members_manage_by_owner on public.tribe_members;
create policy tribe_members_manage_by_owner on public.tribe_members for all to authenticated using (public.is_tribe_owner(tribe_id) and role <> 'owner') with check (public.is_tribe_owner(tribe_id) and role in ('member', 'moderator'));
drop policy if exists tribe_members_remove_by_moderator on public.tribe_members;
create policy tribe_members_remove_by_moderator on public.tribe_members for delete to authenticated using (public.is_tribe_moderator(tribe_id) and role <> 'owner');
drop policy if exists tribe_members_leave_self on public.tribe_members;
create policy tribe_members_leave_self on public.tribe_members for delete to authenticated using (user_id = auth.uid() and role <> 'owner');

drop policy if exists posts_read_visible on public.posts;
create policy posts_read_visible on public.posts for select to authenticated using (public.can_read_post(id));
drop policy if exists posts_create_self on public.posts;
create policy posts_create_self on public.posts for insert to authenticated with check (author_id = auth.uid() and (tribe_id is null or public.is_tribe_member(tribe_id)));
drop policy if exists posts_update_self on public.posts;
create policy posts_update_self on public.posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid() and (tribe_id is null or public.is_tribe_member(tribe_id)));
drop policy if exists posts_delete_self on public.posts;
create policy posts_delete_self on public.posts for delete to authenticated using (author_id = auth.uid());

drop policy if exists comments_read_visible on public.comments;
create policy comments_read_visible on public.comments for select to authenticated using (public.can_read_post(post_id));
drop policy if exists comments_create_self on public.comments;
create policy comments_create_self on public.comments for insert to authenticated with check (author_id = auth.uid() and public.can_read_post(post_id));
drop policy if exists comments_update_self on public.comments;
create policy comments_update_self on public.comments for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists comments_delete_self on public.comments;
create policy comments_delete_self on public.comments for delete to authenticated using (author_id = auth.uid());

drop policy if exists likes_read_visible on public.likes;
create policy likes_read_visible on public.likes for select to authenticated using (public.can_read_post(post_id));
drop policy if exists likes_insert_self on public.likes;
create policy likes_insert_self on public.likes for insert to authenticated with check (user_id = auth.uid() and public.can_read_post(post_id));
drop policy if exists likes_delete_self on public.likes;
create policy likes_delete_self on public.likes for delete to authenticated using (user_id = auth.uid());

drop policy if exists reposts_read_visible on public.reposts;
create policy reposts_read_visible on public.reposts for select to authenticated using (public.can_read_post(post_id));
drop policy if exists reposts_insert_self on public.reposts;
create policy reposts_insert_self on public.reposts for insert to authenticated with check (user_id = auth.uid() and public.can_read_post(post_id));
drop policy if exists reposts_delete_self on public.reposts;
create policy reposts_delete_self on public.reposts for delete to authenticated using (user_id = auth.uid());

drop policy if exists conversations_read_member on public.conversations;
create policy conversations_read_member on public.conversations for select to authenticated using (public.is_conversation_member(id));
drop policy if exists conversations_create_self on public.conversations;
create policy conversations_create_self on public.conversations for insert to authenticated with check (created_by = auth.uid());
drop policy if exists conversations_update_creator on public.conversations;
create policy conversations_update_creator on public.conversations for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists conversations_delete_creator on public.conversations;
create policy conversations_delete_creator on public.conversations for delete to authenticated using (created_by = auth.uid());

drop policy if exists conversation_members_read_member on public.conversation_members;
create policy conversation_members_read_member on public.conversation_members for select to authenticated using (public.is_conversation_member(conversation_id));
drop policy if exists conversation_members_add_creator on public.conversation_members;
create policy conversation_members_add_creator on public.conversation_members for insert to authenticated with check (public.is_conversation_creator(conversation_id));
drop policy if exists conversation_members_update_self on public.conversation_members;
create policy conversation_members_update_self on public.conversation_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists conversation_members_remove on public.conversation_members;
create policy conversation_members_remove on public.conversation_members for delete to authenticated using (user_id = auth.uid() or public.is_conversation_creator(conversation_id));

drop policy if exists messages_read_member on public.messages;
create policy messages_read_member on public.messages for select to authenticated using (public.is_conversation_member(conversation_id));
drop policy if exists messages_send_self on public.messages;
create policy messages_send_self on public.messages for insert to authenticated with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));
drop policy if exists messages_update_self on public.messages;
create policy messages_update_self on public.messages for update to authenticated using (sender_id = auth.uid() and public.is_conversation_member(conversation_id)) with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));
drop policy if exists messages_delete_self on public.messages;
create policy messages_delete_self on public.messages for delete to authenticated using (sender_id = auth.uid() and public.is_conversation_member(conversation_id));

drop policy if exists notifications_read_self on public.notifications;
create policy notifications_read_self on public.notifications for select to authenticated using (recipient_id = auth.uid());
drop policy if exists notifications_update_self on public.notifications;
create policy notifications_update_self on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

drop policy if exists reports_create_self on public.reports;
create policy reports_create_self on public.reports for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists reports_read_self on public.reports;
create policy reports_read_self on public.reports for select to authenticated using (reporter_id = auth.uid());

drop policy if exists blocks_read_self on public.blocks;
create policy blocks_read_self on public.blocks for select to authenticated using (blocker_id = auth.uid());
drop policy if exists blocks_create_self on public.blocks;
create policy blocks_create_self on public.blocks for insert to authenticated with check (blocker_id = auth.uid() and blocker_id <> blocked_id);
drop policy if exists blocks_delete_self on public.blocks;
create policy blocks_delete_self on public.blocks for delete to authenticated using (blocker_id = auth.uid());

-- The frontend currently calls getPublicUrl, so this bucket deliberately allows public reads.
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects for select to public using (bucket_id = 'avatars');
drop policy if exists avatars_upload_own_folder on storage.objects;
create policy avatars_upload_own_folder on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and name like ('avatars/' || auth.uid()::text || '/%'));
drop policy if exists avatars_update_own_folder on storage.objects;
create policy avatars_update_own_folder on storage.objects for update to authenticated using (bucket_id = 'avatars' and name like ('avatars/' || auth.uid()::text || '/%')) with check (bucket_id = 'avatars' and name like ('avatars/' || auth.uid()::text || '/%'));
drop policy if exists avatars_delete_own_folder on storage.objects;
create policy avatars_delete_own_folder on storage.objects for delete to authenticated using (bucket_id = 'avatars' and name like ('avatars/' || auth.uid()::text || '/%'));

grant select, insert, update, delete on table public.posts to authenticated;

grant select on table public.profiles to authenticated;

grant select, insert, delete on table public.likes to authenticated;

grant select, insert, delete on table public.reposts to authenticated;

grant select, insert, delete on table public.comments to authenticated;