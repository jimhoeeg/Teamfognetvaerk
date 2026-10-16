import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api, type Match, type MatchInput, type Mission, type Player, type Reward } from '../lib/api'
import { useApp } from '../lib/store'
import { fmtDay, fmtTime } from '../lib/format'
import { QrImage, TopBar, useAction, useLoad } from '../components/ui'

const PERIODS = ['1. periode', '2. periode', 'Pause', '3. periode', '4. periode', 'Overtid']

const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

/** Kampstyring for klubbens frivillige/ansatte. Kræver rollen admin. */
export default function Admin() {
  const { profile, matches, match: current } = useApp()
  const [selected, setSelected] = useState<string | null>(current?.id ?? null)
  const [creating, setCreating] = useState(false)
  const match = matches.find((m) => m.id === selected) ?? null

  if (profile.role !== 'admin') return <Navigate to="/" replace />

  const sorted = [...matches].sort((a, b) => b.tip_off.localeCompare(a.tip_off))

  return (
    <main className="screen" style={{ paddingBottom: 48 }}>
      <TopBar back="/profil" title="Kampstyring" />
      {api.mode === 'demo' && <p className="small muted">Demo: åbn appen i en anden fane som fan for at se ændringerne live.</p>}

      <div className="stack">
        <label htmlFor="msel" className="label">Kamp</label>
        <div className="row">
          <select id="msel" className="input" value={selected ?? ''} onChange={(e) => { setSelected(e.target.value); setCreating(false) }}>
            {sorted.map((m) => <option key={m.id} value={m.id}>{fmtDay(m.tip_off)} · {m.opponent} ({m.status})</option>)}
          </select>
          <button className="btn btn--secondary" onClick={() => setCreating(true)}>Ny</button>
        </div>
      </div>

      {creating ? (
        <MatchForm onSaved={(m) => { setSelected(m.id); setCreating(false) }} />
      ) : match ? (
        <>
          <LiveControl match={match} />
          <CheckinCode match={match} />
          <details className="card"><summary className="h-section" style={{ fontSize: 20, cursor: 'pointer' }}>Ret kampinfo</summary>
            <div style={{ marginTop: 16 }}><MatchForm match={match} onSaved={() => {}} /></div>
          </details>
        </>
      ) : null}

      <Missions matchId={match?.id ?? null} />
      <Rewards />
      <Players />
    </main>
  )
}

function MatchForm({ match, onSaved }: { match?: Match; onSaved: (m: Match) => void }) {
  const { refreshMatches, toast } = useApp()
  const [f, setF] = useState<MatchInput>(() => match ?? {
    opponent: '', tip_off: new Date(Date.now() + 7 * 86400_000).toISOString(), is_home: true, venue: 'Arena Næstved',
    competition: 'Basketligaen', ticket_url: '', attendance_goal: 2000, goal_reward: '',
  })
  const { busy, run } = useAction()
  const set = (k: keyof MatchInput, v: unknown) => setF((x) => ({ ...x, [k]: v }))

  async function save() {
    const { id, opponent, tip_off, is_home, venue, competition, ticket_url, attendance_goal, goal_reward } = f
    const m = await run(() => api.admin.saveMatch({ id, opponent, tip_off, is_home, venue, competition, ticket_url: ticket_url || null, attendance_goal, goal_reward: goal_reward || null }))
    if (m) { toast('Kampen er gemt'); await refreshMatches(); onSaved(m) }
  }

  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); void save() }}>
      <div className="field"><label htmlFor="f-opp">Modstander</label><input id="f-opp" className="input" required value={f.opponent ?? ''} onChange={(e) => set('opponent', e.target.value)} /></div>
      <div className="field"><label htmlFor="f-tip">Tip-off</label><input id="f-tip" className="input" type="datetime-local" required value={toLocalInput(f.tip_off!)} onChange={(e) => set('tip_off', new Date(e.target.value).toISOString())} /></div>
      <div className="grid-2">
        <button type="button" className="choice" aria-pressed={!!f.is_home} onClick={() => set('is_home', true)}>Hjemme<span className="choice__mark" /></button>
        <button type="button" className="choice" aria-pressed={!f.is_home} onClick={() => set('is_home', false)}>Ude<span className="choice__mark" /></button>
      </div>
      <div className="field"><label htmlFor="f-venue">Hal</label><input id="f-venue" className="input" value={f.venue ?? ''} onChange={(e) => set('venue', e.target.value)} /></div>
      <div className="field"><label htmlFor="f-comp">Turnering</label><input id="f-comp" className="input" value={f.competition ?? ''} onChange={(e) => set('competition', e.target.value)} /></div>
      <div className="field"><label htmlFor="f-url">Billetlink</label><input id="f-url" className="input" type="url" value={f.ticket_url ?? ''} onChange={(e) => set('ticket_url', e.target.value)} /></div>
      <div className="field"><label htmlFor="f-goal">Fællesmål (tilskuere)</label><input id="f-goal" className="input" inputMode="numeric" value={f.attendance_goal ?? 2000} onChange={(e) => set('attendance_goal', Number(e.target.value.replace(/\D/g, '')) || 0)} /></div>
      <div className="field"><label htmlFor="f-rew">Fælles belønning</label><input id="f-rew" className="input" value={f.goal_reward ?? ''} onChange={(e) => set('goal_reward', e.target.value)} /></div>
      <button className="btn btn--primary btn--block" disabled={busy}>Gem kamp</button>
    </form>
  )
}

