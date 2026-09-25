# ASCEND — Sistema de Evolução

Gamificação de treino, nutrição e alta performance com visual de HUD futurista. Você é um **Caçador**:
faz a avaliação física, recebe metas e cardápio, cumpre missões diárias com **prova ao vivo**, treina
com carga sugerida, ganha XP, sobe de rank (E → S) e disputa o ranking com aliados que **auditam** uns aos outros.

**🌐 App publicado:** https://wendely111-debug.github.io/ascend/ (modo solo até o Supabase ser configurado)

- **PWA**: instala na tela inicial do iPhone/Android, funciona offline.
- **100% gratuito**: hospedagem estática (Netlify / GitHub Pages) + Supabase (plano free).
- **Sem build**: HTML + CSS + JavaScript (ES modules). É só publicar a pasta.

> ⚕️ O app usa fórmulas e diretrizes validadas, mas **não substitui médico, nutrólogo ou nutricionista**.
> Gestantes, menores, doença renal e histórico de transtorno alimentar recebem travas automáticas (sem déficit).

## Funcionalidades

### Cadastro e avaliação física (obrigatória)
| | |
|---|---|
| Consentimento | LGPD art. 11 (dados de saúde = sensíveis), revogação com exclusão total (art. 18) |
| Medidas | Protocolo de medição guiado; **2 medidas por ponto** (recusa se diferirem > 1 cm); prova fotográfica da balança |
| Composição | IMC (OMS), % gordura por perimetria US Navy **ou** laudo de bioimpedância/DEXA, massa magra, cintura/altura, risco de cintura |
| Gasto | TMB Katch-McArdle (com % gordura) ou Mifflin-St Jeor; fator de atividade por rotina + dias de treino |
| Segurança | PAR-Q+, condições (gestação, diabetes, renal, cardíaca, tireoide, transtorno alimentar) → travas e alertas |

### Nutrição (aba Dieta)
| | |
|---|---|
| Metas | kcal, proteína 1,6–2,2 g/kg (peso de referência), gordura ≥ 0,6 g/kg, carboidrato, água 35 ml/kg, fibras |
| Cardápio diário | 33 receitas brasileiras (TACO/Unicamp), escolhidas por **aderência de macros** + variedade; porções em gramas e medidas caseiras; trocar refeição; complemento proteico automático |
| Restrições | Vegetariano, vegano, sem lactose, sem glúten, alergias (ovo, leite, amendoim, castanhas, peixe, soja) |
| Feira 7/15/30 dias | Peso **cru de compra** (rendimento de arroz/feijão/carnes, cascas), embalagens, custo por categoria, preço **editável por cidade** e botão de busca no iFood |
| Reavaliação | A cada 14 dias; histórico imutável com gráfico de peso |

### Saúde (aba Saúde)
| | |
|---|---|
| Check-in diário | Sono (horas/qualidade), energia, estresse, dor, passos → **prontidão 0–100** |
| Ajuste diário | Metas do dia = repouso + 75% do gasto real (METs dos treinos + passos); sono < 6 h reduz o déficit à metade e sobe a proteína |
| Rotina | Com horário de trabalho: acordar, refeições, **água em doses**, café (corte 8 h antes de dormir), **pausas ativas a cada ~55 min**, pré/pós-treino, desligar telas → alarmes no app + calendário do celular |
| Exames | ~25 marcadores (vit. D, B12, ferritina, glicemia, HbA1c, lípides, TSH, creatinina, CK, PCR…), faixas por sexo, referência do laudo, **valores críticos**, e ajuste do plano (carboidrato ≤ 40% com glicose alterada, proteína ≤ 1,2 g/kg com rins alterados) |
| Caneta (GLP-1/GIP) | Mounjaro, Tirzec, TG ou outra: déficit máx. 20%, proteína ≥ 1,6 g/kg, gordura ~25%, mín. 5 refeições menores, dicas de náusea nos 2 dias após a aplicação, tolerância maior de perda de peso na auditoria. Alertas: produto proibido pela Anvisa (Tirzec, T.G.), uso sem receita, anticoncepcional, hipoglicemia, pancreatite/vesícula |
| Médicos e exames | Especialistas indicados por perfil (clínico, endocrino, cardio, nutri, gineco/uro…) e painel de exames com status "em dia / refazer / nunca feito"; lista copiável para levar à consulta |
| Condicionamento | Zonas de FC (Tanaka/Karvonen), teste de Cooper (VO₂máx), plano semanal, mesociclo, sono, hidratação, overtraining |
| Suplementos | Nível de evidência (creatina, cafeína, whey…), **tipos de whey** e calculadora de custo por 100 g de proteína real |

