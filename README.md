# Team FOG Næstved – fan-app

Gamificeret web-app (PWA) til tilskuere og medlemmer af Team FOG Næstved: kampdag, check-in med point, live-oplevelser i hallen og Ditlev Dunks missioner for børn.

- Produkt og flow: [`docs/PRODUKT.md`](docs/PRODUKT.md)
- Designguide "Arena Night": [`docs/DESIGN.md`](docs/DESIGN.md)
- Live demo: https://team-fog-app.vercel.app (deployes automatisk ved push)

## Kom i gang

```bash
npm install
npm run dev
```

Uden Supabase-nøgler kører appen i **demo-tilstand** med eksempeldata i browseren. Demo-brugeren er også admin, så kampstyringen under `/admin` kan afprøves. Check-in-koden til demokampen er `DEMO`.

## Supabase

1. Opret et Supabase-projekt (region `eu-central-1`).
2. Kør `supabase/migrations/*.sql` og derefter `supabase/seed.sql`.
3. Slå **Anonymous sign-ins** til under Authentication → Providers.
4. Kopiér `.env.example` til `.env` og udfyld `VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY`.
5. Gør en bruger til admin:
   ```sql
   update profiles set role = 'admin' where id = '<bruger-id>';
   ```

Al pointtildeling sker i databasefunktioner (`security definer`). Klienten kan kun læse egne data og kalde funktionerne, så ingen kan give sig selv point.

### Test af databasen

Regler og sikkerhed testes mod en lokal Postgres uden Docker:

```bash
PGHOST=<socket-mappe> PGPORT=<port> npm run test:db
```

Testen gennemspiller en kampaften: tilmelding, check-in med tidlig-bonus og streak, henvisning, tip, larm-runde, MVP, slutfløjt, indløsning og børnemissioner, og tjekker at fans ikke kan se hemmelige koder, skrive point eller gøre sig selv til admin.

## Struktur

```
src/
  lib/api/        Api-interface + Supabase- og demo-implementering
  lib/rules.ts    Niveauer, tidsvinduer, fejltekster, valg af aktuel kamp
  screens/        Kampdag, Billet, Point, Live, Dunk, CheckIn, Onboarding, Profil, Admin
  components/     Fælles UI (bundmenu, sheets, QR, scanner)
  styles/         Designtokens + komponentstyles
supabase/
  migrations/     Skema, RLS og funktioner
  seed.sql        Spillere, første kamp, belønninger, missioner
  tests/          Lokal flowtest
```

## Kampaften for klubben

1. Opret kampen i `/admin` og print check-in-plakaten (QR) til indgangene.
2. Skift missionskoderne og print Ditlevs QR-koder.
3. Ved tip-off: **Start kampen**. Opdatér score, periode og ur undervejs.
4. Start en **larm-runde**, når speakeren sætter den i gang. I 4. periode: **Åbn MVP**.
5. **Slutfløjt**: tips afgøres, MVP kåres, og point uddeles automatisk.
