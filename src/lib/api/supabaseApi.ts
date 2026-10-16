import { createClient, type PostgrestError } from '@supabase/supabase-js'
import { ApiError, type Api, type CheckInResult, type Kid, type Match, type MissionResult, type MvpResult, type NoiseResult, type Player, type Profile, type Reward, type Stats } from './types'

function fail(error: PostgrestError | { message: string } | null): never {
  throw new ApiError(error?.message ?? 'unknown')
}

/** Pakker et Supabase-svar ud og kaster ApiError med databasens fejlkode. */
async function run<T>(q: PromiseLike<{ data: T | null; error: PostgrestError | null }>): Promise<T> {
  const { data, error } = await q
  if (error) fail(error)
  return data as T
}

export function createSupabaseApi(url: string, key: string): Api {
  const sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })

  const uid = async () => {
    const { data } = await sb.auth.getSession()
    const id = data.session?.user.id
    if (!id) throw new ApiError('not_authenticated')
    return id
  }

  return {
    mode: 'supabase',

    async ensureSession() {
      const { data } = await sb.auth.getSession()
      if (data.session) return
      const { error } = await sb.auth.signInAnonymously()
      if (error) fail(error)
    },

    async getProfile() {
      return run<Profile>(sb.from('profiles').select('*').eq('id', await uid()).single())
    },

    async updateProfile(patch) {
      return run<Profile>(sb.from('profiles').update(patch).eq('id', await uid()).select('*').single())
    },

    async linkEmail(email) {
      const { error } = await sb.auth.updateUser({ email }, { emailRedirectTo: window.location.origin })
      if (error) fail(error)
    },

    listMatches: () => run<Match[]>(sb.from('matches').select('*').order('tip_off')),

    subscribeMatches(cb) {
      const ch = sb
        .channel('matches')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, (p) => cb(p.new as Match))
        .subscribe()
      return () => { void sb.removeChannel(ch) }
    },

    async myMatchState(matchId) {
      const me = await uid()
      const [r, c, p, v] = await Promise.all([
        sb.from('rsvps').select('match_id').eq('match_id', matchId).eq('user_id', me).maybeSingle(),
        sb.from('checkins').select('match_id').eq('match_id', matchId).eq('user_id', me).maybeSingle(),
        sb.from('predictions').select('winner, margin, points_awarded').eq('match_id', matchId).eq('user_id', me).maybeSingle(),
        sb.from('mvp_votes').select('player_id').eq('match_id', matchId).eq('user_id', me).maybeSingle(),
      ])
      const err = r.error ?? c.error ?? p.error ?? v.error
      if (err) fail(err)
      return { rsvp: !!r.data, checkedIn: !!c.data, prediction: p.data, mvpVote: v.data?.player_id ?? null }
    },

    counters: (matchId) => run(sb.rpc('match_counters', { p_match: matchId })),
    rsvp: (matchId) => run<number>(sb.rpc('rsvp', { p_match: matchId })),
    checkIn: (code) => run<CheckInResult>(sb.rpc('check_in', { p_code: code })),
    predict: async (matchId, winner, margin) => {
      await run(sb.rpc('predict', { p_match: matchId, p_winner: winner, p_margin: margin }))
    },

    listPlayers: () => run<Player[]>(sb.from('players').select('*').eq('active', true).order('sort')),
    voteMvp: (matchId, playerId) => run<number>(sb.rpc('vote_mvp', { p_match: matchId, p_player: playerId })),
    mvpResults: (matchId) => run<MvpResult[]>(sb.rpc('mvp_results', { p_match: matchId })),

    latestNoiseRound: (matchId) =>
      run(sb.from('noise_rounds').select('*').eq('match_id', matchId).order('started_at', { ascending: false }).limit(1).maybeSingle()),

    subscribeNoiseRounds(matchId, cb) {
      const ch = sb
        .channel(`noise-${matchId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'noise_rounds', filter: `match_id=eq.${matchId}` },
          (p) => cb(p.new as never))
        .subscribe()
      return () => { void sb.removeChannel(ch) }
    },

    submitNoise: (roundId, side, level) => run<number>(sb.rpc('submit_noise', { p_round: roundId, p_side: side, p_level: Math.round(level) })),
    noiseResults: (roundId) => run<NoiseResult[]>(sb.rpc('noise_results', { p_round: roundId })),

    myStats: () => run<Stats>(sb.rpc('my_stats')),
    myLedger: async (limit) =>
      run(sb.from('points_ledger').select('*').eq('user_id', await uid()).order('created_at', { ascending: false }).limit(limit)),
    listRewards: () => run<Reward[]>(sb.from('rewards').select('*').eq('active', true).order('sort')),
    myRedemptions: async () =>
      run(sb.from('redemptions').select('*').eq('user_id', await uid()).order('created_at', { ascending: false })),
    redeem: (rewardId) => run(sb.rpc('redeem_reward', { p_reward: rewardId })),
    applyReferral: (code) => run<boolean>(sb.rpc('apply_referral', { p_code: code })),

    listKids: () => run<Kid[]>(sb.from('kids').select('id, first_name, birth_year').order('created_at')),
    addKid: async (first_name, birth_year) =>
      run<Kid>(sb.from('kids').insert({ parent_id: await uid(), first_name, birth_year }).select('id, first_name, birth_year').single()),
    removeKid: async (id) => { await run(sb.from('kids').delete().eq('id', id)) },
    matchMissions: (matchId) => run(sb.rpc('match_missions', { p_match: matchId })),
    kidStamps: async (kidId, matchId) => {
      const rows = await run<{ mission_id: string }[]>(sb.from('kid_stamps').select('mission_id').eq('kid_id', kidId).eq('match_id', matchId))
      return rows.map((r) => r.mission_id)
    },
    kidBadges: async (kidId) => {
      const rows = await run<{ badge: string }[]>(sb.from('kid_badges').select('badge').eq('kid_id', kidId).order('created_at'))
      return rows.map((r) => r.badge)
    },
    completeMission: (kidId, matchId, missionId, answer) =>
      run<MissionResult>(sb.rpc('complete_mission', { p_kid: kidId, p_match: matchId, p_mission: missionId, p_answer: answer })),

    admin: {
      async saveMatch(m) {
        const { id, ...rest } = m
        const q = id ? sb.from('matches').update(rest).eq('id', id) : sb.from('matches').insert(rest)
        return run<Match>(q.select('*').single())
      },
      async getCheckinCode(matchId) {
        const row = await run<{ checkin_code: string }>(sb.from('match_secrets').select('checkin_code').eq('match_id', matchId).single())
        return row.checkin_code
      },
      startNoise: (matchId, seconds) => run<string>(sb.rpc('admin_start_noise', { p_match: matchId, p_seconds: seconds })),
      finishMatch: (matchId, mvp) => run(sb.rpc('admin_finish_match', { p_match: matchId, p_mvp: mvp })),
      async missionAnswers() {
        const rows = await run<{ mission_id: string; answer: string }[]>(sb.from('mission_secrets').select('*'))
        return Object.fromEntries(rows.map((r) => [r.mission_id, r.answer]))
      },
      async saveMissionAnswer(missionId, answer) {
        await run(sb.from('mission_secrets').upsert({ mission_id: missionId, answer }))
      },
      async savePlayer(p) {
        const { id, ...rest } = p
        const q = id ? sb.from('players').update(rest).eq('id', id) : sb.from('players').insert(rest)
        return run<Player>(q.select('*').single())
      },
      async saveReward(r) {
        const { id, ...rest } = r
        const q = id ? sb.from('rewards').update(rest).eq('id', id) : sb.from('rewards').insert(rest)
        return run<Reward>(q.select('*').single())
      },
    },
  }
}
