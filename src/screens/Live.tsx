import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Match, type NoiseRound, type Player, type Side } from '../lib/api'
import { useApp } from '../lib/store'
import { fmtDay, fmtNum, fmtTime } from '../lib/format'
import { useNoiseMeter } from '../lib/useNoiseMeter'
import { Icon } from '../components/Icon'
import { TabBar, TopBar, useAction, useLoad } from '../components/ui'

export default function Live() {
  const { match } = useApp()

  if (!match) {
    return <><main className="screen"><TopBar /><div className="empty">Ingen kamp i kalenderen.</div></main><TabBar /></>
  }

  return (
    <>
      <Scoreboard match={match} />
      <main className="screen" style={{ paddingTop: 18 }}>
        {match.status === 'upcoming' ? (
          <div className="stack stack--lg">
            <div className="card--dashed card stack">
              <b>Live åbner ved tip-off</b>
              <p className="small muted">{fmtDay(match.tip_off)} kl. {fmtTime(match.tip_off)}. Under kampen kan du følge scoren, være med i larm-runder og stemme på kampens MVP.</p>
            </div>
            <Link to="/" className="btn btn--primary btn--block">Tip kampen før start</Link>
          </div>
        ) : (
          <>
            <NoiseSection match={match} />
            <MvpSection match={match} />
            <PredictionStatus match={match} />
          </>
        )}
      </main>
      <TabBar />
    </>
  )
}

function Scoreboard({ match }: { match: Match }) {
  const live = match.status === 'live'
  const fog = { name: 'Team FOG', score: match.fog_score }
  const opp = { name: match.opponent, score: match.opponent_score }
  const [left, right] = match.is_home ? [fog, opp] : [opp, fog]
  return (
    <header style={{ background: 'var(--c-orange)', color: 'var(--c-ink)', padding: '18px 20px 16px' }} className="stack">
      <div className="row row--between">
        <span className="row" style={{ gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {live && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c-ink)', animation: 'pulse 1.2s ease-in-out infinite' }} />}
          {live ? `Live${match.period ? ` · ${match.period}` : ''}` : match.status === 'finished' ? 'Slutresultat' : 'Kommende kamp'}
        </span>
        <span className="display" style={{ fontSize: 22 }}>{live ? match.clock ?? '' : fmtTime(match.tip_off)}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }} aria-live="polite"
        aria-label={`${left.name} ${left.score}, ${right.name} ${right.score}`}>
        {[left, null, right].map((t, i) => t === null ? (
          <span key="sep" className="display" style={{ fontSize: 32 }}>:</span>
        ) : (
          <div key={t.name} className="stack" style={{ gap: 0, alignItems: i === 0 ? 'flex-start' : 'flex-end', opacity: t === opp ? 0.7 : 1 }}>
            <span className="display" style={{ fontSize: 72, lineHeight: 0.85 }}>{match.status === 'upcoming' ? '–' : t.score}</span>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t.name}</span>
          </div>
        ))}
      </div>
    </header>
  )
}

