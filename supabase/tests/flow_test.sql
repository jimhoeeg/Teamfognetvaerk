-- Gennemspiller en kampaften og tjekker pointreglerne. Kør med supabase/tests/run_local.sh.
\set ON_ERROR_STOP 1

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a'), -- admin
  ('00000000-0000-0000-0000-000000000001'), -- fan
  ('00000000-0000-0000-0000-000000000002'); -- ven af fan
update profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';

-- To tidligere hjemmekampe (fan var med begge gange) + aftenens kamp om 30 min.
insert into matches (id, opponent, tip_off, status) values
  ('10000000-0000-0000-0000-000000000001', 'Gammel 1', now() - interval '14 days', 'finished'),
  ('10000000-0000-0000-0000-000000000002', 'Gammel 2', now() - interval '7 days', 'finished');
insert into checkins (match_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');
update matches set tip_off = now() + interval '30 minutes' where opponent = 'Bears Academy';
create temp table t as select id as match_id from matches where opponent = 'Bears Academy';
grant select on t to authenticated;
create temp table secret as select checkin_code from match_secrets where match_id = (select match_id from t);
grant select on secret to authenticated;

-- ── Fan
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

select 'rsvp' as step, rsvp((select match_id from t)) = 10 as ok;
select 'rsvp igen' as step, rsvp((select match_id from t)) = 0 as ok;
select predict((select match_id from t), 'fog', '6-10');

-- Fan kan ikke se hemmeligheder eller skrive point direkte.
select 'secrets skjult' as step, count(*) = 0 as ok from match_secrets;
do $$ begin
  insert into points_ledger (user_id, amount, reason) values (auth.uid(), 9999, 'admin');
  raise exception 'FEJL: direkte pointindsættelse lykkedes';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update profiles set role = 'admin' where id = auth.uid();
  raise exception 'FEJL: fan kunne gøre sig selv til admin';
exception when insufficient_privilege then null; end $$;

select 'forkert kode' as step;
do $$ begin perform check_in('FORKERT'); raise exception 'FEJL'; exception when raise_exception then
  if sqlerrm <> 'invalid_code' then raise; end if; end $$;

-- Check-in: 50 + 25 (tidlig) + 50 (streak 3).
select 'check-in' as step, (check_in((select checkin_code from secret))->>'total')::int = 125 as ok;
select 'stats' as step, my_stats() as stats;

-- ── Ven bruger fans henvisningskode
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
reset role;
create temp table ref as select referral_code from profiles where id = '00000000-0000-0000-0000-000000000001';
grant select on ref to authenticated;
set role authenticated;
select 'henvisning' as step, apply_referral((select referral_code from ref)) as ok;
select 'ven check-in' as step, (check_in((select checkin_code from secret))->>'total')::int = 175 as ok;
select predict((select match_id from t), 'opponent', '1-5');

-- ── Admin kører kampen
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update matches set status = 'live', fog_score = 84, opponent_score = 76, mvp_open = true where id = (select match_id from t);
select 'larm-runde' as step, admin_start_noise((select match_id from t), 15) is not null as ok;

-- ── Fan stemmer og larmer
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select 'tip låst' as step;
do $$ begin perform predict((select match_id from t), 'opponent', '11+'); raise exception 'FEJL'; exception when raise_exception then
  if sqlerrm <> 'predictions_closed' then raise; end if; end $$;
select 'mvp' as step, vote_mvp((select match_id from t), (select id from players order by sort limit 1)) = 25 as ok;
select 'larm' as step, submit_noise((select id from noise_rounds limit 1), 'A', 87) = 10 as ok;
select * from noise_results((select id from noise_rounds limit 1));

-- ── Admin afslutter
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select 'afslut' as step, admin_finish_match((select match_id from t), (select id from players order by sort limit 1)) as result;

-- Fan: 10 + 125 + 25 + 10 + 150 (vinder + margin 8) + 100 (henvisning) = 420
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select 'fan saldo' as step, (my_stats()->>'balance')::int = 420 as ok, my_stats();

-- Indløs belønning på 300.
select 'indløs' as step, (redeem_reward((select id from rewards where cost = 300))->>'balance')::int = 120 as ok;
select 'for få point' as step;
do $$ begin perform redeem_reward((select id from rewards where cost = 300)); raise exception 'FEJL'; exception when raise_exception then
  if sqlerrm <> 'insufficient_points' then raise; end if; end $$;
select 'niveau bevares' as step, (my_stats()->>'earned')::int = 420 as ok;

-- ── Børn
insert into kids (parent_id, first_name, birth_year) values (auth.uid(), 'Alma', 2018);
reset role;
create temp table codes as
  select m.id, m.sort, s.answer from missions m join mission_secrets s on s.mission_id = m.id order by m.sort;
grant select on codes to authenticated;
-- Missioner kræver at kampen er inden for vinduet; flyt kampen tilbage til "nu".
update matches set tip_off = now() where id = (select match_id from t);
set role authenticated;
select 'forkert svar' as step;
do $$ begin perform complete_mission((select id from kids limit 1), (select match_id from t), (select id from codes where sort = 1), 'nej');
  raise exception 'FEJL'; exception when raise_exception then if sqlerrm <> 'wrong_answer' then raise; end if; end $$;
select sort, complete_mission((select id from kids limit 1), (select match_id from t), id, lower(answer)) from codes;
select 'badges' as step, array_agg(badge order by badge) from kid_badges;
select 'lod' as step, count(*) = 1 as ok from raffle_entries;

-- ── Andre forældre kan ikke se Almas data
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select 'isolering' as step, (select count(*) from kids) = 0 and (select count(*) from kid_badges) = 0 as ok;
do $$ begin perform complete_mission((select id from kids limit 1), (select match_id from t), (select id from codes limit 1), 'x');
  raise exception 'FEJL'; exception when raise_exception then if sqlerrm <> 'not_your_kid' then raise; end if; end $$;

-- ── Anonym (ikke logget ind) kan læse kampe men ikke kalde fan-funktioner
reset role;
set role anon;
select 'anon læser kampe' as step, count(*) >= 1 as ok from matches;
do $$ begin perform rsvp((select id from matches limit 1)); raise exception 'FEJL'; exception when insufficient_privilege then null; end $$;
reset role;
select 'ALLE TESTS OK' as result;
