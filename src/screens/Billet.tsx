import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type SeasonCard } from '../lib/api'
import { useApp } from '../lib/store'
import { inMatchWindow } from '../lib/rules'
import { fmtTime, fmtShortDate } from '../lib/format'
import { Icon } from '../components/Icon'
import { QrImage, Sheet, TabBar, TopBar, shareInvite, useAction, useLoad } from '../components/ui'

const SEASON = '2026/27'

/** Fankortet: personlig QR (til frivillige/partnere), evt. sæsonkort, check-in og billetkøb. */
export default function Billet() {
  const { profile, match, toast, pointsVersion } = useApp()
  const [editing, setEditing] = useState(false)
  const card = profile.season_card
  const { data: state } = useLoad(() => (match ? api.myMatchState(match.id) : Promise.resolve(null)), [match?.id, pointsVersion])
  const canCheckIn = match && match.status !== 'finished' && inMatchWindow(match) && state && !state.checkedIn

  return (
    <>
      <main className="screen">
        <TopBar />
        <h1 className="h-screen" style={{ fontSize: 40 }}>Mit kort</h1>

        <section className="card--chalk stack" style={{ clipPath: 'var(--clip-ticket)', gap: 0 }} aria-label="Fankort">
          <div className="relative" style={{ padding: '18px 20px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {card ? `Sæsonkort ${SEASON}` : `Fankort ${SEASON}`}
            </div>
            <div className="display" style={{ fontSize: 40, lineHeight: 0.95 }}>
              {card ? (card.type === 'fast' ? 'Fast plads' : 'Fri plads') : 'Team FOG fan'}
            </div>
            <div style={{ fontWeight: 500 }}>{profile.display_name ?? 'Fan'}</div>
            <div className="display" aria-hidden="true" style={{ position: 'absolute', right: 14, top: 8, fontSize: 96, opacity: 0.08 }}>27</div>
          </div>
          {card?.type === 'fast' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', borderTop: '2px solid var(--c-ink)', borderBottom: '2px dashed var(--c-ink)' }}>
              {(['section', 'row', 'seat'] as const).map((k, i) => (
                <div key={k} style={{ padding: '10px 20px', borderRight: i < 2 ? '2px solid var(--c-ink)' : 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{{ section: 'Sektion', row: 'Række', seat: 'Plads' }[k]}</div>
                  <div className="display" style={{ fontSize: 30 }}>{card[k] || '–'}</div>
                </div>
              ))}
            </div>
          )}
          <div className="row" style={{ padding: 20, gap: 18, alignItems: 'center', borderTop: card?.type === 'fast' ? 0 : '2px dashed var(--c-ink)' }}>
            <QrImage text={`TFN-FAN:${profile.referral_code}`} label={`Dit fankort, nummer ${profile.referral_code}`} />
            <div className="stack" style={{ gap: 6, fontSize: 13 }}>
              <b style={{ fontSize: 15 }}>Vis ved partnere og frivillige</b>
              <span>Fannummer</span>
              <span className="display" style={{ fontSize: 28, letterSpacing: '0.08em' }}>{profile.referral_code}</span>
              {match && match.status !== 'finished' && <b>Næste: {fmtShortDate(match.tip_off)} · {fmtTime(match.tip_off)}</b>}
            </div>
          </div>
        </section>
        <p className="small muted">
          Fankortet er ikke en adgangsbillet. Din billet eller dit sæsonkort fra billetsalget gælder stadig ved indgangen.
        </p>

        {state !== undefined && <section className="card row" style={{ gap: 12 }} aria-label="Check-in">
          <div className="badge" style={{ width: 40, height: 40, fontSize: 0, background: 'var(--c-volt)', color: 'var(--c-ink)' }}><Icon name="pin" size={20} stroke={2.4} /></div>
          <p className="small" style={{ flex: 1 }}>
            {state?.checkedIn ? <><b>Du er tjekket ind i aften.</b><br /><span className="muted">God kamp!</span></>
              : <><b>Tjek ind giver +50 point.</b><br /><span className="muted">{canCheckIn ? 'Check-in er åben nu.' : 'Åbner en time før kampstart i Arena Næstved.'}</span></>}
          </p>
          {canCheckIn && <Link to="/tjek-ind" className="btn btn--primary" style={{ minHeight: 44 }}>Scan</Link>}
        </section>}

        <div className="stack" style={{ gap: 10 }}>
          <button className="btn btn--primary btn--block" onClick={() => shareInvite(profile.referral_code, toast)}>
            <Icon name="share" size={20} />Inviter en ven · +100
          </button>
          {match?.ticket_url && match.status !== 'finished' && (
            <a className="btn btn--secondary btn--block" href={match.ticket_url} target="_blank" rel="noreferrer">Køb billet til {match.opponent}</a>
          )}
          <button className="btn btn--ghost" onClick={() => setEditing(true)}>{card ? 'Ret sæsonkort' : 'Jeg har sæsonkort'}</button>
        </div>
      </main>
      {editing && <SeasonCardSheet current={card} onClose={() => setEditing(false)} />}
      <TabBar />
    </>
  )
}

function SeasonCardSheet({ current, onClose }: { current: SeasonCard | null; onClose: () => void }) {
  const { updateProfile, toast } = useApp()
  const [card, setCard] = useState<SeasonCard>(current ?? { type: 'fast' })
  const { busy, run } = useAction()

  async function save(value: SeasonCard | null) {
    const ok = await run(async () => { await updateProfile({ season_card: value }); return true })
    if (ok) { toast(value ? 'Sæsonkortet er gemt' : 'Sæsonkortet er fjernet'); onClose() }
  }

  return (
    <Sheet title="Sæsonkort" onClose={onClose}>
      <p className="small muted">Vis dit sæsonkort i appen, så du har pladsen ved hånden. Selve adgangen sker stadig med kortet fra billetsalget.</p>
      <div className="grid-2" role="group" aria-label="Type">
        {(['fast', 'fri'] as const).map((t) => (
          <button key={t} className="choice" aria-pressed={card.type === t} onClick={() => setCard({ ...card, type: t })}>
            {t === 'fast' ? 'Fast plads' : 'Fri plads'}<span className="choice__mark" />
          </button>
        ))}
      </div>
      {card.type === 'fast' && (
        <div className="grid-4" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {(['section', 'row', 'seat'] as const).map((k) => (
            <div key={k} className="field">
              <label htmlFor={`sc-${k}`}>{{ section: 'Sektion', row: 'Række', seat: 'Plads' }[k]}</label>
              <input id={`sc-${k}`} className="input" value={card[k] ?? ''} maxLength={6} onChange={(e) => setCard({ ...card, [k]: e.target.value })} />
            </div>
          ))}
        </div>
      )}
      {card.type === 'fri' && <p className="small muted">Husk: med fri plads skal du møde op senest 20 minutter før kampstart. Det giver også tidlig-bonus.</p>}
      <button className="btn btn--primary btn--block" disabled={busy} onClick={() => save(card)}>Gem</button>
      {current && <button className="btn btn--ghost" disabled={busy} onClick={() => save(null)}>Fjern sæsonkort</button>}
    </Sheet>
  )
}
