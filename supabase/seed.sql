-- Startdata. Spillere og kampe fra teamfog.dk / arenanaestved.dk (okt. 2026).
-- Trøjenumre, partnere og missionskoder er pladsholdere, som klubben skal udfylde i /admin.

insert into public.players (name, sort) values
  ('Jacobi Wright', 1),
  ('Pipeloluwa Ajayi', 2),
  ('Aboubacar Traore', 3),
  ('Sean Trumper', 4),
  ('Emil Sagittarius', 5);

insert into public.matches (opponent, tip_off, ticket_url, goal_reward) values
  ('Bears Academy', '2026-10-28 18:45:00+01', 'https://billetto.dk', '[FÆLLES BELØNNING – udfyldes af klubben]');

insert into public.rewards (partner, title, description, cost, sort) values
  ('[PARTNER]', '[TILBUD fx gratis kaffe]', 'Vis koden ved kassen.', 300, 1),
  ('Team FOG', 'Walk-out med holdet', 'Gå på banen med spillerne til en hjemmekamp.', 2500, 2);

with m as (
  insert into public.missions (sort, title, hint, kind, question, options) values
    (1, 'Find Ditlev', 'Find Ditlev Dunk i hallen og få koden af ham.', 'code', null, null),
    (2, 'High-five', 'Giv en spiller high-five ved opvarmningen. En frivillig giver dig koden.', 'code', null, null),
    (3, 'Råb højest', 'Koden vises på storskærmen under larm-runden.', 'code', null, null),
    (4, 'Skud i pausen', 'Tag et skud ved børnekurven i pausen.', 'code', null, null),
    (5, 'Find QR-koden', 'En plakat med Ditlev gemmer sig et sted i hallen.', 'code', null, null),
    (6, 'Quiz om holdet', null, 'quiz', 'Hvilket nummer har Ditlev Dunk på trøjen?', array['00', '23', '10'])
  returning id, sort
)
insert into public.mission_secrets (mission_id, answer)
select id, case sort when 1 then 'DITLEV' when 2 then 'HIGHFIVE' when 3 then 'LARM'
                     when 4 then 'SKUD' when 5 then 'PLAKAT' else '00' end
from m;
