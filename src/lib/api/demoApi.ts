/**
 * Demo-tilstand: hele appen kører i browseren med eksempeldata (localStorage).
 * Reglerne spejler databasefunktionerne i supabase/migrations, så flowet kan vises uden backend.
 * Demo-brugeren er også admin, så kampstyringen kan afprøves.
 */
import { CHECKIN_CLOSES_MIN, CHECKIN_OPENS_MIN, EARLY_MIN } from '../rules'
import {
  ApiError, type Api, type CheckInResult, type Kid, type LedgerEntry, type LedgerReason, type Margin, type Match,
  type Mission, type NoiseRound, type Player, type Prediction, type Profile, type Redemption, type Reward, type Side,
} from './types'

const KEY = 'tfn-demo-v1'
const ME = 'demo-user'
const OTHERS_RSVP = 1380 // simulerede andre fans, så fællesmålet giver mening i demoen

interface DemoState {
  profile: Profile
  players: Player[]
  matches: Match[]
  secrets: Record<string, string>
  rsvps: string[]
  checkins: { match_id: string; created_at: string }[]
  ledger: LedgerEntry[]
  predictions: Record<string, Prediction>
  votes: Record<string, string>
  rounds: NoiseRound[]
  noise: Record<string, { side: Side; level: number }>
  rewards: Reward[]
  redemptions: Redemption[]
  kids: Kid[]
  missions: Mission[]
  missionAnswers: Record<string, string>
  stamps: { kid_id: string; mission_id: string; match_id: string }[]
  badges: { kid_id: string; badge: string }[]
  raffle: { kid_id: string; match_id: string }[]
}

const uuid = () => crypto.randomUUID()
const code = (n = 8) => Math.random().toString(36).slice(2, 2 + n).toUpperCase()
const minutes = (n: number) => new Date(Date.now() + n * 60_000).toISOString()

function baseMatch(p: Partial<Match> & Pick<Match, 'opponent' | 'tip_off'>): Match {
  return {
    id: uuid(), venue: 'Arena Næstved', competition: 'Basketligaen', is_home: true, ticket_url: 'https://billetto.dk',
    status: 'upcoming', fog_score: 0, opponent_score: 0, period: null, clock: null, mvp_open: false, mvp_player_id: null,
    attendance_goal: 2000, goal_reward: 'Gratis popcorn til alle børn ved næste hjemmekamp', ...p,
  }
}