function LiveControl({ match }: { match: Match }) {
  const { toast, refreshMatches } = useApp()
  const { busy, run } = useAction()
  const { data: players } = useLoad(() => api.listPlayers(), [])
  const [mvp, setMvp] = useState('')
  const [clock, setClock] = useState(match.clock ?? '')
  useEffect(() => setClock(match.clock ?? ''), [match.id, match.clock])

  const patch = (p: Partial<Match>) => run(async () => {
    const m = await api.admin.saveMatch({ id: match.id, ...p })
    await refreshMatches()
    return m
  })
  const score = (key: 'fog_score' | 'opponent_score', d: number) => patch({ [key]: Math.max(0, match[key] + d) })

  async function finish() {
    if (!window.confirm(`Afslut kampen ${match.fog_score}–${match.opponent_score}? Tips bliver afgjort og point uddelt.`)) return
    const r = await run(() => api.admin.finishMatch(match.id, mvp || null))
    await refreshMatches()
    if (r) toast(`Kampen er afsluttet. ${r.correct_predictions} ramte vinderen.`)
  }
  async function noise() {
    const id = await run(() => api.admin.startNoise(match.id, 15))
    if (id) toast('Larm-runde i gang (15 sek)')
  }

  if (match.status === 'finished') {
    return <div className="card"><b>Kampen er afsluttet</b> · {match.fog_score}–{match.opponent_score}</div>
  }

  return (
    <section className="card stack" aria-labelledby="live-h">
      <div className="row row--between"><h2 id="live-h" className="h-section">Live</h2>
        {match.status === 'live' ? <span className="chip chip--live">Live</span> : <span className="chip">{fmtTime(match.tip_off)}</span>}
      </div>
      {match.status === 'upcoming' && (
        <button className="btn btn--primary btn--block" disabled={busy} onClick={() => patch({ status: 'live', period: '1. periode' })}>Start kampen (tip-off)</button>
      )}
      {match.status === 'live' && (
        <>
          {([['fog_score', 'Team FOG'], ['opponent_score', match.opponent]] as const).map(([k, label]) => (
            <div key={k} className="stack" style={{ gap: 6 }}>
              <div className="row row--between"><b>{label}</b><span className="display" style={{ fontSize: 40 }}>{match[k]}</span></div>
              <div className="grid-4">
                {[1, 2, 3, -1].map((d) => (
                  <button key={d} className={d > 0 ? 'btn btn--secondary' : 'btn btn--ghost'} style={{ padding: 0 }} disabled={busy} onClick={() => score(k, d)}
                    aria-label={`${label} ${d > 0 ? 'plus' : 'minus'} ${Math.abs(d)}`}>{d > 0 ? `+${d}` : '−1'}</button>
                ))}
              </div>
            </div>
          ))}
          <div className="grid-2">
            <div className="field">
              <label htmlFor="period">Periode</label>
              <select id="period" className="input" value={match.period ?? ''} onChange={(e) => patch({ period: e.target.value })}>
                {PERIODS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <form className="field" onSubmit={(e) => { e.preventDefault(); void patch({ clock }) }}>
              <label htmlFor="clock">Ur</label>
              <input id="clock" className="input" value={clock} placeholder="04:12" onChange={(e) => setClock(e.target.value)} onBlur={() => clock !== (match.clock ?? '') && patch({ clock })} />
            </form>
          </div>
          <div className="grid-2">
            <button className={match.mvp_open ? 'btn btn--primary' : 'btn btn--secondary'} disabled={busy} onClick={() => patch({ mvp_open: !match.mvp_open })}>
              {match.mvp_open ? 'Luk MVP' : 'Åbn MVP'}
            </button>
            <button className="btn btn--secondary" disabled={busy} onClick={noise}>Larm-runde</button>
          </div>
          <div className="divider" />
          <div className="field">
            <label htmlFor="mvp">Kampens MVP</label>
            <select id="mvp" className="input" value={mvp} onChange={(e) => setMvp(e.target.value)}>
              <option value="">Vælg (eller brug flest stemmer)</option>
              {players?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button className="btn btn--primary btn--block" style={{ background: 'var(--c-orange)' }} disabled={busy} onClick={finish}>Slutfløjt · afslut kamp</button>
        </>
      )}
    </section>
  )
}

function CheckinCode({ match }: { match: Match }) {
  const { data: code } = useLoad(() => api.admin.getCheckinCode(match.id), [match.id])
  if (!code) return null
  const url = `${window.location.origin}/tjek-ind?kode=${code}`
  return (
    <section className="card stack" aria-labelledby="ci-h">
      <h2 id="ci-h" className="h-section" style={{ fontSize: 20 }}>Check-in-plakat</h2>
      <div className="row" style={{ gap: 16, alignItems: 'center' }}>
        <QrImage text={url} size={132} label={`QR-kode til check-in, kode ${code}`} />
        <div className="stack" style={{ gap: 4 }}>
          <span className="small muted">Kode</span>
          <span className="display volt" style={{ fontSize: 34, letterSpacing: '0.08em' }}>{code}</span>
          <span className="small muted">Print og sæt op ved indgangene. Virker fra en time før tip-off.</span>
        </div>
      </div>
      <button className="btn btn--secondary" onClick={() => window.print()}>Print</button>
    </section>
  )
}

function Missions({ matchId }: { matchId: string | null }) {
  const { data: missions } = useLoad<Mission[]>(() => (matchId ? api.matchMissions(matchId) : Promise.resolve([])), [matchId])
  const { data: answers, reload } = useLoad(() => api.admin.missionAnswers(), [])
  const [edit, setEdit] = useState<Record<string, string>>({})
  const { busy, run } = useAction()
  const { toast } = useApp()
  if (!missions?.length || !answers) return null

  async function save(id: string) {
    const ok = await run(async () => { await api.admin.saveMissionAnswer(id, edit[id]); return true })
    if (ok) { toast('Koden er gemt'); reload() }
  }

  return (
    <details className="card">
      <summary className="h-section" style={{ fontSize: 20, cursor: 'pointer' }}>Ditlevs missioner</summary>
      <div className="stack" style={{ marginTop: 16 }}>
        <p className="small muted">Skift koderne før hver kamp, så de ikke deles videre. QR-koderne kan printes til plakater.</p>
        {missions.map((m) => {
          const value = edit[m.id] ?? answers[m.id] ?? ''
          return (
            <div key={m.id} className="stack" style={{ gap: 8, paddingBottom: 12, borderBottom: '1px solid var(--c-line)' }}>
              <b>{m.sort}. {m.title}</b>
              {m.kind === 'quiz' && <span className="small muted">{m.question} · rigtigt svar:</span>}
              <div className="row">
                <label htmlFor={`ma-${m.id}`} className="sr-only">Kode for {m.title}</label>
                <input id={`ma-${m.id}`} className="input" value={value} onChange={(e) => setEdit((x) => ({ ...x, [m.id]: e.target.value }))} />
                <button className="btn btn--secondary" disabled={busy || value === answers[m.id]} onClick={() => save(m.id)}>Gem</button>
              </div>
              {m.kind === 'code' && answers[m.id] && (
                <QrImage text={`${window.location.origin}/dunk?m=${m.id}&kode=${encodeURIComponent(answers[m.id])}`} size={96} label={`QR til ${m.title}`} />
              )}
            </div>
          )
        })}
      </div>
    </details>
  )
}

function Rewards() {
  const { data: rewards, reload } = useLoad(() => api.listRewards(), [])
  const [f, setF] = useState({ partner: '', title: '', cost: '300', stock: '' })
  const { busy, run } = useAction()

  async function add() {
    const r = await run(() => api.admin.saveReward({ partner: f.partner, title: f.title, cost: Number(f.cost), stock: f.stock ? Number(f.stock) : null }))
    if (r) { setF({ partner: '', title: '', cost: '300', stock: '' }); reload() }
  }
  async function hide(r: Reward) {
    await run(() => api.admin.saveReward({ ...r, active: false }))
    reload()
  }

  return (
    <details className="card">
      <summary className="h-section" style={{ fontSize: 20, cursor: 'pointer' }}>Belønninger</summary>
      <div className="stack" style={{ marginTop: 16 }}>
        {rewards?.map((r) => (
          <div key={r.id} className="list-row">
            <span className="small"><b>{r.partner}</b> · {r.title}<br /><span className="muted">{r.cost} point{r.stock !== null ? ` · ${r.stock} tilbage` : ''}</span></span>
            <button className="btn btn--ghost" onClick={() => hide(r)}>Skjul</button>
          </div>
        ))}
        <form className="stack" onSubmit={(e) => { e.preventDefault(); void add() }}>
          <div className="field"><label htmlFor="r-p">Partner</label><input id="r-p" className="input" required value={f.partner} onChange={(e) => setF({ ...f, partner: e.target.value })} /></div>
          <div className="field"><label htmlFor="r-t">Tilbud</label><input id="r-t" className="input" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="grid-2">
            <div className="field"><label htmlFor="r-c">Point</label><input id="r-c" className="input" inputMode="numeric" required value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value.replace(/\D/g, '') })} /></div>
            <div className="field"><label htmlFor="r-s">Antal (tom = ubegrænset)</label><input id="r-s" className="input" inputMode="numeric" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value.replace(/\D/g, '') })} /></div>
          </div>
          <button className="btn btn--secondary btn--block" disabled={busy}>Tilføj belønning</button>
        </form>
      </div>
    </details>
  )
}

