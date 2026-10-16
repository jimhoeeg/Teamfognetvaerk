-- Team FOG Næstved app – v1 schema
-- Pointregler: se docs/PRODUKT.md. Al pointtildeling sker i security definer-funktioner.

-- ─────────────────────────────────────────────────────────── Tabeller

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  fan_type text not null default 'tilskuer' check (fan_type in ('tilskuer', 'medlem', 'foraelder')),
  role text not null default 'fan' check (role in ('fan', 'admin')),
  referral_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  referred_by uuid references public.profiles (id) on delete set null,
  referral_rewarded boolean not null default false,
  season_card jsonb,
  noise_side text check (noise_side in ('A', 'B')),
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.kids (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 40),
  birth_year int check (birth_year between 2005 and 2030),
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  number text,
  position text,
  photo_url text,
  active boolean not null default true,
  sort int not null default 0
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  opponent text not null,
  tip_off timestamptz not null,
  venue text not null default 'Arena Næstved',
  competition text not null default 'Basketligaen',
  is_home boolean not null default true,
  ticket_url text,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'finished')),
  fog_score int not null default 0,
  opponent_score int not null default 0,
  period text,
  clock text,
  mvp_open boolean not null default false,
  mvp_player_id uuid references public.players (id) on delete set null,
  attendance_goal int not null default 2000,
  goal_reward text,
  created_at timestamptz not null default now()
);
create index matches_tip_off_idx on public.matches (tip_off);

create table public.match_secrets (
  match_id uuid primary key references public.matches (id) on delete cascade,
  checkin_code text not null unique default upper(substr(md5(random()::text), 1, 8))
);

create table public.rsvps (
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create table public.checkins (
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);
create index checkins_user_idx on public.checkins (user_id);

create table public.points_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount int not null,
  reason text not null check (reason in (
    'rsvp', 'checkin', 'early', 'streak', 'prediction_winner', 'prediction_margin',
    'mvp_vote', 'noise', 'referral', 'redeem', 'admin')),
  match_id uuid references public.matches (id) on delete set null,
  created_at timestamptz not null default now()
);
create index points_ledger_user_idx on public.points_ledger (user_id, created_at desc);

