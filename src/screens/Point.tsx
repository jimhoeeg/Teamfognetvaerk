import { useState } from 'react'
import { api, type Reward } from '../lib/api'
import { useApp } from '../lib/store'
import { LEVELS, REASON_LABEL, STREAK_TARGET, levelFor } from '../lib/rules'
import { fmtNum, fmtShortDate } from '../lib/format'
import { Icon } from '../components/Icon'
import { Bar, Segments, Sheet, TabBar, TopBar, shareInvite, useAction, useLoad } from '../components/ui'

export default function Point() {
  const { stats, profile, toast, pointsVersion } = useApp()
  const level = levelFor(stats.earned)
  const { data: rewards } = useLoad(() => api.listRewards(), [pointsVersion])
  const { data: ledger } = useLoad(() => api.myLedger(12), [pointsVersion])
  const { data: redemptions } = useLoad(() => api.myRedemptions(), [pointsVersion])
  const [picked, setPicked] = useState<Reward | null>(null)
  const streakShown = stats.streak % STREAK_TARGET === 0 && stats.streak > 0 ? STREAK_TARGET : stats.streak % STREAK_TARGET

  return (
    <>
      <main className="screen">
        <TopBar />
        <section className="row row--between" style={{ alignItems: 'flex-start' }} aria-label="Dine point">
          <div className="stack" style={{ gap: 2 }}>
            <span className="eyebrow">Dine Dunk-point</span>
            <span className="big-number" aria-live="polite">{fmtNum(stats.balance)}</span>
          </div>
          <div className="shield" aria-label={`Niveau ${level.number}, ${level.current.name}`} style={{ clipPath: 'polygon(22% 0, 78% 0, 100% 14%, 100% 100%, 0 100%, 0 14%)', border: '1px solid var(--c-line-strong)' }}>
            <span className="eyebrow" style={{ fontSize: 10, color: 'var(--c-muted)' }}>Niveau</span>
            <span className="display" style={{ fontSize: 44 }}>{level.number}</span>
          </div>
        </section>

        <section className="stack" style={{ gap: 8 }} aria-label="Niveau">
          <div className="row row--between small" style={{ fontWeight: 600 }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>{level.current.name}</span>
            <span className="muted">{level.next ? `${fmtNum(level.toNext)} til ${level.next.name}` : 'Højeste niveau'}</span>
          </div>
          <Bar value={level.progress} label="Fremgang mod næste niveau" />
          <div className="row row--between dim" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {LEVELS.map((l) => <span key={l.name}>{l.name}</span>)}
          </div>
        </section>

        <div className="grid-2">
          <div className="card stack" style={{ gap: 6, padding: 12 }}>
            <span className="eyebrow" style={{ fontSize: 11 }}>Streak</span>
            <span className="row row--baseline" style={{ gap: 6 }}><span className="display" style={{ fontSize: 36 }}>{stats.streak}</span><span className="small muted">hjemmekampe i træk</span></span>
            <Segments total={STREAK_TARGET} filled={streakShown} />
          </div>
          <button className="card stack" style={{ gap: 6, padding: 12, textAlign: 'left' }} onClick={() => shareInvite(profile.referral_code, toast)}>
            <span className="eyebrow" style={{ fontSize: 11 }}>Inviter en ven</span>
            <span className="display" style={{ fontSize: 30, letterSpacing: '0.06em' }}>{profile.referral_code}</span>
            <span className="small volt" style={{ fontWeight: 700 }}>+100 til jer begge</span>
          </button>
        </div>

        <section className="stack" aria-labelledby="rew-h">
          <h2 id="rew-h" className="h-section">Indløs hos partnere</h2>
          {!rewards ? null : rewards.length === 0 ? <div className="empty">Ingen belønninger lige nu.</div> : (
            <div className="stack" style={{ gap: 8 }}>
              {rewards.map((r) => {
                const affordable = stats.balance >= r.cost && (r.stock === null || r.stock > 0)
                return (
                  <div key={r.id} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', padding: '10px 12px' }}>
                    <div className="small" style={{ lineHeight: 1.35 }}>
                      <b style={{ fontSize: 14 }}>{r.partner}</b><br />
                      <span className="muted">{r.title}</span>
                      {r.stock !== null && <><br /><span className="dim">{r.stock > 0 ? `${r.stock} tilbage` : 'Udsolgt'}</span></>}
                    </div>
                    <button className={affordable ? 'btn btn--primary' : 'btn btn--secondary'} style={{ minHeight: 44, fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 900, borderWidth: 1, borderColor: 'var(--c-line-strong)', color: affordable ? undefined : 'var(--c-dim)' }}
                      onClick={() => setPicked(r)} aria-label={`${r.title} hos ${r.partner}, ${r.cost} point`}>
                      {fmtNum(r.cost)}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {redemptions && redemptions.length > 0 && (
          <section className="stack" aria-labelledby="red-h">
            <h2 id="red-h" className="h-section">Mine koder</h2>
            <div>
              {redemptions.map((r) => {
                const reward = rewards?.find((x) => x.id === r.reward_id)
                return (
                  <div key={r.id} className="list-row">
                    <span className="small"><b>{reward?.title ?? 'Belønning'}</b><br /><span className="muted">{reward?.partner} · {fmtShortDate(r.created_at)}</span></span>
                    <span className="display volt" style={{ fontSize: 24, letterSpacing: '0.06em' }}>{r.used_at ? 'Brugt' : r.code}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section className="stack" aria-labelledby="hist-h">
          <h2 id="hist-h" className="h-section">Seneste point</h2>
          {ledger && ledger.length === 0 && <div className="empty">Tjek ind til en kamp for at få dine første point.</div>}
          <div>
            {ledger?.map((l) => (
              <div key={l.id} className="list-row">
                <span className="small">{REASON_LABEL[l.reason]}<br /><span className="dim">{fmtShortDate(l.created_at)}</span></span>
                <b className={l.amount > 0 ? 'volt' : 'muted'}>{l.amount > 0 ? '+' : ''}{fmtNum(l.amount)}</b>
              </div>
            ))}
          </div>
        </section>
      </main>
      {picked && <RedeemSheet reward={picked} onClose={() => setPicked(null)} />}
      <TabBar />
    </>
  )
}

function RedeemSheet({ reward, onClose }: { reward: Reward; onClose: () => void }) {
  const { stats, refreshStats } = useApp()
  const { busy, run } = useAction()
  const [code, setCode] = useState<string | null>(null)
  const missing = reward.cost - stats.balance

  async function redeem() {
    const r = await run(() => api.redeem(reward.id))
    if (r) { setCode(r.code); void refreshStats() }
  }

  return (
    <Sheet title={code ? 'Din kode' : 'Indløs'} onClose={onClose}>
      <div className="stack" style={{ gap: 4 }}>
        <span className="eyebrow">{reward.partner}</span>
        <b style={{ fontSize: 18 }}>{reward.title}</b>
        {reward.description && <p className="small muted">{reward.description}</p>}
      </div>
      {code ? (
        <>
          <div className="card--chalk center" style={{ padding: 20, clipPath: 'var(--clip-card)' }}>
            <div className="display" style={{ fontSize: 52, letterSpacing: '0.1em' }}>{code}</div>
          </div>
          <p className="small muted">Vis koden hos {reward.partner}. Du kan altid finde den igen under "Mine koder".</p>
          <button className="btn btn--primary btn--block" onClick={onClose}>Færdig</button>
        </>
      ) : missing > 0 ? (
        <>
          <p className="muted">Du mangler <b className="volt">{fmtNum(missing)} point</b>. Tjek ind, tip kampene og stem på MVP for at samle flere.</p>
          <button className="btn btn--secondary btn--block" onClick={onClose}>OK</button>
        </>
      ) : (
        <>
          <div className="row row--between"><span className="muted">Pris</span><b className="display" style={{ fontSize: 28 }}>{fmtNum(reward.cost)} point</b></div>
          <div className="row row--between"><span className="muted">Saldo efter</span><b>{fmtNum(stats.balance - reward.cost)}</b></div>
          <p className="small muted">Dit niveau falder ikke, når du bruger point.</p>
          <button className="btn btn--primary btn--block" disabled={busy} onClick={redeem}><Icon name="gift" size={20} />Indløs nu</button>
        </>
      )}
    </Sheet>
  )
}