function Players() {
  const { data: players, reload } = useLoad(() => api.listPlayers(), [])
  const [name, setName] = useState('')
  const { busy, run } = useAction()

  async function save(p: Partial<Player> & { name: string }) {
    await run(() => api.admin.savePlayer(p))
    reload()
  }

  return (
    <details className="card">
      <summary className="h-section" style={{ fontSize: 20, cursor: 'pointer' }}>Spillere</summary>
      <div className="stack" style={{ marginTop: 16 }}>
        {players?.map((p) => (
          <div key={p.id} className="row">
            <span style={{ flex: 1 }}>{p.name}</span>
            <label htmlFor={`pn-${p.id}`} className="sr-only">Trøjenummer for {p.name}</label>
            <input id={`pn-${p.id}`} className="input" style={{ width: 72 }} placeholder="#" defaultValue={p.number ?? ''}
              onBlur={(e) => e.target.value !== (p.number ?? '') && save({ id: p.id, name: p.name, number: e.target.value || null })} />
            <button className="btn btn--ghost" onClick={() => save({ id: p.id, name: p.name, active: false })}>Fjern</button>
          </div>
        ))}
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { void save({ name: name.trim() }); setName('') } }}>
          <label htmlFor="newp" className="sr-only">Ny spiller</label>
          <input id="newp" className="input" placeholder="Ny spiller" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn--secondary" disabled={busy || !name.trim()}>Tilføj</button>
        </form>
      </div>
    </details>
  )
}