create table public.predictions (
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  winner text not null check (winner in ('fog', 'opponent')),
  margin text not null check (margin in ('1-5', '6-10', '11+')),
  points_awarded int,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create table public.mvp_votes (
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create table public.noise_rounds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null
);

create table public.noise_scores (
  round_id uuid not null references public.noise_rounds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  side text not null check (side in ('A', 'B')),
  level int not null check (level between 0 and 100),
  created_at timestamptz not null default now(),
  primary key (round_id, user_id)
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  partner text not null,
  title text not null,
  description text,
  cost int not null check (cost > 0),
  stock int check (stock >= 0),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.rewards (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete cascade,
  code text not null default upper(substr(md5(random()::text), 1, 8)),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

-- Missioner med match_id null er standardsættet, som bruges når en kamp ikke har sit eget.
create table public.missions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches (id) on delete cascade,
  sort int not null default 0,
  title text not null,
  hint text,
  kind text not null check (kind in ('code', 'quiz')),
  question text,
  options text[],
  created_at timestamptz not null default now()
);

create table public.mission_secrets (
  mission_id uuid primary key references public.missions (id) on delete cascade,
  answer text not null
);

create table public.kid_stamps (
  kid_id uuid not null references public.kids (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (kid_id, mission_id, match_id)
);

create table public.kid_badges (
  kid_id uuid not null references public.kids (id) on delete cascade,
  badge text not null,
  created_at timestamptz not null default now(),
  primary key (kid_id, badge)
);

create table public.raffle_entries (
  kid_id uuid not null references public.kids (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (kid_id, match_id)
);

-- ─────────────────────────────────────────────────────────── Hjælpere

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create function public.add_points(p_user uuid, p_amount int, p_reason text, p_match uuid)
returns void language sql security definer set search_path = public as $$
  insert into points_ledger (user_id, amount, reason, match_id) values (p_user, p_amount, p_reason, p_match);
$$;
revoke execute on function public.add_points(uuid, int, text, uuid) from public, anon, authenticated;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.create_match_secret() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into match_secrets (match_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_match_created after insert on public.matches
  for each row execute function public.create_match_secret();

-- Den aktuelle mission-liste for en kamp (egne missioner, ellers standardsættet).
create function public.match_missions(p_match uuid) returns setof public.missions
language sql stable security definer set search_path = public as $$
  select * from missions where match_id = p_match
  union all
  select * from missions where match_id is null
    and not exists (select 1 from missions where match_id = p_match)
  order by sort;
$$;

-- Antal hjemmekampe i træk med check-in, talt bagud fra p_match.
create function public.streak_at(p_user uuid, p_match uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare
  v_tip timestamptz;
  v_n int := 0;
  r record;
begin
  select tip_off into v_tip from matches where id = p_match;
  for r in
    select m.id, exists (select 1 from checkins c where c.match_id = m.id and c.user_id = p_user) as hit
    from matches m where m.is_home and m.tip_off <= v_tip order by m.tip_off desc
  loop
    exit when not r.hit;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- ─────────────────────────────────────────────────────────── Fan-handlinger

create function public.rsvp(p_match uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_rows int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from matches where id = p_match and status = 'upcoming' and tip_off > now()) then
    raise exception 'rsvp_closed';
  end if;
  insert into rsvps (match_id, user_id) values (p_match, v_uid) on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return 0; end if;
  perform add_points(v_uid, 10, 'rsvp', p_match);
  return 10;
end $$;

create function public.check_in(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_match matches%rowtype;
  v_awards jsonb := '[]'::jsonb;
  v_streak int;
  v_profile profiles%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select m.* into v_match from matches m join match_secrets s on s.match_id = m.id
  where s.checkin_code = upper(trim(p_code));
  if not found then raise exception 'invalid_code'; end if;

  if now() < v_match.tip_off - interval '60 minutes' or now() > v_match.tip_off + interval '150 minutes' then
    raise exception 'checkin_closed';
  end if;

  insert into checkins (match_id, user_id) values (v_match.id, v_uid) on conflict do nothing;
  if not found then raise exception 'already_checked_in'; end if;

  perform add_points(v_uid, 50, 'checkin', v_match.id);
  v_awards := v_awards || jsonb_build_object('reason', 'checkin', 'amount', 50);

  if now() <= v_match.tip_off - interval '20 minutes' then
    perform add_points(v_uid, 25, 'early', v_match.id);
    v_awards := v_awards || jsonb_build_object('reason', 'early', 'amount', 25);
  end if;

  if v_match.is_home then
    v_streak := streak_at(v_uid, v_match.id);
    if v_streak = 3 then
      perform add_points(v_uid, 50, 'streak', v_match.id);
      v_awards := v_awards || jsonb_build_object('reason', 'streak', 'amount', 50);
    elsif v_streak >= 5 and v_streak % 5 = 0 then
      perform add_points(v_uid, 100, 'streak', v_match.id);
      v_awards := v_awards || jsonb_build_object('reason', 'streak', 'amount', 100);
    end if;
  end if;

  -- Henvisning: begge får point ved vennens første check-in.
  select * into v_profile from profiles where id = v_uid;
  if v_profile.referred_by is not null and not v_profile.referral_rewarded then
    update profiles set referral_rewarded = true where id = v_uid;
    perform add_points(v_uid, 100, 'referral', v_match.id);
    perform add_points(v_profile.referred_by, 100, 'referral', v_match.id);
    v_awards := v_awards || jsonb_build_object('reason', 'referral', 'amount', 100);
  end if;

  return jsonb_build_object(
    'match_id', v_match.id,
    'awards', v_awards,
    'total', (select coalesce(sum((a->>'amount')::int), 0) from jsonb_array_elements(v_awards) a),
    'streak', coalesce(v_streak, 0));
end $$;

create function public.predict(p_match uuid, p_winner text, p_margin text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from matches where id = p_match and status = 'upcoming' and tip_off > now()) then
    raise exception 'predictions_closed';
  end if;
  insert into predictions (match_id, user_id, winner, margin) values (p_match, auth.uid(), p_winner, p_margin)
  on conflict (match_id, user_id) do update set winner = excluded.winner, margin = excluded.margin, created_at = now();
end $$;

create function public.vote_mvp(p_match uuid, p_player uuid) returns int
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from matches where id = p_match and mvp_open) then raise exception 'voting_closed'; end if;
  if not exists (select 1 from players where id = p_player and active) then raise exception 'invalid_player'; end if;
  insert into mvp_votes (match_id, user_id, player_id) values (p_match, auth.uid(), p_player) on conflict do nothing;
  if not found then raise exception 'already_voted'; end if;
  perform add_points(auth.uid(), 25, 'mvp_vote', p_match);
  return 25;
end $$;

create function public.submit_noise(p_round uuid, p_side text, p_level int) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_round noise_rounds%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v_round from noise_rounds where id = p_round;
  if not found or now() > v_round.ends_at + interval '10 seconds' then raise exception 'round_closed'; end if;
  insert into noise_scores (round_id, user_id, side, level)
  values (p_round, auth.uid(), p_side, greatest(0, least(100, p_level))) on conflict do nothing;
  if not found then raise exception 'already_submitted'; end if;
  update profiles set noise_side = p_side where id = auth.uid();
  perform add_points(auth.uid(), 10, 'noise', v_round.match_id);
  return 10;
end $$;

create function public.redeem_reward(p_reward uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_reward rewards%rowtype;
  v_balance int;
  v_red redemptions%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  -- Lås brugerens række, så to samtidige indløsninger ikke begge går igennem.
  perform 1 from profiles where id = v_uid for update;
  select * into v_reward from rewards where id = p_reward and active for update;
  if not found then raise exception 'reward_unavailable'; end if;
  if v_reward.stock is not null and v_reward.stock <= 0 then raise exception 'sold_out'; end if;
  select coalesce(sum(amount), 0) into v_balance from points_ledger where user_id = v_uid;
  if v_balance < v_reward.cost then raise exception 'insufficient_points'; end if;

  insert into redemptions (reward_id, user_id) values (p_reward, v_uid) returning * into v_red;
  perform add_points(v_uid, -v_reward.cost, 'redeem', null);
  if v_reward.stock is not null then update rewards set stock = stock - 1 where id = p_reward; end if;
  return jsonb_build_object('id', v_red.id, 'code', v_red.code, 'balance', v_balance - v_reward.cost);
end $$;

create function public.apply_referral(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_ref uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select id into v_ref from profiles where referral_code = upper(trim(p_code));
  if v_ref is null or v_ref = auth.uid() then raise exception 'invalid_code'; end if;
  if exists (select 1 from checkins where user_id = auth.uid()) then raise exception 'too_late'; end if;
  update profiles set referred_by = v_ref where id = auth.uid() and referred_by is null;
  return found;
end $$;

create function public.complete_mission(p_kid uuid, p_match uuid, p_mission uuid, p_answer text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_match matches%rowtype;
  v_total int;
  v_done int;
  v_badges text[] := '{}';
  v_full_cards int;
begin
  if not exists (select 1 from kids where id = p_kid and parent_id = auth.uid()) then raise exception 'not_your_kid'; end if;
  select * into v_match from matches where id = p_match;
  if not found or now() < v_match.tip_off - interval '60 minutes' or now() > v_match.tip_off + interval '150 minutes' then
    raise exception 'missions_closed';
  end if;
  if not exists (select 1 from match_missions(p_match) where id = p_mission) then raise exception 'invalid_mission'; end if;
  if not exists (
    select 1 from mission_secrets where mission_id = p_mission and lower(trim(answer)) = lower(trim(p_answer))
  ) then
    raise exception 'wrong_answer';
  end if;

  insert into kid_stamps (kid_id, mission_id, match_id) values (p_kid, p_mission, p_match) on conflict do nothing;

  if not exists (select 1 from kid_badges where kid_id = p_kid and badge = 'foerste-stempel') then
    insert into kid_badges (kid_id, badge) values (p_kid, 'foerste-stempel');
    v_badges := array_append(v_badges, 'foerste-stempel');
  end if;

  select count(*) into v_total from match_missions(p_match);
  select count(*) into v_done from kid_stamps where kid_id = p_kid and match_id = p_match;

  if v_done >= v_total then
    insert into raffle_entries (kid_id, match_id) values (p_kid, p_match) on conflict do nothing;
    if found then
      select count(*) into v_full_cards from raffle_entries where kid_id = p_kid;
      insert into kid_badges (kid_id, badge) values (p_kid, 'fuldt-kort') on conflict do nothing;
      if found then v_badges := array_append(v_badges, 'fuldt-kort'); end if;
      if v_full_cards >= 3 then
        insert into kid_badges (kid_id, badge) values (p_kid, 'tre-fulde-kort') on conflict do nothing;
        if found then v_badges := array_append(v_badges, 'tre-fulde-kort'); end if;
      end if;
    end if;
  end if;

  return jsonb_build_object('done', v_done, 'total', v_total, 'card_complete', v_done >= v_total, 'new_badges', to_jsonb(v_badges));
end $$;

-- ─────────────────────────────────────────────────────────── Læsefunktioner (aggregater)

create function public.my_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_earned int;
  v_balance int;
  v_last uuid;
  v_streak int := 0;
begin
  select coalesce(sum(amount) filter (where amount > 0), 0), coalesce(sum(amount), 0)
  into v_earned, v_balance from points_ledger where user_id = v_uid;

  select id into v_last from matches where is_home and tip_off <= now() + interval '60 minutes'
  order by tip_off desc limit 1;
  if v_last is not null then
    v_streak := streak_at(v_uid, v_last);
    -- Kampen der er i gang tæller ikke imod en streak, før man har haft mulighed for at tjekke ind.
    if v_streak = 0 then
      select id into v_last from matches where is_home and tip_off < (select tip_off from matches where id = v_last)
      order by tip_off desc limit 1;
      if v_last is not null then v_streak := streak_at(v_uid, v_last); end if;
    end if;
  end if;

  return jsonb_build_object('earned', v_earned, 'balance', v_balance, 'streak', v_streak);
end $$;

create function public.match_counters(p_match uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'rsvps', (select count(*) from rsvps where match_id = p_match),
    'checkins', (select count(*) from checkins where match_id = p_match),
    'goal', (select attendance_goal from matches where id = p_match));
$$;

create function public.mvp_results(p_match uuid) returns table (player_id uuid, votes bigint)
language sql stable security definer set search_path = public as $$
  select player_id, count(*) from mvp_votes where match_id = p_match group by player_id order by 2 desc;
$$;

create function public.noise_results(p_round uuid) returns table (side text, avg_level numeric, participants bigint)
language sql stable security definer set search_path = public as $$
  select side, round(avg(level), 1), count(*) from noise_scores where round_id = p_round group by side order by side;
$$;

-- ─────────────────────────────────────────────────────────── Admin

create function public.admin_start_noise(p_match uuid, p_seconds int default 15) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  insert into noise_rounds (match_id, ends_at) values (p_match, now() + make_interval(secs => p_seconds)) returning id into v_id;
  return v_id;
end $$;

create function public.admin_finish_match(p_match uuid, p_mvp uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_match matches%rowtype;
  v_winner text;
  v_margin text;
  v_diff int;
  r predictions%rowtype;
  v_pts int;
  v_paid int := 0;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select * into v_match from matches where id = p_match for update;
  if not found then raise exception 'not_found'; end if;
  if v_match.status = 'finished' then raise exception 'already_finished'; end if;

  v_diff := abs(v_match.fog_score - v_match.opponent_score);
  v_winner := case when v_match.fog_score >= v_match.opponent_score then 'fog' else 'opponent' end;
  v_margin := case when v_diff <= 5 then '1-5' when v_diff <= 10 then '6-10' else '11+' end;

  -- Uden valgt MVP bliver det publikums favorit.
  update matches set status = 'finished', mvp_open = false,
    mvp_player_id = coalesce(p_mvp, (select player_id from mvp_votes where match_id = p_match
                                     group by player_id order by count(*) desc limit 1))
  where id = p_match;

  for r in select * from predictions where match_id = p_match loop
    v_pts := 0;
    if r.winner = v_winner then
      perform add_points(r.user_id, 50, 'prediction_winner', p_match);
      v_pts := 50;
      if r.margin = v_margin then
        perform add_points(r.user_id, 100, 'prediction_margin', p_match);
        v_pts := 150;
      end if;
      v_paid := v_paid + 1;
    end if;
    update predictions set points_awarded = v_pts where match_id = r.match_id and user_id = r.user_id;
  end loop;

  return jsonb_build_object('winner', v_winner, 'margin', v_margin, 'correct_predictions', v_paid);
end $$;

-- ─────────────────────────────────────────────────────────── RLS

alter table public.profiles enable row level security;
alter table public.kids enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_secrets enable row level security;
alter table public.rsvps enable row level security;
alter table public.checkins enable row level security;
alter table public.points_ledger enable row level security;
alter table public.predictions enable row level security;
alter table public.mvp_votes enable row level security;
alter table public.noise_rounds enable row level security;
alter table public.noise_scores enable row level security;
alter table public.rewards enable row level security;
alter table public.redemptions enable row level security;
alter table public.missions enable row level security;
alter table public.mission_secrets enable row level security;
alter table public.kid_stamps enable row level security;
alter table public.kid_badges enable row level security;
alter table public.raffle_entries enable row level security;

-- Profiler: egen række. Kun udvalgte kolonner kan opdateres af brugeren selv.
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or is_admin());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (display_name, fan_type, season_card, noise_side, onboarded) on public.profiles to authenticated;

create policy kids_all on public.kids for all to authenticated using (parent_id = auth.uid()) with check (parent_id = auth.uid());

-- Offentligt indhold: alle må læse, kun admin må skrive.
create policy players_read on public.players for select using (true);
create policy players_admin on public.players for all to authenticated using (is_admin()) with check (is_admin());
create policy matches_read on public.matches for select using (true);
create policy matches_admin on public.matches for all to authenticated using (is_admin()) with check (is_admin());
create policy rewards_read on public.rewards for select using (true);
create policy rewards_admin on public.rewards for all to authenticated using (is_admin()) with check (is_admin());
create policy missions_read on public.missions for select using (true);
create policy missions_admin on public.missions for all to authenticated using (is_admin()) with check (is_admin());
create policy noise_rounds_read on public.noise_rounds for select using (true);

-- Hemmeligheder: kun admin.
create policy match_secrets_admin on public.match_secrets for all to authenticated using (is_admin()) with check (is_admin());
create policy mission_secrets_admin on public.mission_secrets for all to authenticated using (is_admin()) with check (is_admin());

-- Egne aktiviteter: kun læsning. Skrivning sker gennem funktionerne ovenfor.
create policy rsvps_own on public.rsvps for select to authenticated using (user_id = auth.uid());
create policy checkins_own on public.checkins for select to authenticated using (user_id = auth.uid());
create policy ledger_own on public.points_ledger for select to authenticated using (user_id = auth.uid());
create policy predictions_own on public.predictions for select to authenticated using (user_id = auth.uid());
create policy mvp_votes_own on public.mvp_votes for select to authenticated using (user_id = auth.uid());
create policy noise_scores_own on public.noise_scores for select to authenticated using (user_id = auth.uid());
create policy redemptions_own on public.redemptions for select to authenticated using (user_id = auth.uid() or is_admin());
create policy kid_stamps_own on public.kid_stamps for select to authenticated
  using (exists (select 1 from public.kids k where k.id = kid_id and k.parent_id = auth.uid()));
create policy kid_badges_own on public.kid_badges for select to authenticated
  using (exists (select 1 from public.kids k where k.id = kid_id and k.parent_id = auth.uid()));
create policy raffle_own on public.raffle_entries for select to authenticated
  using (exists (select 1 from public.kids k where k.id = kid_id and k.parent_id = auth.uid()) or is_admin());

-- Funktioner der kræver login.
revoke execute on function public.rsvp(uuid), public.check_in(text), public.predict(uuid, text, text),
  public.vote_mvp(uuid, uuid), public.submit_noise(uuid, text, int), public.redeem_reward(uuid),
  public.apply_referral(text), public.complete_mission(uuid, uuid, uuid, text), public.my_stats(),
  public.admin_start_noise(uuid, int), public.admin_finish_match(uuid, uuid)
  from public, anon;
revoke execute on function public.streak_at(uuid, uuid), public.handle_new_user(), public.create_match_secret()
  from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────── Realtime

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.matches, public.noise_rounds;
  end if;
end $$;
