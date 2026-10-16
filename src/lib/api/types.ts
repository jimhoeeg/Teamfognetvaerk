export type FanType = 'tilskuer' | 'medlem' | 'foraelder'
export type Side = 'A' | 'B'
export type Winner = 'fog' | 'opponent'
export type Margin = '1-5' | '6-10' | '11+'
export type MatchStatus = 'upcoming' | 'live' | 'finished'

export interface SeasonCard {
  type: 'fast' | 'fri'
  section?: string
  row?: string
  seat?: string
}

export interface Profile {
  id: string
  display_name: string | null
  fan_type: FanType
  role: 'fan' | 'admin'
  referral_code: string
  referred_by: string | null
  season_card: SeasonCard | null
  noise_side: Side | null
  onboarded: boolean
}

export type ProfilePatch = Partial<Pick<Profile, 'display_name' | 'fan_type' | 'season_card' | 'noise_side' | 'onboarded'>>

export interface Match {
  id: string
  opponent: string
  tip_off: string
  venue: string
  competition: string
  is_home: boolean
  ticket_url: string | null
  status: MatchStatus
  fog_score: number
  opponent_score: number
  period: string | null
  clock: string | null
  mvp_open: boolean
  mvp_player_id: string | null
  attendance_goal: number
  goal_reward: string | null
}

export interface Player {
  id: string
  name: string
  number: string | null
  position: string | null
  photo_url: string | null
  active: boolean
  sort: number
}

export interface Stats {
  earned: number
  balance: number
  streak: number
}

export type LedgerReason =
  | 'rsvp' | 'checkin' | 'early' | 'streak' | 'prediction_winner' | 'prediction_margin'
  | 'mvp_vote' | 'noise' | 'referral' | 'redeem' | 'admin'

export interface LedgerEntry {
  id: number
  amount: number
  reason: LedgerReason
  match_id: string | null
  created_at: string
}

export interface Prediction {
  winner: Winner
  margin: Margin
  points_awarded: number | null
}

export interface MyMatchState {
  rsvp: boolean
  checkedIn: boolean
  prediction: Prediction | null
  mvpVote: string | null
}

export interface Counters {
  rsvps: number
  checkins: number
  goal: number
}

export interface CheckInResult {
  match_id: string
  awards: { reason: LedgerReason; amount: number }[]
  total: number
  streak: number
}

export interface Reward {
  id: string
  partner: string
  title: string
  description: string | null
  cost: number
  stock: number | null
  active: boolean
  sort: number
}

export interface Redemption {
  id: string
  reward_id: string
  code: string
  created_at: string
  used_at: string | null
}

export interface NoiseRound {
  id: string
  match_id: string
  started_at: string
  ends_at: string
}

export interface NoiseResult {
  side: Side
  avg_level: number
  participants: number
}

export interface Kid {
  id: string
  first_name: string
  birth_year: number | null
}

export interface Mission {
  id: string
  match_id: string | null
  sort: number
  title: string
  hint: string | null
  kind: 'code' | 'quiz'
  question: string | null
  options: string[] | null
}

export interface MissionResult {
  done: number
  total: number
  card_complete: boolean
  new_badges: string[]
}

export interface MvpResult {
  player_id: string
  votes: number
}

export type MatchInput = Partial<Omit<Match, 'id'>> & { id?: string }

export interface AdminApi {
  saveMatch(m: MatchInput): Promise<Match>
  getCheckinCode(matchId: string): Promise<string>
  startNoise(matchId: string, seconds: number): Promise<string>
  finishMatch(matchId: string, mvpPlayerId: string | null): Promise<{ winner: Winner; margin: Margin; correct_predictions: number }>
  missionAnswers(): Promise<Record<string, string>>
  saveMissionAnswer(missionId: string, answer: string): Promise<void>
  savePlayer(p: Partial<Player> & { name: string }): Promise<Player>
  saveReward(r: Partial<Reward> & { partner: string; title: string; cost: number }): Promise<Reward>
}

export interface Api {
  mode: 'supabase' | 'demo'
  ensureSession(): Promise<void>
  getProfile(): Promise<Profile>
  updateProfile(patch: ProfilePatch): Promise<Profile>
  linkEmail(email: string): Promise<void>

  listMatches(): Promise<Match[]>
  subscribeMatches(cb: (m: Match) => void): () => void
  myMatchState(matchId: string): Promise<MyMatchState>
  counters(matchId: string): Promise<Counters>
  rsvp(matchId: string): Promise<number>
  checkIn(code: string): Promise<CheckInResult>
  predict(matchId: string, winner: Winner, margin: Margin): Promise<void>

  listPlayers(): Promise<Player[]>
  voteMvp(matchId: string, playerId: string): Promise<number>
  mvpResults(matchId: string): Promise<MvpResult[]>
  latestNoiseRound(matchId: string): Promise<NoiseRound | null>
  subscribeNoiseRounds(matchId: string, cb: (r: NoiseRound) => void): () => void
  submitNoise(roundId: string, side: Side, level: number): Promise<number>
  noiseResults(roundId: string): Promise<NoiseResult[]>

  myStats(): Promise<Stats>
  myLedger(limit: number): Promise<LedgerEntry[]>
  listRewards(): Promise<Reward[]>
  myRedemptions(): Promise<Redemption[]>
  redeem(rewardId: string): Promise<{ id: string; code: string; balance: number }>
  applyReferral(code: string): Promise<boolean>

  listKids(): Promise<Kid[]>
  addKid(firstName: string, birthYear: number | null): Promise<Kid>
  removeKid(id: string): Promise<void>
  matchMissions(matchId: string): Promise<Mission[]>
  kidStamps(kidId: string, matchId: string): Promise<string[]>
  kidBadges(kidId: string): Promise<string[]>
  completeMission(kidId: string, matchId: string, missionId: string, answer: string): Promise<MissionResult>

  admin: AdminApi
}

/** Fejl fra databasefunktionerne bærer en kode som 'invalid_code'. */
export class ApiError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code)
  }
}
