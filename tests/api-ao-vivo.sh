#!/usr/bin/env bash
# Auditoria do app contra o Supabase EM PRODUÇÃO, sem login (npm run test:online).
# Consulta bem formada → 200 (vazia por causa do RLS). Função existente → 401 (exige login).
# Pega o que os testes locais não pegam: embeds ambíguos (PGRST201), colunas erradas,
# lotes com chaves diferentes (PGRST102) e assinaturas de RPC divergentes (PGRST202).
URL=$(grep -o "https://[a-z0-9]*\.supabase\.co" js/config.js)
K=$(grep -o "sb_publishable_[A-Za-z0-9_-]*" js/config.js)
U="$URL/rest/v1"; Z=00000000-0000-0000-0000-000000000000; bad=0; n=0
ok() { n=$((n+1)); }
q() { r=$(curl -s -w ' %{http_code}' -H "apikey: $K" "$U/$2"); c=${r##* }; ok; [ "$c" = "200" ] || { echo "FAIL $1 → ${r:0:160}"; bad=$((bad+1)); }; }
w() { r=$(curl -s -w ' %{http_code}' -X POST -H "apikey: $K" -H 'Content-Type: application/json' -d "$2" "$U/$1"); c=${r##* }; ok; [ "$c" = "401" ] || [ "$c" = "403" ] || { echo "FAIL $1 → ${r:0:160}"; bad=$((bad+1)); }; }

q perfil "profiles?select=*&id=eq.$Z"
q missoes "quests?select=*&user_id=eq.$Z&order=sort"
q fichas "routines?select=*&user_id=eq.$Z&order=sort,created_at"
q atividades "activities?select=*&user_id=eq.$Z&day=gte.2026-01-01&order=created_at.desc&offset=0&limit=1000"
q provas "proofs?select=*&id=in.($Z)"
q cargas "exercise_logs?select=exercise_id,day,sets,created_at&user_id=eq.$Z&day=gte.2026-01-01"
q checkins "daily_checkins?select=day,data&user_id=eq.$Z&day=gte.2026-01-01&order=day.desc"
q exames "lab_results?select=*&user_id=eq.$Z&order=taken_on.desc"
q saude "health_profiles?select=*&user_id=eq.$Z"
q avaliacoes "body_assessments?select=*&user_id=eq.$Z&order=created_at.desc"
q auditoria "audit_log?select=*&user_id=eq.$Z&order=created_at.desc&limit=100"
q amizades "friendships?select=requester,addressee,status,created_at,req:profiles!friendships_requester_fkey(id,username,hero_class,avatar),adr:profiles!friendships_addressee_fkey(id,username,hero_class,avatar)"
q feed "activities?select=id,user_id,kind,title,attr,xp,day,created_at,meta,status,flags,proof_ids,profile:profiles!activities_user_id_fkey(id,username,hero_class,avatar),kudos(user_id)&kind=neq.assessment&order=created_at.desc&limit=40"
# lote de missões padrão (formato do app): precisa passar do parser e parar no RLS (401)
# (enviado via stdin: argumentos no Git Bash do Windows corrompem acentos)
r=$(node -e "import('./js/store/supabase.js').then(async m=>{const {DEFAULT_QUESTS}=await import('./js/game.js');process.stdout.write(JSON.stringify(DEFAULT_QUESTS.map((q,i)=>m.questRow({...q,sort:i}))))})"   | curl -s -w ' %{http_code}' -X POST -H "apikey: $K" -H 'Content-Type: application/json; charset=utf-8' --data-binary @- "$U/quests")
c=${r##* }; ok; [ "$c" = "401" ] || { echo "FAIL lote de missões → ${r:0:160}"; bad=$((bad+1)); }
for f in my_totals:'{}' friend_leaderboard:'{"p_since":"2026-09-21"}' send_friend_request:'{"p_code":"ABCDEFGH"}' \
  request_proof:'{"p_kind":"quest","p_ref":"x"}' submit_proof:"{\"p_id\":\"$Z\",\"p_path\":\"x\",\"p_meta\":{}}" \
  complete_quest:"{\"p_quest\":\"$Z\",\"p_proof\":null}" delete_activity:"{\"p_id\":\"$Z\"}" \
  start_session:'{"p_name":"x","p_attr":"STR","p_items":[]}' cancel_session:"{\"p_id\":\"$Z\"}" \
  finish_session:"{\"p_id\":\"$Z\",\"p_intensity\":\"leve\",\"p_sets\":1,\"p_sensor\":{},\"p_note\":null,\"p_logs\":[]}" \
  log_quick_workout:'{"p_title":"x","p_attr":"STR","p_minutes":10,"p_intensity":"leve","p_note":null,"p_proof":null}' \
  meal_checkin:"{\"p_slot\":\"cafe\",\"p_title\":\"x\",\"p_proof\":\"$Z\"}" save_health:'{"p_data":{}}' delete_health_data:'{}' \
  add_assessment:'{"p":{},"p_proof":null}' review_queue:'{}' review_activity:"{\"p_activity\":\"$Z\",\"p_verdict\":\"approve\",\"p_reason\":null}"; do
  w "rpc/${f%%:*}" "${f#*:}"
done
echo "$((n-bad)) OK · $bad FALHAS (API em produção)"
[ "$bad" = "0" ]
