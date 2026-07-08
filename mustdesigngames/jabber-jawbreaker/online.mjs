// Optional online adapter — loads supabase-js from a CDN so the no-bundler front-end
// can submit scores. The canonical, bundled version is ../backend/client/api.mjs.
// Requires: migrations applied + anonymous sign-ins (or swap for magic-link).  #LLM-generated
let sb = null;

export async function init(cfg) {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true } });
  if (sb.auth.signInAnonymously) await sb.auth.signInAnonymously(); // enable in Supabase Auth settings
  return sb;
}

export async function submit({ matchId, roundNo, minigame, score, detail }) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not signed in");
  return sb.from("scores").insert({
    match_id: matchId, round_no: roundNo, user_id: user.id, minigame, score, detail,
  });
}

export async function standings(matchId) {
  const { data } = await sb.from("scores")
    .select("round_no,user_id,minigame,score").eq("match_id", matchId);
  return data || [];
}
