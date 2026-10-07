-- Additive schema for Tribe Wiki, Q&A, Events, and presentation metadata.
-- This migration creates only new tables and policies. It is not applied by the app.

create table public.tribe_settings (
  tribe_id uuid primary key references public.tribes(id) on delete cascade,
  accent_color text not null default '#8062ff' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  tags text[] not null default '{}',
  announcement text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tribe_resources (
  id uuid primary key default gen_random_uuid(),
  tribe_id uuid not null references public.tribes(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 5000),
  category text not null default 'guide' check (category in ('guide', 'tutorial', 'faq', 'resource', 'announcement', 'discussion')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tribe_questions (
  id uuid primary key default gen_random_uuid(),
  tribe_id uuid not null references public.tribes(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tribe_answers (
  id uuid primary key default gen_random_uuid(),
  tribe_id uuid not null references public.tribes(id) on delete cascade,
  question_id uuid not null references public.tribe_questions(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  is_accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.tribe_events (
  id uuid primary key default gen_random_uuid(),
  tribe_id uuid not null references public.tribes(id) on delete cascade,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  description text not null default '' check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table public.tribe_event_rsvps (
  event_id uuid not null references public.tribe_events(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  status text not null default 'going' check (status in ('going', 'interested')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index tribe_resources_tribe_created_idx on public.tribe_resources(tribe_id, created_at desc);
create index tribe_questions_tribe_created_idx on public.tribe_questions(tribe_id, created_at desc);
create index tribe_answers_question_created_idx on public.tribe_answers(question_id, created_at asc);
create index tribe_events_tribe_start_idx on public.tribe_events(tribe_id, starts_at asc);
create index tribe_event_rsvps_user_idx on public.tribe_event_rsvps(user_id, event_id);

create trigger tribe_settings_set_updated_at before update on public.tribe_settings for each row execute function public.set_updated_at();
create trigger tribe_resources_set_updated_at before update on public.tribe_resources for each row execute function public.set_updated_at();
create trigger tribe_questions_set_updated_at before update on public.tribe_questions for each row execute function public.set_updated_at();
create trigger tribe_events_set_updated_at before update on public.tribe_events for each row execute function public.set_updated_at();

alter table public.tribe_settings enable row level security;
alter table public.tribe_resources enable row level security;
alter table public.tribe_questions enable row level security;
alter table public.tribe_answers enable row level security;
alter table public.tribe_events enable row level security;
alter table public.tribe_event_rsvps enable row level security;

create policy tribe_settings_read_visible on public.tribe_settings for select to authenticated using (
  exists (select 1 from public.tribes t where t.id = tribe_id and (t.visibility = 'public' or public.is_tribe_member(t.id)))
);
create policy tribe_settings_owner_insert on public.tribe_settings for insert to authenticated with check (public.is_tribe_owner(tribe_id));
create policy tribe_settings_owner_update on public.tribe_settings for update to authenticated using (public.is_tribe_owner(tribe_id)) with check (public.is_tribe_owner(tribe_id));

create policy tribe_resources_read_visible on public.tribe_resources for select to authenticated using (
  exists (select 1 from public.tribes t where t.id = tribe_id and (t.visibility = 'public' or public.is_tribe_member(t.id)))
);
create policy tribe_resources_member_insert on public.tribe_resources for insert to authenticated with check (author_id = auth.uid() and public.is_tribe_member(tribe_id));
create policy tribe_resources_author_or_moderator_update on public.tribe_resources for update to authenticated using (author_id = auth.uid() or public.is_tribe_moderator(tribe_id)) with check (public.is_tribe_member(tribe_id));
create policy tribe_resources_author_or_moderator_delete on public.tribe_resources for delete to authenticated using (author_id = auth.uid() or public.is_tribe_moderator(tribe_id));

create policy tribe_questions_read_visible on public.tribe_questions for select to authenticated using (
  exists (select 1 from public.tribes t where t.id = tribe_id and (t.visibility = 'public' or public.is_tribe_member(t.id)))
);
create policy tribe_questions_member_insert on public.tribe_questions for insert to authenticated with check (author_id = auth.uid() and public.is_tribe_member(tribe_id));
create policy tribe_questions_author_update on public.tribe_questions for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid() and public.is_tribe_member(tribe_id));
create policy tribe_questions_author_or_moderator_delete on public.tribe_questions for delete to authenticated using (author_id = auth.uid() or public.is_tribe_moderator(tribe_id));

create policy tribe_answers_read_visible on public.tribe_answers for select to authenticated using (
  exists (select 1 from public.tribes t where t.id = tribe_id and (t.visibility = 'public' or public.is_tribe_member(t.id)))
);
create policy tribe_answers_member_insert on public.tribe_answers for insert to authenticated with check (author_id = auth.uid() and public.is_tribe_member(tribe_id) and exists (select 1 from public.tribe_questions q where q.id = question_id and q.tribe_id = tribe_id));
create policy tribe_answers_author_or_moderator_delete on public.tribe_answers for delete to authenticated using (author_id = auth.uid() or public.is_tribe_moderator(tribe_id));

create policy tribe_events_read_visible on public.tribe_events for select to authenticated using (
  exists (select 1 from public.tribes t where t.id = tribe_id and (t.visibility = 'public' or public.is_tribe_member(t.id)))
);
create policy tribe_events_moderator_insert on public.tribe_events for insert to authenticated with check (created_by = auth.uid() and public.is_tribe_moderator(tribe_id));
create policy tribe_events_creator_or_moderator_update on public.tribe_events for update to authenticated using (created_by = auth.uid() or public.is_tribe_moderator(tribe_id)) with check (public.is_tribe_moderator(tribe_id));
create policy tribe_events_creator_or_moderator_delete on public.tribe_events for delete to authenticated using (created_by = auth.uid() or public.is_tribe_moderator(tribe_id));

create policy tribe_event_rsvps_read_member on public.tribe_event_rsvps for select to authenticated using (
  user_id = auth.uid() or exists (select 1 from public.tribe_events e where e.id = event_id and public.is_tribe_member(e.tribe_id))
);
create policy tribe_event_rsvps_insert_self_member on public.tribe_event_rsvps for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.tribe_events e where e.id = event_id and public.is_tribe_member(e.tribe_id))
);
create policy tribe_event_rsvps_delete_self on public.tribe_event_rsvps for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.tribe_settings, public.tribe_resources, public.tribe_questions, public.tribe_answers, public.tribe_events, public.tribe_event_rsvps to authenticated;