### Treino (aba Treinos)
| | |
|---|---|
| Biblioteca | 873 exercícios com **foto real da posição inicial e final** mostrando a máquina; 62 traduzidos |
| Fichas | 6 prontas + próprias |
| Progressão de carga | Carga sugerida (estimativa inicial por peso corporal, depois dupla progressão com 1RM Epley), reduzida em dias de prontidão baixa |
| Periodização | Mesociclo de 5 semanas: base → +1 série → **deload** automático |
| Timer | Intervalos com ciclos (preparo/trabalho/descanso/rodadas/blocos), **cadência por repetição**, voz em PT, cronômetro com voltas, temporizador, timer por exercício |
| Alarmes | No app, no **relógio nativo** (Android: abre o Relógio preenchido; iPhone: Atalho "ASCEND Alarme") e exportação .ics |

## Auditoria antifraude
Não existe app 100% à prova de mentira (o app roda no aparelho da pessoa). O ASCEND torna a fraude **difícil,
cara e detectável** — e no modo online a autoridade é do **servidor**:

1. **XP calculado no servidor** (RPCs `SECURITY DEFINER`); o cliente não tem permissão de gravar/alterar XP.
2. **Relógio do servidor**: duração do treino, "dia" do jogador e janela das provas.
3. **Prova ao vivo**: só câmera (sem galeria), gesto sorteado pelo servidor, 3 min para enviar, marca d'água;
   o servidor confere que o arquivo foi **criado no Storage dentro da janela** (foto antiga é recusada) e que é de uso único.
4. **Prova surpresa** em momento aleatório do treino; **sensor de movimento** do celular.
5. **Plausibilidade**: séries rápidas demais, variação de peso impossível, altura alterada, limites diários de XP.
6. **Aliados auditam**: 1 aprovação verifica; 2 reprovações zeram o XP.
7. **Trilha de auditoria somente-inserção** e **nota de confiança** visível no ranking.

Teste automatizado (37 checagens) que tenta burlar o servidor num Postgres embutido:
```bash
npm install
npm test
```

## Rodar localmente
```bash
python -m http.server 5173
```
Abra `http://localhost:5173`. Sem configurar nada roda no **Modo Solo** (dados e auditoria só no aparelho).

## Colocar online com amigos (grátis)
1. **Supabase**: crie um projeto (região São Paulo) → SQL Editor → cole `supabase/schema.sql` → Run.
   Copie Project URL e anon key para `js/config.js`. (Opcional: desligue *Confirm email*; em URL Configuration
   ponha o endereço do app.) A anon key é pública por design — quem protege os dados é o RLS.
2. **Hospedagem**: arraste a pasta em https://app.netlify.com/drop (ou GitHub Pages). A câmera exige HTTPS — ambos já dão.
3. **Celular**: abra o link → Compartilhar → Adicionar à Tela de Início (iPhone) / Instalar app (Android).
4. A cada deploy, suba `VERSION` em `sw.js`.

Plano grátis do Supabase: 500 MB de banco, 1 GB de Storage (≈ 10 mil fotos de prova de ~100 KB). Pausa após 7 dias sem uso.

## Estrutura
```
js/app.js              estado, ações e eventos        js/rules.js        regras de XP/auditoria (espelho do SQL)
js/game.js             níveis, classes, conquistas    js/nutrition.js    avaliação, metas e planejador de cardápio
js/foods.js, recipes.js  TACO + receitas              js/market.js       feira (peso cru, embalagens, preços)
js/labs.js             exames                         js/readiness.js    prontidão e ajuste diário
js/progression.js      carga e periodização           js/timer.js        timer, alarmes, alarme nativo
js/routine.js          rotina de trabalho/refeições   js/guide.js        condicionamento e suplementos
js/exercises.js        biblioteca de exercícios       js/ui/camera.js    prova ao vivo
js/store/              local (modo solo) e Supabase   js/views/          telas
supabase/schema.sql    tabelas, RPCs, RLS, Storage    tests/             testes antifraude do servidor
```