function seed(): DemoState {
  const past1 = baseMatch({ opponent: 'Demo-kamp 1', tip_off: minutes(-14 * 1440), status: 'finished', competition: 'Demo' })
  const past2 = baseMatch({ opponent: 'Demo-kamp 2', tip_off: minutes(-7 * 1440), status: 'finished', competition: 'Demo' })
  const tonight = baseMatch({ opponent: 'Bakken Bears', tip_off: minutes(45), competition: 'Demo · kamp i aften' })
  const bears = baseMatch({ opponent: 'Bears Academy', tip_off: '2026-10-28T17:45:00Z' })
  const players: Player[] = ['Jacobi Wright', 'Pipeloluwa Ajayi', 'Aboubacar Traore', 'Sean Trumper', 'Emil Sagittarius']
    .map((name, i) => ({ id: uuid(), name, number: null, position: null, photo_url: null, active: true, sort: i + 1 }))
  const missions: Mission[] = [
    ['Find Ditlev', 'Find Ditlev Dunk i hallen og få koden af ham.', 'DITLEV'],
    ['High-five', 'Giv en spiller high-five ved opvarmningen. En frivillig giver dig koden.', 'HIGHFIVE'],
    ['Råb højest', 'Koden vises på storskærmen under larm-runden.', 'LARM'],
    ['Skud i pausen', 'Tag et skud ved børnekurven i pausen.', 'SKUD'],
    ['Find QR-koden', 'En plakat med Ditlev gemmer sig et sted i hallen.', 'PLAKAT'],
  ].map(([title, hint], i) => ({ id: uuid(), match_id: null, sort: i + 1, title, hint, kind: 'code' as const, question: null, options: null }))
  missions.push({ id: uuid(), match_id: null, sort: 6, title: 'Quiz om holdet', hint: null, kind: 'quiz',
    question: 'Hvilket nummer har Ditlev Dunk på trøjen?', options: ['00', '23', '10'] })
  const answers = ['DITLEV', 'HIGHFIVE', 'LARM', 'SKUD', 'PLAKAT', '00']

  const ledger: LedgerEntry[] = []
  let id = 1
  for (const m of [past1, past2]) {
    ledger.push({ id: id++, amount: 10, reason: 'rsvp', match_id: m.id, created_at: minutes((new Date(m.tip_off).getTime() - Date.now()) / 60_000 - 600) })
    ledger.push({ id: id++, amount: 50, reason: 'checkin', match_id: m.id, created_at: minutes((new Date(m.tip_off).getTime() - Date.now()) / 60_000 - 10) })
  }

  return {
    profile: { id: ME, display_name: null, fan_type: 'tilskuer', role: 'admin', referral_code: 'DEMO42', referred_by: null,
      season_card: null, noise_side: null, onboarded: false },
    players,
    matches: [past1, past2, tonight, bears],
    secrets: { [past1.id]: code(), [past2.id]: code(), [tonight.id]: 'DEMO', [bears.id]: code() },
    rsvps: [past1.id, past2.id],
    checkins: [{ match_id: past1.id, created_at: past1.tip_off }, { match_id: past2.id, created_at: past2.tip_off }],
    ledger,
    predictions: {}, votes: {}, rounds: [], noise: {},
    rewards: [
      { id: uuid(), partner: '[PARTNER]', title: '[TILBUD fx gratis kaffe]', description: 'Vis koden ved kassen.', cost: 300, stock: null, active: true, sort: 1 },
      { id: uuid(), partner: 'Team FOG', title: 'Walk-out med holdet', description: 'Gå på banen med spillerne til en hjemmekamp.', cost: 2500, stock: 4, active: true, sort: 2 },
    ],
    redemptions: [], kids: [], missions,
    missionAnswers: Object.fromEntries(missions.map((m, i) => [m.id, answers[i]])),
    stamps: [], badges: [], raffle: [],
  }
}

