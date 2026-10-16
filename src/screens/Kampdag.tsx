import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Margin, type Match, type Winner } from '../lib/api'
import { useApp } from '../lib/store'
import { CHECKIN_OPENS_MIN, EARLY_MIN, inMatchWindow } from '../lib/rules'
import { addMinutes, fmtDay, fmtNum, fmtShortDate, fmtTime } from '../lib/format'
import { CourtLines, Icon, type IconName } from '../components/Icon'
import { Bar, Countdown, Sheet, TabBar, TopBar, shareInvite, useAction, useLoad } from '../components/ui'

const MARGINS: Margin[] = ['1-5', '6-10', '11+']

export default function Kampdag() {
  const { match, matches } = useApp()
  const upcoming = matches
    .filter((m) => m.status === 'upcoming' && m.id !== match?.id && new Date(m.tip_off).getTime() > Date.now())
    .sort((a, b) => a.tip_off.localeCompare(b.tip_off))

  return (
    <>
      <main className="screen">
        <TopBar />
        {match ? <MatchDay match={match} /> : (
          <div className="empty">Der er ingen kampe i kalenderen lige nu. Kig forbi igen snart.</div>
        )}
        {upcoming.length > 0 && (
          <section className="stack" aria-labelledby="next-h">
            <h2 id="next-h" className="h-section">Kommende kampe</h2>
            <div>
              {upcoming.map((m) => (
                <div key={m.id} className="list-row">
                  <span><b>{m.is_home ? 'Team FOG – ' : ''}{m.opponent}{m.is_home ? '' : ' – Team FOG'}</b><br />
                    <span className="small muted">{fmtDay(m.tip_off)} · {fmtTime(m.tip_off)} · {m.venue}</span></span>
                  {m.ticket_url && <a className="btn btn--ghost" href={m.ticket_url} target="_blank" rel="noreferrer">Billet</a>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <TabBar />
    </>
  )
}

function MatchDay({ match }: { match: Match }) {
  const { profile, refreshStats, toast, pointsVersion } = useApp()
  const { data: state, reload } = useLoad(() => api.myMatchState(match.id), [match.id, pointsVersion])
  const { data: counters } = useLoad(() => api.counters(match.id), [match.id, state?.rsvp, state?.checkedIn])
  const { busy, run } = useAction()
  const tipOff = new Date(match.tip_off).getTime()
  const beforeTip = match.status === 'upcoming' && tipOff > Date.now()
  const window_ = inMatchWindow(match)

  async function rsvp() {
    const pts = await run(() => api.rsvp(match.id))
    if (pts !== undefined) {
      toast(pts ? `Fedt! Du er meldt til · +${pts} point` : 'Du er allerede meldt til')
      reload()
      void refreshStats()
    }
  }

  const status =
    match.status === 'live' ? <span className="chip chip--live">Live</span>
      : match.status === 'finished' ? <span className="chip">Slut</span>
        : window_ ? <span className="chip chip--volt">I aften</span>
          : <span className="chip chip--volt">{match.is_home ? 'Næste hjemmekamp' : 'Næste kamp'}</span>

  const count = beforeTip && !window_ ? counters?.rsvps : counters?.checkins

  return (
    <>
      {match.status === 'live' && (
        <Link to="/live" className="card row row--between" style={{ background: 'var(--c-orange)', color: 'var(--c-ink)', border: 0, textDecoration: 'none' }}>
          <b style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>Kampen er i gang</b>
          <span className="display" style={{ fontSize: 30 }}>{match.fog_score}–{match.opponent_score}</span>
        </Link>
      )}

      <section className="card card--cut relative stack" style={{ padding: 20, gap: 14 }} aria-label="Kampens detaljer">
        <CourtLines style={{ right: -90, top: -90, color: 'var(--c-chalk)' }} />
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>{status}<span className="chip">{match.competition}</span></div>
        <h1 className="display" style={{ fontSize: 44 }}>
          {match.is_home ? 'Team FOG' : match.opponent}<br />
          <span className="dim" style={{ fontSize: 26 }}>mod</span><br />
          {match.is_home ? match.opponent : 'Team FOG'}
        </h1>
        <div className="row row--baseline">
          <span className="display volt" style={{ fontSize: 56 }}>{fmtTime(match.tip_off)}</span>
          <span className="muted" style={{ lineHeight: 1.35 }}>{fmtDay(match.tip_off)}<br />{match.venue}</span>
        </div>
        {beforeTip && <Countdown to={match.tip_off} />}

        <div className="stack" style={{ gap: 10 }}>
          {state?.checkedIn ? (
            <div className="chip chip--volt" style={{ height: 44, justifyContent: 'center', fontSize: 14 }}><Icon name="check" size={18} stroke={3} />Du er tjekket ind</div>
          ) : window_ && match.status !== 'finished' ? (
            <Link to="/tjek-ind" className="btn btn--primary btn--block"><Icon name="scan" size={20} />Tjek ind · +50</Link>
          ) : beforeTip && state && !state.rsvp ? (
            <button className="btn btn--primary btn--block" disabled={busy} onClick={rsvp}>Jeg kommer · +10</button>
          ) : beforeTip && state?.rsvp ? (
            <p className="small muted row"><Icon name="check" size={16} />Du er meldt til. Tjek ind i hallen fra {fmtTime(addMinutes(match.tip_off, -CHECKIN_OPENS_MIN))}.</p>
          ) : null}
          <div className="row" style={{ gap: 10 }}>
            {match.ticket_url && match.status !== 'finished' && (
              <a className="btn btn--secondary" style={{ flex: 1, padding: '0 12px', whiteSpace: 'nowrap' }} href={match.ticket_url} target="_blank" rel="noreferrer">Køb billet</a>
            )}
            <button className="btn btn--secondary" style={{ flex: 1, padding: '0 12px', whiteSpace: 'nowrap' }} onClick={() => shareInvite(profile.referral_code, toast)}>Inviter ven</button>
          </div>
        </div>
      </section>

      {(beforeTip || state?.prediction) && <Prediction match={match} current={state?.prediction ?? null} onSaved={reload} locked={!beforeTip} />}

      {counters && match.status !== 'finished' && (
        <section className="card card--chalk card--cut stack" style={{ gap: 8 }} aria-label="Fællesmål">
          <h2 className="display" style={{ fontSize: 24 }}>Fællesmål: {fmtNum(counters.goal)} i hallen</h2>
          <Bar ink value={(count ?? 0) / counters.goal} label="Fremgang mod fællesmålet" />
          <p className="small">
            <b>{fmtNum(count ?? 0)} {beforeTip && !window_ ? 'har meldt sig' : 'er tjekket ind'}.</b>{' '}
            {match.goal_reward ? `Når vi rammer målet: ${match.goal_reward}.` : 'Tag en ven med!'}
          </p>
        </section>
      )}

      {match.status !== 'finished' && <Timeline match={match} />}
      <Practical />
    </>
  )
}

function Prediction({ match, current, onSaved, locked }: { match: Match; current: { winner: Winner; margin: Margin; points_awarded: number | null } | null; onSaved: () => void; locked: boolean }) {
  const [editing, setEditing] = useState(!current)
  const [winner, setWinner] = useState<Winner>(current?.winner ?? 'fog')
  const [margin, setMargin] = useState<Margin>(current?.margin ?? '6-10')
  const { busy, run } = useAction()
  const { toast } = useApp()
  const name = (w: Winner) => (w === 'fog' ? 'Team FOG' : match.opponent)

  async function save() {
    const ok = await run(async () => { await api.predict(match.id, winner, margin); return true })
    if (ok) { toast('Dit tip er gemt. Det låses ved tip-off.'); setEditing(false); onSaved() }
  }

  if (current && (!editing || locked)) {
    return (
      <section className="card row row--between" aria-label="Dit tip">
        <div className="row"><Icon name="clock" size={26} />
          <p className="small"><b>Dit tip:</b> {name(current.winner)} vinder med <span style={{ whiteSpace: 'nowrap' }}>{current.margin}</span><br />
            <span className="muted">
              {current.points_awarded !== null ? `Afgjort: +${current.points_awarded} point` : locked ? 'Afgøres ved slutfløjt · op til +150' : 'Kan ændres indtil tip-off'}
            </span></p>
        </div>
        {!locked && <button className="btn btn--ghost" onClick={() => setEditing(true)}>Ret</button>}
      </section>
    )
  }

  return (
    <section className="card stack" aria-labelledby="tip-h">
      <div className="row row--between row--baseline">
        <h2 id="tip-h" className="h-section">Tip kampen</h2>
        <span className="small volt" style={{ fontWeight: 700 }}>op til +150</span>
      </div>
      <div className="grid-2" role="group" aria-label="Hvem vinder?">
        {(['fog', 'opponent'] as Winner[]).map((w) => (
          <button key={w} className="choice" aria-pressed={winner === w} onClick={() => setWinner(w)}>{name(w)}<span className="choice__mark" /></button>
        ))}
      </div>
      <div className="label">Med hvor meget?</div>
      <div className="grid-4" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} role="group" aria-label="Sejrsmargin">
        {MARGINS.map((m) => (
          <button key={m} className="choice" style={{ justifyContent: 'center' }} aria-pressed={margin === m} onClick={() => setMargin(m)}>{m}</button>
        ))}
      </div>
      <button className="btn btn--primary btn--block" disabled={busy} onClick={save}>Gem tip</button>
      <p className="small muted">Rigtig vinder giver 50 point. Rammer du også margin, får du 100 ekstra.</p>
    </section>
  )
}

function Timeline({ match }: { match: Match }) {
  const now = Date.now()
  const rows = [
    { at: addMinutes(match.tip_off, -CHECKIN_OPENS_MIN), text: 'Check-in åbner · +50' },
    { at: addMinutes(match.tip_off, -EARLY_MIN), text: 'Sidste chance for tidlig-bonus · +25' },
    { at: match.tip_off, text: 'Tip-off · tip låses', key: true },
    { at: null, text: 'MVP-afstemning åbner i 4. periode' },
  ]
  return (
    <section className="stack" aria-labelledby="tl-h">
      <div className="row row--between row--baseline">
        <h2 id="tl-h" className="h-section">Kampaftenen</h2>
        <span className="small dim">{fmtShortDate(match.tip_off)}</span>
      </div>
      <div className="timeline">
        {rows.map((r) => (
          <div key={r.text} className={`timeline__row ${r.key ? 'is-key' : ''} ${r.at && new Date(r.at).getTime() < now ? 'is-past' : ''}`}>
            <b className={r.key ? 'volt' : 'muted'}>{r.at ? fmtTime(r.at) : '—'}</b>
            <span className="timeline__dot" />
            <span>{r.text}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

const INFO: { key: string; label: string; icon: IconName; body: React.ReactNode }[] = [
  { key: 'parking', label: 'Parkering', icon: 'parking', body: <p className="muted">[Parkeringsinformation fra klubben: hvor, pris og hvornår det fylder op.]</p> },
  { key: 'food', label: 'Mad', icon: 'food', body: <p className="muted">[Udvalg og priser i caféen fra klubben.]</p> },
  { key: 'arena', label: 'Arena', icon: 'map', body: <p className="muted">Kampene spilles i Arena Næstved. Se adresse og kort på <a href="https://arenanaestved.dk" target="_blank" rel="noreferrer">arenanaestved.dk</a>.</p> },
  { key: 'access', label: 'Handicap', icon: 'access', body: <p className="muted">Handicappladser kan ikke købes online. Skriv til <a href="mailto:hvl@teamfog.dk">hvl@teamfog.dk</a>, så finder klubben en plads til dig.</p> },
]

function Practical() {
  const [open, setOpen] = useState<string | null>(null)
  const item = INFO.find((i) => i.key === open)
  return (
    <section aria-label="Praktisk information">
      <div className="grid-4">
        {INFO.map((i) => (
          <button key={i.key} className="icon-btn" style={{ width: '100%', height: 72, flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 600 }} onClick={() => setOpen(i.key)}>
            <Icon name={i.icon} />{i.label}
          </button>
        ))}
      </div>
      {item && <Sheet title={item.label} onClose={() => setOpen(null)}>{item.body}</Sheet>}
    </section>
  )
}
