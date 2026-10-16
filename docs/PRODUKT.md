# Produkt og flow – v1 (feature 1–4)

## Beslutninger

- **Platform:** Web-app/PWA (React + Vite). Åbnes via link/QR, kan lægges på hjemmeskærmen.
- **Backend:** Supabase (Postgres, Auth, Realtime). Al pointtildeling sker i databasefunktioner – klienten kan aldrig selv skrive point.
- **Billetter:** Købes eksternt (Billetto-link pr. kamp). Appen viser et personligt fankort med QR og evt. sæsonkortoplysninger.
- **Demo-tilstand:** Uden Supabase-nøgler kører appen på lokale eksempeldata (til præsentationer og udvikling).

## Brugertyper

| Type | Hvordan | Kan |
|---|---|---|
| Tilskuer | Standard | Alt i feature 1–3 |
| Medlem (Næstved Basketball) | Vælges i onboarding | Som tilskuer; markeres i profil (klar til dobbelt-point senere) |
| Forælder | Tilføjer børneprofiler | Børnene får Ditlev Dunks univers under forælderens konto |
| Admin (klubben) | Rolle sat i databasen | Kampstyring under `/admin` |

Børn har aldrig egen konto. Forælderen opretter et fornavn + fødselsår. Det holder os ude af samtykkeregler for børn under 13 (GDPR).

## Login

1. Første åbning: velkomstskærm → "Kom i gang" opretter en anonym konto med det samme (ingen friktion i hallen).
2. Onboarding: navn → hvem er du (tilskuer / medlem / forælder) → evt. børn → evt. henvisningskode fra en ven.
3. Under Profil kan man sikre kontoen med e-mail (magic link), så point ikke går tabt ved skift af telefon.

## Kampaftenens flow

```
FØR KAMPEN             I HALLEN                         EFTER
Kampdag-skærm          Scan check-in-QR ved indgangen    Slutfløjt (admin)
 ├ "Jeg kommer" +10     ├ +50 check-in                    ├ tip afgøres → +50/+150
 ├ Tip kampen           ├ +25 hvis ≥20 min før tip-off    ├ MVP kåres
 └ Inviter en ven       ├ streak-bonus                    └ point & niveau opdateret
                        Live-skærm
                         ├ score (realtime)
                         ├ Larm-runde (+10)
                         └ MVP-afstemning (+25)
                        Dunk: børnenes stempelkort
```

## Pointregler

| Handling | Point | Regel |
|---|---|---|
| "Jeg kommer" | +10 | Én gang pr. kamp, indtil tip-off |
| Check-in | +50 | QR-kode i hallen. Fra 60 min før til 150 min efter tip-off |
| Tidlig ankomst | +25 | Check-in senest 20 min før tip-off |
| Streak 3 | +50 | 3 hjemmekampe i træk med check-in |
| Streak 5 | +100 | 5 hjemmekampe i træk (og hver 5. derefter) |
| Rigtig vinder (tip) | +50 | Tip låses ved tip-off |
| Rigtig margin (tip) | +100 | Oveni rigtig vinder |
| MVP-stemme | +25 | Når admin åbner afstemningen |
| Larm-runde | +10 | Deltagelse i en runde |
| Ny ven | +100 / +100 | Begge får point, når vennen tjekker ind første gang |

**Niveauer** (efter samlet optjente point – indløsning sænker aldrig niveau):
Rookie 0 · Starter 500 · All-Star 1.500 · Legend 4.000.

**Saldo** = optjent − brugt. Belønninger fra partnere koster point og giver en indløsningskode, som vises for partneren.

## Fællesmål

Hver kamp har et tilskuermål (standard 2.000). Før kampen tæller "Jeg kommer", under kampen tæller check-ins. Når målet nås, låses klubbens fælles belønning op (tekst sættes af admin).

## Ditlev Dunks univers (børn)

- Seks missioner pr. kamp: "kode"-missioner (Ditlev/frivillige/plakater viser en kode eller QR) og quiz-missioner.
- Hver gennemført mission = et stempel. Fuldt kort = badge + lod i trækningen.
- Badges samles på tværs af kampe (første kamp, fuldt kort, 3 fulde kort …).

## Admin (klubben)

`/admin` – kun for brugere med rollen admin:
- Opret/ret kampe (modstander, tidspunkt, billetlink, mål og fælles belønning).
- Vis og print check-in-QR for kampen.
- Live-styring: status (kommende/live/slut), score, periode, ur.
- Åbn/luk MVP-afstemning, start larm-runde.
- Afslut kamp: afgør tips og kår MVP.
- Missioner og belønninger.

## Ikke i v1

Billetintegration med adgangskontrol, push-notifikationer, partnermodul, samlekort, mad-bestilling, Wallet-pas.