export function createDemoApi(): Api {
  let s: DemoState = load()
  const matchListeners = new Set<(m: Match) => void>()
  const roundListeners = new Map<string, Set<(r: NoiseRound) => void>>()

  function load(): DemoState {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) return JSON.parse(raw) as DemoState
    } catch { /* ignorér – start forfra */ }
    return seed()
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* privat tilstand */ }
  }
  // Admin i en anden fane opdaterer kampen → giv besked til denne fane.
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return
    const prevRounds = new Set(s.rounds.map((r) => r.id))
    s = load()
    s.matches.forEach((m) => matchListeners.forEach((cb) => cb(m)))
    s.rounds.filter((r) => !prevRounds.has(r.id)).forEach((r) => roundListeners.get(r.match_id)?.forEach((cb) => cb(r)))
  })

  const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120))
  const err = (c: string) => Promise.reject(new ApiError(c))
  const match = (id: string) => {
    const m = s.matches.find((x) => x.id === id)
    if (!m) throw new ApiError('not_found')
    return m
  }
  const addPoints = (amount: number, reason: LedgerReason, match_id: string | null) => {
    s.ledger.unshift({ id: (s.ledger[0]?.id ?? 0) + 1, amount, reason, match_id, created_at: new Date().toISOString() })
  }
  const inWindow = (m: Match) => {
    const t = new Date(m.tip_off).getTime()
    return Date.now() >= t - CHECKIN_OPENS_MIN * 60_000 && Date.now() <= t + CHECKIN_CLOSES_MIN * 60_000
  }
  const streakAt = (m: Match) => {
    let n = 0
    for (const x of s.matches.filter((x) => x.is_home && x.tip_off <= m.tip_off).sort((a, b) => b.tip_off.localeCompare(a.tip_off))) {
      if (!s.checkins.some((c) => c.match_id === x.id)) break
      n++
    }
    return n
  }
  const missionsFor = (matchId: string) => {
    const own = s.missions.filter((m) => m.match_id === matchId)
    return (own.length ? own : s.missions.filter((m) => m.match_id === null)).sort((a, b) => a.sort - b.sort)
  }
  const emitMatch = (m: Match) => matchListeners.forEach((cb) => cb(m))

  return {
    mode: 'demo',
    ensureSession: () => delay(undefined),
    getProfile: () => delay({ ...s.profile }),
    async updateProfile(patch) {
      s.profile = { ...s.profile, ...patch }
      save()
      return delay({ ...s.profile })
    },
    linkEmail: () => delay(undefined),

    listMatches: () => delay(s.matches.map((m) => ({ ...m }))),
    subscribeMatches(cb) {
      matchListeners.add(cb)
      return () => { matchListeners.delete(cb) }
    },
    myMatchState: (id) => delay({
      rsvp: s.rsvps.includes(id),
      checkedIn: s.checkins.some((c) => c.match_id === id),
      prediction: s.predictions[id] ?? null,
      mvpVote: s.votes[id] ?? null,
    }),
    counters: (id) => delay({
      rsvps: OTHERS_RSVP + (s.rsvps.includes(id) ? 1 : 0),
      checkins: (match(id).status === 'upcoming' && !inWindow(match(id)) ? 0 : 940) + (s.checkins.some((c) => c.match_id === id) ? 1 : 0),
      goal: match(id).attendance_goal,
    }),
    async rsvp(id) {
      const m = match(id)
      if (m.status !== 'upcoming' || new Date(m.tip_off).getTime() <= Date.now()) return err('rsvp_closed')
      if (s.rsvps.includes(id)) return delay(0)
      s.rsvps.push(id)
      addPoints(10, 'rsvp', id)
      save()
      return delay(10)
    },
    async checkIn(input) {
      const id = Object.keys(s.secrets).find((k) => s.secrets[k] === input.trim().toUpperCase())
      if (!id) return err('invalid_code')
      const m = match(id)
      if (!inWindow(m)) return err('checkin_closed')
      if (s.checkins.some((c) => c.match_id === id)) return err('already_checked_in')
      s.checkins.push({ match_id: id, created_at: new Date().toISOString() })
      const awards: CheckInResult['awards'] = [{ reason: 'checkin', amount: 50 }]
      if (Date.now() <= new Date(m.tip_off).getTime() - EARLY_MIN * 60_000) awards.push({ reason: 'early', amount: 25 })
      const streak = m.is_home ? streakAt(m) : 0
      if (streak === 3) awards.push({ reason: 'streak', amount: 50 })
      else if (streak >= 5 && streak % 5 === 0) awards.push({ reason: 'streak', amount: 100 })
      awards.forEach((a) => addPoints(a.amount, a.reason, id))
      save()
      return delay({ match_id: id, awards, total: awards.reduce((n, a) => n + a.amount, 0), streak })
    },
    async predict(id, winner, margin: Margin) {
      const m = match(id)
      if (m.status !== 'upcoming' || new Date(m.tip_off).getTime() <= Date.now()) return err('predictions_closed')
      s.predictions[id] = { winner, margin, points_awarded: null }
      save()
      return delay(undefined)
    },

    listPlayers: () => delay(s.players.filter((p) => p.active).sort((a, b) => a.sort - b.sort)),
    async voteMvp(id, playerId) {
      if (!match(id).mvp_open) return err('voting_closed')
      if (s.votes[id]) return err('already_voted')
      s.votes[id] = playerId
      addPoints(25, 'mvp_vote', id)
      save()
      return delay(25)
    },
    mvpResults: (id) => {
      // Simulerede stemmer fra resten af hallen + din egen.
      const base = [212, 148, 96, 61, 23]
      return delay(s.players.map((p, i) => ({ player_id: p.id, votes: (base[i] ?? 10) + (s.votes[id] === p.id ? 1 : 0) }))
        .sort((a, b) => b.votes - a.votes))
    },
    latestNoiseRound: (id) => delay(s.rounds.filter((r) => r.match_id === id).sort((a, b) => b.started_at.localeCompare(a.started_at))[0] ?? null),
    subscribeNoiseRounds(id, cb) {
      if (!roundListeners.has(id)) roundListeners.set(id, new Set())
      roundListeners.get(id)!.add(cb)
      return () => { roundListeners.get(id)?.delete(cb) }
    },
    async submitNoise(roundId, side, level) {
      const r = s.rounds.find((x) => x.id === roundId)
      if (!r || Date.now() > new Date(r.ends_at).getTime() + 10_000) return err('round_closed')
      if (s.noise[roundId]) return err('already_submitted')
      s.noise[roundId] = { side, level: Math.max(0, Math.min(100, Math.round(level))) }
      s.profile.noise_side = side
      addPoints(10, 'noise', r.match_id)
      save()
      return delay(10)
    },
    noiseResults(roundId) {
      const mine = s.noise[roundId]
      const other: Side = mine?.side === 'A' ? 'B' : 'A'
      const res = [
        { side: mine?.side ?? 'A', avg_level: mine ? Math.round((71 * 400 + mine.level) / 401 * 10) / 10 : 71, participants: 401 },
        { side: other, avg_level: 66.4, participants: 377 },
      ]
      return delay(res.sort((a, b) => a.side.localeCompare(b.side)))
    },

    myStats() {
      const earned = s.ledger.filter((l) => l.amount > 0).reduce((n, l) => n + l.amount, 0)
      const balance = s.ledger.reduce((n, l) => n + l.amount, 0)
      const home = s.matches.filter((m) => m.is_home && new Date(m.tip_off).getTime() <= Date.now() + CHECKIN_OPENS_MIN * 60_000)
        .sort((a, b) => b.tip_off.localeCompare(a.tip_off))
      let streak = home[0] ? streakAt(home[0]) : 0
      if (streak === 0 && home[1]) streak = streakAt(home[1])
      return delay({ earned, balance, streak })
    },
    myLedger: (limit) => delay(s.ledger.slice(0, limit)),
    listRewards: () => delay(s.rewards.filter((r) => r.active).sort((a, b) => a.sort - b.sort)),
    myRedemptions: () => delay([...s.redemptions]),
    async redeem(rewardId) {
      const r = s.rewards.find((x) => x.id === rewardId && x.active)
      if (!r) return err('reward_unavailable')
      if (r.stock !== null && r.stock <= 0) return err('sold_out')
      const balance = s.ledger.reduce((n, l) => n + l.amount, 0)
      if (balance < r.cost) return err('insufficient_points')
      const red: Redemption = { id: uuid(), reward_id: r.id, code: code(), created_at: new Date().toISOString(), used_at: null }
      s.redemptions.unshift(red)
      if (r.stock !== null) r.stock--
      addPoints(-r.cost, 'redeem', null)
      save()
      return delay({ id: red.id, code: red.code, balance: balance - r.cost })
    },
    async applyReferral(input) {
      if (input.trim().toUpperCase() === s.profile.referral_code) return err('invalid_code')
      if (s.checkins.length > 0) return err('too_late')
      return delay(true)
    },

    listKids: () => delay([...s.kids]),
    async addKid(first_name, birth_year) {
      const kid = { id: uuid(), first_name, birth_year }
      s.kids.push(kid)
      save()
      return delay(kid)
    },
    async removeKid(id) {
      s.kids = s.kids.filter((k) => k.id !== id)
      save()
      return delay(undefined)
    },
    matchMissions: (id) => delay(missionsFor(id)),
    kidStamps: (kid, id) => delay(s.stamps.filter((x) => x.kid_id === kid && x.match_id === id).map((x) => x.mission_id)),
    kidBadges: (kid) => delay(s.badges.filter((b) => b.kid_id === kid).map((b) => b.badge)),
    async completeMission(kid, id, missionId, answer) {
      if (!s.kids.some((k) => k.id === kid)) return err('not_your_kid')
      if (!inWindow(match(id))) return err('missions_closed')
      const list = missionsFor(id)
      if (!list.some((m) => m.id === missionId)) return err('invalid_mission')
      if ((s.missionAnswers[missionId] ?? '').trim().toLowerCase() !== answer.trim().toLowerCase()) return err('wrong_answer')
      if (!s.stamps.some((x) => x.kid_id === kid && x.mission_id === missionId && x.match_id === id)) {
        s.stamps.push({ kid_id: kid, mission_id: missionId, match_id: id })
      }
      const newBadges: string[] = []
      const give = (b: string) => {
        if (s.badges.some((x) => x.kid_id === kid && x.badge === b)) return
        s.badges.push({ kid_id: kid, badge: b })
        newBadges.push(b)
      }
      give('foerste-stempel')
      const done = s.stamps.filter((x) => x.kid_id === kid && x.match_id === id).length
      if (done >= list.length && !s.raffle.some((x) => x.kid_id === kid && x.match_id === id)) {
        s.raffle.push({ kid_id: kid, match_id: id })
        give('fuldt-kort')
        if (s.raffle.filter((x) => x.kid_id === kid).length >= 3) give('tre-fulde-kort')
      }
      save()
      return delay({ done, total: list.length, card_complete: done >= list.length, new_badges: newBadges })
    },

    admin: {
      async saveMatch(input) {
        let m: Match
        if (input.id) {
          m = Object.assign(match(input.id), input)
        } else {
          m = baseMatch({ opponent: input.opponent ?? 'Ny kamp', tip_off: input.tip_off ?? minutes(1440), ...input, id: uuid() })
          s.matches.push(m)
          s.secrets[m.id] = code()
        }
        save()
        emitMatch({ ...m })
        return delay({ ...m })
      },
      getCheckinCode: (id) => delay(s.secrets[id] ?? ''),
      async startNoise(id, seconds) {
        const r: NoiseRound = { id: uuid(), match_id: id, started_at: new Date().toISOString(), ends_at: new Date(Date.now() + seconds * 1000).toISOString() }
        s.rounds.push(r)
        save()
        roundListeners.get(id)?.forEach((cb) => cb(r))
        return delay(r.id)
      },
      async finishMatch(id, mvp) {
        const m = match(id)
        if (m.status === 'finished') return err('already_finished')
        const diff = Math.abs(m.fog_score - m.opponent_score)
        const winner = m.fog_score >= m.opponent_score ? 'fog' as const : 'opponent' as const
        const margin: Margin = diff <= 5 ? '1-5' : diff <= 10 ? '6-10' : '11+'
        Object.assign(m, { status: 'finished', mvp_open: false, mvp_player_id: mvp ?? s.votes[id] ?? s.players[0]?.id ?? null })
        const p = s.predictions[id]
        let correct = 0
        if (p) {
          p.points_awarded = 0
          if (p.winner === winner) {
            addPoints(50, 'prediction_winner', id)
            p.points_awarded = 50
            correct = 1
            if (p.margin === margin) { addPoints(100, 'prediction_margin', id); p.points_awarded = 150 }
          }
        }
        save()
        emitMatch({ ...m })
        return delay({ winner, margin, correct_predictions: correct })
      },
      missionAnswers: () => delay({ ...s.missionAnswers }),
      async saveMissionAnswer(id, answer) {
        s.missionAnswers[id] = answer
        save()
        return delay(undefined)
      },
      async savePlayer(p) {
        const existing = p.id ? s.players.find((x) => x.id === p.id) : undefined
        const player = existing ? Object.assign(existing, p) : { id: uuid(), number: null, position: null, photo_url: null, active: true, sort: s.players.length + 1, ...p }
        if (!existing) s.players.push(player as Player)
        save()
        return delay({ ...(player as Player) })
      },
      async saveReward(r) {
        const existing = r.id ? s.rewards.find((x) => x.id === r.id) : undefined
        const reward = existing ? Object.assign(existing, r) : { id: uuid(), description: null, stock: null, active: true, sort: s.rewards.length + 1, ...r }
        if (!existing) s.rewards.push(reward as Reward)
        save()
        return delay({ ...(reward as Reward) })
      },
    },
  }
}

export function resetDemo() {
  try { localStorage.removeItem(KEY) } catch { /* ignorér */ }
}
