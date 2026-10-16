import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, type Kid, type Mission } from '../lib/api'
import { useApp } from '../lib/store'
import { BADGES, errorText, inMatchWindow } from '../lib/rules'
import { fmtDay, fmtTime } from '../lib/format'
import { CourtLines, Icon } from '../components/Icon'
import { Scanner } from '../components/Scanner'
import { Sheet, TabBar, useAction, useLoad } from '../components/ui'

const ALL_BADGES = Object.keys(BADGES)

export default function Dunk() {
  const { match } = useApp()
  const [params, setParams] = useSearchParams()
  const { data: kids, reload: reloadKids } = useLoad(() => api.listKids(), [])
  const [kidId, setKidId] = useState<string | null>(null)
  const kid = kids?.find((k) => k.id === kidId) ?? kids?.[0] ?? null
  const [version, setVersion] = useState(0)
  const { data: missions } = useLoad(() => (match ? api.matchMissions(match.id) : Promise.resolve([])), [match?.id])
  const { data: stamps } = useLoad(() => (kid && match ? api.kidStamps(kid.id, match.id) : Promise.resolve([])), [kid?.id, match?.id, version])
  const { data: badges } = useLoad(() => (kid ? api.kidBadges(kid.id) : Promise.resolve([])), [kid?.id, version])
  const [open, setOpen] = useState<{ mission: Mission; code?: string } | null>(null)
  const [scanning, setScanning] = useState(false)
  const unlocked = !!match && match.status !== 'finished' && inMatchWindow(match)

  // QR-plakater linker til /dunk?m=<mission>&kode=<kode>.
  useEffect(() => {
    const m = params.get('m')
    if (!m || !missions) return
    const mission = missions.find((x) => x.id === m)
    if (mission) setOpen({ mission, code: params.get('kode') ?? undefined })
    setParams({}, { replace: true })
  }, [params, missions, setParams])

  const onScan = useCallback((_code: string, raw: string) => {
    setScanning(false)
    try {
      const u = new URL(raw)
      const mission = missions?.find((x) => x.id === u.searchParams.get('m'))
      if (mission) return setOpen({ mission, code: u.searchParams.get('kode') ?? undefined })
    } catch { /* ikke et link */ }
  }, [missions])

  const done = stamps?.length ?? 0
  const total = missions?.length ?? 6

  return (
    <>
      <main className="screen screen--orange relative" style={{ overflow: 'hidden' }}>
        <CourtLines size={520} style={{ left: -140, top: 120, color: 'var(--c-ink)', opacity: 0.22 }} />

        <header className="row row--between" style={{ alignItems: 'flex-start', position: 'relative' }}>
          <div className="stack" style={{ gap: 2 }}>
            <span className="eyebrow" style={{ color: 'var(--c-ink)' }}>{kid ? `Hej ${kid.first_name}!` : 'Til børnene'}</span>
            <h1 className="display" style={{ fontSize: 54, lineHeight: 0.86 }}>Ditlev<br />Dunks<br />missioner</h1>
          </div>
          <div aria-label="Illustration af Ditlev Dunk (kommer)" role="img"
            style={{ width: 112, height: 140, border: '3px dashed var(--c-ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.18)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>
            <span className="display" style={{ fontSize: 44 }}>00</span>Ditlev
          </div>
        </header>

        {kids && kids.length === 0 ? <AddKid onAdded={(k) => { reloadKids(); setKidId(k.id) }} intro /> : (
          <>
            {kids && kids.length > 1 && (
              <div className="row" role="group" aria-label="Vælg barn" style={{ flexWrap: 'wrap', gap: 8, position: 'relative' }}>
                {kids.map((k) => (
                  <button key={k.id} className="btn" aria-pressed={k.id === kid?.id} onClick={() => setKidId(k.id)}
                    style={{ minHeight: 44, background: k.id === kid?.id ? 'var(--c-ink)' : 'transparent', color: k.id === kid?.id ? 'var(--c-chalk)' : 'var(--c-ink)', border: '2px solid var(--c-ink)' }}>
                    {k.first_name}
                  </button>
                ))}
              </div>
            )}

            <section className="stack" style={{ background: 'var(--c-ink)', color: 'var(--c-chalk)', padding: 16, clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)', position: 'relative' }} aria-labelledby="stamp-h">
              <div className="row row--between row--baseline">
                <h2 id="stamp-h" className="display" style={{ fontSize: 24 }}>Stempelkort i aften</h2>
                <span className="display volt" style={{ fontSize: 24 }}>{done}/{total}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {missions?.map((m, i) => {
                  const ok = stamps?.includes(m.id)
                  return ok ? (
                    <div key={m.id} style={{ height: 88, background: 'var(--c-volt)', color: 'var(--c-ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, fontWeight: 700, textAlign: 'center', padding: 4 }}>
                      <Icon name="check" size={26} stroke={3} />{m.title}
                    </div>
                  ) : (
                    <button key={m.id} disabled={!unlocked || !kid} onClick={() => setOpen({ mission: m })}
                      style={{ height: 88, border: '2px dashed #5a5a64', background: 'transparent', color: 'var(--c-chalk)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, fontWeight: 700, padding: 4, opacity: unlocked ? 1 : 0.6 }}>
                      <span className="display" style={{ fontSize: 26 }}>{unlocked ? i + 1 : <Icon name="lock" size={20} />}</span>{m.title}
                    </button>
                  )
                })}
              </div>
              <p className="small muted">
                {!match ? 'Ingen kamp i kalenderen.'
                  : unlocked ? (done >= total ? 'Fuldt kort! Du er med i trækningen om aftenens præmie.' : 'Fuldt kort = et badge og et lod i trækningen om aftenens præmie.')
                    : `Stempelkortet åbner i hallen ${fmtDay(match.tip_off)} fra kl. ${fmtTime(new Date(new Date(match.tip_off).getTime() - 3600_000).toISOString())}.`}
              </p>
            </section>

            <section className="stack" style={{ position: 'relative' }} aria-labelledby="badge-h">
              <h2 id="badge-h" className="display" style={{ fontSize: 24 }}>Mine badges</h2>
              <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                {ALL_BADGES.map((b) => badges?.includes(b) ? (
                  <div key={b} className="badge" role="img" aria-label={BADGES[b].text} title={BADGES[b].text}>{BADGES[b].label}</div>
                ) : (
                  <div key={b} className="badge badge--empty" role="img" aria-label={`Låst: ${BADGES[b].text}`}>?</div>
                ))}
              </div>
            </section>

            {unlocked && kid && (
              <button className="btn btn--ink btn--block" style={{ position: 'relative' }} onClick={() => setScanning(true)}>
                <Icon name="scan" size={20} />Scan en mission
              </button>
            )}
          </>
        )}
      </main>

      {scanning && (
        <Sheet title="Scan mission" onClose={() => setScanning(false)}>
          <Scanner onResult={onScan} />
          <p className="small muted">Scan Ditlevs QR-koder i hallen. Har du fået en kode, så tryk på missionen og skriv den.</p>
        </Sheet>
      )}
      {open && kid && match && (
        <MissionSheet kid={kid} matchId={match.id} mission={open.mission} initialCode={open.code}
          onClose={() => setOpen(null)} onDone={() => setVersion((v) => v + 1)} />
      )}
      <TabBar orange />
    </>
  )
}

function MissionSheet({ kid, matchId, mission, initialCode, onClose, onDone }: {
  kid: Kid; matchId: string; mission: Mission; initialCode?: string; onClose: () => void; onDone: () => void
}) {
  const { toast } = useApp()
  const [code, setCode] = useState(initialCode ?? '')
  const [error, setError] = useState<string | null>(null)
  const { busy, run } = useAction()

  const submit = useCallback(async (answer: string) => {
    setError(null)
    const r = await run(() => api.completeMission(kid.id, matchId, mission.id, answer), (e) => setError(errorText(e)))
    if (!r) return
    onDone()
    onClose()
    const badge = r.new_badges.map((b) => BADGES[b]?.text).filter(Boolean).join(', ')
    toast(r.card_complete ? `Fuldt kort, ${kid.first_name}! Du er med i trækningen.` : badge ? `Stempel! Nyt badge: ${badge}` : `Stempel ${r.done}/${r.total}!`)
  }, [run, kid, matchId, mission.id, onDone, onClose, toast])

  // Kode fra QR-link indsendes med det samme (én gang).
  const autoSent = useRef(false)
  useEffect(() => {
    if (initialCode && !autoSent.current) { autoSent.current = true; void submit(initialCode) }
  }, [initialCode, submit])

  return (
    <Sheet title={mission.title} onClose={onClose}>
      {mission.hint && <p className="muted">{mission.hint}</p>}
      {mission.kind === 'quiz' ? (
        <div className="stack">
          <b style={{ fontSize: 18 }}>{mission.question}</b>
          {mission.options?.map((o) => (
            <button key={o} className="choice" disabled={busy} onClick={() => submit(o)}>{o}<span className="choice__mark" /></button>
          ))}
        </div>
      ) : (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); if (code.trim()) void submit(code) }}>
          <div className="field">
            <label htmlFor="mcode">Missionens kode</label>
            <input id="mcode" className="input input--code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12} autoCapitalize="characters" autoComplete="off" />
          </div>
          <button className="btn btn--primary btn--block" disabled={busy || !code.trim()}>Giv mig stemplet</button>
        </form>
      )}
      {error && <p role="alert" style={{ color: 'var(--c-orange)', fontWeight: 600 }}>{error}</p>}
    </Sheet>
  )
}

export function AddKid({ onAdded, intro = false }: { onAdded: (k: Kid) => void; intro?: boolean }) {
  const [name, setName] = useState('')
  const [year, setYear] = useState('')
  const { busy, run } = useAction()

  async function add() {
    const y = Number(year)
    const kid = await run(() => api.addKid(name.trim(), y >= 2005 && y <= 2030 ? y : null))
    if (kid) { setName(''); setYear(''); onAdded(kid) }
  }

  return (
    <form className="stack" style={{ position: 'relative' }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) void add() }}>
      {intro && <p style={{ fontWeight: 600 }}>Tilføj dit barn, så kan I løse Ditlevs missioner i hallen sammen, samle stempler og vinde badges.</p>}
      <div className="field">
        <label htmlFor="kidname" style={{ color: 'var(--c-ink)' }}>Barnets fornavn</label>
        <input id="kidname" className="input" style={{ background: 'var(--c-chalk)', color: 'var(--c-ink)', borderColor: 'var(--c-ink)' }} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      </div>
      <div className="field">
        <label htmlFor="kidyear" style={{ color: 'var(--c-ink)' }}>Fødselsår (valgfrit)</label>
        <input id="kidyear" className="input" inputMode="numeric" style={{ background: 'var(--c-chalk)', color: 'var(--c-ink)', borderColor: 'var(--c-ink)' }} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
      </div>
      <button className="btn btn--ink btn--block" disabled={busy || !name.trim()}><Icon name="plus" size={18} />Tilføj barn</button>
      <p className="small">Vi gemmer kun fornavn og fødselsår, og kun på din profil.</p>
    </form>
  )
}
