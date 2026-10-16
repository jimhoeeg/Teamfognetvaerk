# Designguide – "Arena Night"

Godkendt designretning for Team FOG Næstved-appen. Visuel reference: [designlærredet](https://claude.ai/artifact/WXRaDsS5uUnSfnTqHE3XrD).
Alle værdier herunder findes som CSS-variabler i `src/styles/tokens.css` – brug altid variablerne, aldrig rå hex-koder i komponenter.

## Principper

1. **Mørk som hallen.** Mørk tilstand er standard og eneste tilstand i v1. Appen bruges i en mørk hal kl. 18.45.
2. **Tal er helte.** Nedtælling, score, point og streak vises i kæmpestørrelse i display-skriften.
3. **Skarpe kanter.** Maks 4 px hjørneradius. Skrå snit (`clip-path`) på primærknapper og fremhævede kort. Banestreger som baggrundsmotiv.
4. **Én farve lyser.** Volt bruges kun til handling og belønning. Orange er forbeholdt *live* og *Ditlev Dunk*.

## Farver

| Token | Hex | Brug |
|---|---|---|
| `--c-ink` | `#0B0B0C` | Baggrund (parket sort), tekst på lyse flader |
| `--c-surface` | `#18181C` | Kort og flader (tribune) |
| `--c-surface-2` | `#222228` | Inputs, hover |
| `--c-line` | `#2E2E36` | Kanter og skillelinjer |
| `--c-line-strong` | `#3A3A42` | Tomme progress-felter, sekundære kanter |
| `--c-chalk` | `#F5F5F2` | Primær tekst, sekundærknap-kant, billetflade |
| `--c-muted` | `#B4B4BC` | Sekundær tekst (min. 4.5:1 på ink) |
| `--c-dim` | `#8E8E98` | Labels, inaktive faner, store tal i baggrund |
| `--c-volt` | `#D4FF3A` | Accent: primærknapper, point, aktiv fane, progress |
| `--c-orange` | `#FF5A1F` | Live-status, måltavle, Ditlev Dunks univers |

Tekst på volt og orange er altid `--c-ink`.

## Typografi

- **Display:** *Big Shoulders Display* (600/800/900), VERSALER. Overskrifter, tal, holdnavne, knapper med tal.
- **Brødtekst:** *Archivo* (400/500/600/700). Brødtekst, labels, knapper.

| Rolle | Skrift | Størrelse / vægt |
|---|---|---|
| Hero-tal (point, score) | Display | 72–96 px / 900, line-height 0.86 |
| Skærmtitel | Display | 40–54 px / 900 |
| Sektionstitel | Display | 24 px / 800 |
| Label / eyebrow | Archivo | 12 px / 700, versaler, letter-spacing 0.14em |
| Brødtekst | Archivo | 15 px / 400–500, line-height 1.45 |
| Knap | Archivo | 15 px / 700, versaler, letter-spacing 0.06em |

## Former og spacing

- Spacing-skala: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48. Sidemargin på mobil: 20 px.
- Radius: 0 på kort, 4 px på knapper og inputs.
- Skrå snit: primærknap `polygon(0 0, 100% 0, calc(100% - 14px) 100%, 0 100%)`; fremhævet kort skæres i nederste højre hjørne (22 px).
- Badges/niveauskjold: trøjeskjold `polygon(0 0, 100% 0, 100% 78%, 50% 100%, 0 78%)`.
- Touch targets min. 44 × 44 px. Primærknapper 52–56 px høje.

## Komponenter

- **Primærknap:** volt baggrund, ink tekst, skråt snit. Én pr. skærm.
- **Sekundærknap:** transparent, 2 px chalk-kant.
- **Chip:** 26–32 px høj, versaler. Volt = fremhævet, kant = neutral, orange med prik = LIVE.
- **Progress:** segmenteret (streak) eller fuld bjælke (niveau, fællesmål).
- **Bundmenu:** 5 faner – Kampdag, Billet, Point, Live, Dunk. Aktiv fane = volt tekst + 3 px topstreg (Live = orange, Dunk-skærmen er orange med ink).
- **Ikoner:** Inline stroke-SVG, 2 px streg, 20–22 px. Aldrig emoji.

## Skærmidentitet

- Kampdag, Billet, Point: ink baggrund, volt accent.
- Live: orange måltavle øverst, resten ink.
- Dunk (børn): orange baggrund, ink tekst, volt til gennemførte stempler.

## Tilgængelighed

- Kontrast min. 4.5:1 for tekst (3:1 for tekst ≥ 24 px).
- Rigtige `<button>`, `<a>`, `<input>` + `<label>`. `aria-label` på ikonknapper.
- Bevægelse respekterer `prefers-reduced-motion`.

## Åbne punkter fra klubben

- Officielt logo og evt. brandfarve (erstatter volt hvis klubben har en accent).
- Illustration af Ditlev Dunk.
- Spillerfotos og trøjenumre.