function NoiseSection({ match }: { match: Match }) {
  const { profile, refreshStats, toast } = useApp()
  const [round, setRound] = useState<NoiseRound | null>(null)
  const [side, setSide] = useState<Side | null>(profile.noise_side)
  const [submitted, setSubmitted] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const meter = useNoiseMeter()
  const { run } = useAction()
  const { data: results, reload: reloadResults } = useLoad(() => (round ? api.noiseResults(round.id) : Promise.resolve([])), [round?.id, submitted])
  const submitting = useRef(false)

  useEffect(() => {
    api.latestNoiseRound(match.id).then(setRound)
    return api.subscribeNoiseRounds(match.id, (r) => setRound(r))
  }, [match.id])

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [])

  const active = round && now < new Date(round.ends_at).getTime()
  const secondsLeft = round ? Math.max(0, Math.ceil((new Date(round.ends_at).getTime() - now) / 1000)) : 0

  // Når runden slutter, sendes gennemsnittet automatisk.
  useEffect(() => {
    if (!round || active || !meter.running || submitting.current || !side) return
    submitting.current = true
    const { average } = meter.stop()
    run(() => api.submitNoise(round.id, side, average)).then((pts) => {
      submitting.current = false
      if (pts !== undefined) {
        setSubmitted(round.id)
        toast(`Din larm: ${Math.round(average)} · +${pts} point`)
        void refreshStats()
        window.setTimeout(reloadResults, 1500)
      }
    })
  }, [active, round, meter, side, run, toast, refreshStats, reloadResults])

  const bars = meter.history

  return (
    <section className="card stack" aria-labelledby="noise-h">
      <div className="row row--between row--baseline">
        <h2 id="noise-h" className="h-section" style={{ fontSize: 22 }}>Larm-runde</h2>
        {active ? <span className="chip chip--live">{secondsLeft} sek</span> : <span className="small muted">Vises på storskærmen</span>}
      </div>

      {active && submitted !== round!.id ? (
        <>
          {!side && (
            <div className="stack">
              <span className="label">Hvor sidder du?</span>
              <div className="grid-2">
                {(['A', 'B'] as Side[]).map((s) => <button key={s} className="choice" aria-pressed={false} onClick={() => setSide(s)}>Langside {s}<span className="choice__mark" /></button>)}
              </div>
            </div>
          )}
          {side && !meter.running && (
            <button className="btn btn--primary btn--block" onClick={meter.start}><Icon name="mic" size={20} />Start larm · Langside {side}</button>
          )}
          {meter.error && <p className="small" style={{ color: 'var(--c-orange)' }}>{meter.error}</p>}
          {meter.running && (
            <>
              <div className="noise-bars" aria-hidden="true">
                {bars.map((v, i) => <span key={i} style={{ height: `${Math.max(6, v)}%`, background: v > 80 ? 'var(--c-orange)' : v > 45 ? 'var(--c-volt)' : undefined }} />)}
              </div>
              <p className="center display" style={{ fontSize: 40 }} aria-live="off">{Math.round(meter.level)}</p>
              <p className="center small muted">Råb for Team FOG! Din telefon måler i {secondsLeft} sekunder mere.</p>
            </>
          )}
        </>
      ) : results && results.length > 0 ? (
        <div className="grid-2">
          {(['A', 'B'] as Side[]).map((s) => {
            const r = results.find((x) => x.side === s)
            const best = Math.max(...results.map((x) => x.avg_level)) === r?.avg_level
            return (
              <div key={s} style={{ borderTop: `2px solid ${best ? 'var(--c-volt)' : 'var(--c-line-strong)'}`, paddingTop: 6 }}>
                <div className="row row--between small"><b>Langside {s}</b>{best && <span className="volt">Vinder</span>}</div>
                <div className="display" style={{ fontSize: 34 }}>{r ? Math.round(r.avg_level) : '–'}</div>
                <div className="small dim">{r ? `${fmtNum(r.participants)} med` : 'Ingen'}</div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="small muted">Når speakeren starter en larm-runde, måler din telefon hvor højt du råber. Den langside der larmer mest, vinder. +10 point for at være med.</p>
      )}
    </section>
  )
}

function MvpSection({ match }: { match: Match }) {
  const { refreshStats, toast, pointsVersion } = useApp()
  const { data: players } = useLoad(() => api.listPlayers(), [])
  const { data: state, reload } = useLoad(() => api.myMatchState(match.id), [match.id, pointsVersion])
  const showResults = !!state?.mvpVote || match.status === 'finished'
  const { data: results } = useLoad(() => (showResults ? api.mvpResults(match.id) : Promise.resolve([])), [match.id, showResults, state?.mvpVote])
  const { busy, run } = useAction()

  async function vote(p: Player) {
    const pts = await run(() => api.voteMvp(match.id, p.id))
    if (pts !== undefined) { toast(`Stemme afgivet på ${p.name} · +${pts}`); reload(); void refreshStats() }
  }

  if (!players) return null
  const mvp = players.find((p) => p.id === match.mvp_player_id)
  const total = results?.reduce((n, r) => n + r.votes, 0) ?? 0

  return (
    <section className="stack" aria-labelledby="mvp-h">
      <div className="row row--between row--baseline">
        <h2 id="mvp-h" className="h-section">{match.status === 'finished' ? 'Kampens MVP' : 'Stem på kampens MVP'}</h2>
        {match.mvp_open && !state?.mvpVote && <span className="small volt" style={{ fontWeight: 700 }}>+25 point</span>}
      </div>

      {mvp && (
        <div className="card card--cut row" style={{ background: 'var(--c-volt)', color: 'var(--c-ink)', gap: 14 }}>
          <span className="display" style={{ fontSize: 46 }}>{mvp.number ? `#${mvp.number}` : <Icon name="star" size={40} />}</span>
          <span><span className="eyebrow" style={{ color: 'var(--c-ink)' }}>MVP</span><br /><b style={{ fontSize: 20 }}>{mvp.name}</b></span>
        </div>
      )}

      {match.mvp_open && !state?.mvpVote ? (
        <div className="grid-2">
          {players.map((p) => (
            <button key={p.id} className="card stack" disabled={busy} onClick={() => vote(p)}
              style={{ height: 96, justifyContent: 'space-between', alignItems: 'flex-start', textAlign: 'left', padding: 10 }}>
              <span className="display" style={{ fontSize: 40, color: 'var(--c-dim)' }}>{p.number ? `#${p.number}` : p.name.split(' ').map((x) => x[0]).join('')}</span>
              <b style={{ fontSize: 14 }}>{p.name}</b>
            </button>
          ))}
        </div>
      ) : showResults && results && total > 0 ? (
        <div className="stack" style={{ gap: 10 }}>
          {results.slice(0, 5).map((r) => {
            const p = players.find((x) => x.id === r.player_id)
            const mine = state?.mvpVote === r.player_id
            return (
              <div key={r.player_id} className="stack" style={{ gap: 4 }}>
                <div className="row row--between small"><b>{p?.name}{mine && <span className="volt"> · din stemme</span>}</b><span className="muted">{Math.round((r.votes / total) * 100)}%</span></div>
                <div className="bar" style={{ height: 8 }}><span style={{ width: `${(r.votes / total) * 100}%`, background: mine ? 'var(--c-volt)' : 'var(--c-chalk)' }} /></div>
              </div>
            )
          })}
        </div>
      ) : !mvp ? (
        <p className="small muted">Afstemningen åbner i 4. periode. Hold øje med storskærmen.</p>
      ) : null}
    </section>
  )
}

function PredictionStatus({ match }: { match: Match }) {
  const { pointsVersion } = useApp()
  const { data: state } = useLoad(() => api.myMatchState(match.id), [match.id, pointsVersion, match.status])
  const p = state?.prediction
  if (!p) return null
  const winner = p.winner === 'fog' ? 'Team FOG' : match.opponent
  return (
    <section className="card card--dashed row" aria-label="Dit tip">
      <Icon name="clock" size={28} />
      <p className="small"><b>Dit tip før kampen:</b> {winner} vinder med <span style={{ whiteSpace: 'nowrap' }}>{p.margin}</span>.<br />
        <span className="muted">{p.points_awarded !== null ? (p.points_awarded >= 150 ? `Plet! Rigtig vinder og margin · +${p.points_awarded} point` : p.points_awarded > 0 ? `Rigtig vinder · +${p.points_awarded} point` : 'Ikke ramt denne gang') : 'Afgøres ved slutfløjt · op til +150 point'}</span>
      </p>
    </section>
  )
}
