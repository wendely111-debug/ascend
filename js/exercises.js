// Biblioteca de exercícios (free-exercise-db, domínio público) + tradução PT-BR.
// Fotos: 0.jpg = posição inicial, 1.jpg = posição final — servidas pelo jsDelivr, fixadas no commit.
const COMMIT = 'a859101d633a01c4a1a920d6a8ce41dabba0705f';
const IMG_BASE = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${COMMIT}/exercises`;

export const exImg = (id, n = 0) => `${IMG_BASE}/${encodeURIComponent(id)}/${n}.jpg`;

export const EQUIPMENT = {
  machine: 'Máquina', cable: 'Polia / cabo', barbell: 'Barra', dumbbell: 'Halteres',
  'body only': 'Peso corporal', kettlebells: 'Kettlebell', bands: 'Elástico',
  'e-z curl bar': 'Barra W', 'medicine ball': 'Medicine ball', 'exercise ball': 'Bola suíça',
  'foam roll': 'Rolo de espuma', other: 'Outro',
};

export const MUSCLES = {
  abdominals: 'Abdômen', abductors: 'Abdutores', adductors: 'Adutores', biceps: 'Bíceps',
  calves: 'Panturrilha', chest: 'Peito', forearms: 'Antebraço', glutes: 'Glúteos',
  hamstrings: 'Posterior de coxa', lats: 'Dorsal', 'lower back': 'Lombar', 'middle back': 'Costas',
  neck: 'Pescoço', quadriceps: 'Quadríceps', shoulders: 'Ombros', traps: 'Trapézio', triceps: 'Tríceps',
};

export const LEVELS = { beginner: 'Iniciante', intermediate: 'Intermediário', expert: 'Avançado' };

export const CATEGORIES = {
  strength: 'Força', stretching: 'Alongamento', plyometrics: 'Pliometria', powerlifting: 'Powerlifting',
  'olympic weightlifting': 'Olímpico', strongman: 'Strongman', cardio: 'Cardio',
};

/** Filtros por grupo muscular (agrupam os músculos do banco). */
export const GROUPS = {
  peito: { name: 'Peito', muscles: ['chest'] },
  costas: { name: 'Costas', muscles: ['lats', 'middle back', 'lower back', 'traps'] },
  ombros: { name: 'Ombros', muscles: ['shoulders'] },
  bracos: { name: 'Braços', muscles: ['biceps', 'triceps', 'forearms'] },
  abdomen: { name: 'Abdômen', muscles: ['abdominals'] },
  pernas: { name: 'Pernas', muscles: ['quadriceps', 'hamstrings', 'calves', 'adductors', 'abductors'] },
  gluteos: { name: 'Glúteos', muscles: ['glutes'] },
};

/** Filtros por equipamento — "máquina" junta máquina e polia, que é o que se procura na academia. */
export const EQ_FILTERS = {
  maquina: { name: 'Máquinas', eq: ['machine', 'cable'] },
  livre: { name: 'Pesos livres', eq: ['barbell', 'dumbbell', 'e-z curl bar', 'kettlebells'] },
  corpo: { name: 'Sem equipamento', eq: ['body only'] },
  outros: { name: 'Acessórios', eq: ['bands', 'medicine ball', 'exercise ball', 'foam roll', 'other'] },
};

// n = nome PT · m = aparelho/equipamento como é chamado na academia · d = execução (passos)
export const PT = {
  'Barbell_Bench_Press_-_Medium_Grip': { n: 'Supino reto com barra', m: 'Banco reto + barra', d: ['Deite no banco com os olhos sob a barra e os pés firmes no chão.', 'Segure a barra um pouco além da largura dos ombros e retire do suporte com os braços estendidos.', 'Desça controlando até tocar levemente o meio do peito.', 'Empurre de volta até estender os braços, sem tirar o quadril do banco.'] },
  Incline_Dumbbell_Press: { n: 'Supino inclinado com halteres', m: 'Banco inclinado (30–45°) + halteres', d: ['Sente no banco inclinado com um halter em cada mão, apoiados nas coxas.', 'Deite e leve os halteres à altura do peito, palmas para frente.', 'Empurre para cima até quase encostar os halteres.', 'Desça devagar até sentir o alongamento no peito.'] },
  Machine_Bench_Press: { n: 'Supino na máquina', m: 'Máquina de supino', d: ['Ajuste o banco para as pegadas ficarem na linha do meio do peito.', 'Segure as pegadas com as costas apoiadas.', 'Empurre até estender os braços sem travar os cotovelos.', 'Volte devagar até sentir o peito alongar.'] },
  Leverage_Chest_Press: { n: 'Chest press (máquina articulada)', m: 'Máquina chest press', d: ['Ajuste o assento para as pegadas ficarem na altura do peito.', 'Mantenha costas e cabeça apoiadas no encosto.', 'Empurre até estender os braços.', 'Retorne controlando, sem deixar as placas baterem.'] },
  Butterfly: { n: 'Voador (peck deck)', m: 'Máquina voador / peck deck', d: ['Ajuste o banco para os braços ficarem na altura dos ombros.', 'Apoie os antebraços (ou segure as pegadas) com cotovelos levemente flexionados.', 'Junte os braços à frente do peito, contraindo o peitoral por 1 segundo.', 'Abra devagar até sentir o alongamento.'] },
  Dumbbell_Flyes: { n: 'Crucifixo com halteres', m: 'Banco reto + halteres', d: ['Deite no banco com os halteres acima do peito, palmas uma para a outra.', 'Com cotovelos levemente dobrados, abra os braços em arco.', 'Desça até sentir o peito alongar, sem passar da linha dos ombros.', 'Volte pelo mesmo arco "abraçando" o ar.'] },
  Pushups: { n: 'Flexão de braço', m: 'Peso corporal (chão)', d: ['Mãos no chão um pouco além da largura dos ombros, corpo reto da cabeça aos pés.', 'Desça o peito até quase tocar o chão, cotovelos a ~45° do tronco.', 'Empurre o chão até estender os braços.', 'Mantenha o abdômen contraído o tempo todo — sem deixar o quadril cair.'] },
  'Dips_-_Triceps_Version': { n: 'Mergulho nas paralelas (tríceps)', m: 'Barras paralelas', d: ['Apoie-se nas paralelas com os braços estendidos e o tronco reto.', 'Desça dobrando os cotovelos, mantendo-os junto ao corpo.', 'Vá até os braços formarem ~90°.', 'Empurre de volta até estender os braços.'] },
  Bench_Dips: { n: 'Mergulho no banco', m: 'Banco', d: ['Apoie as mãos na borda do banco atrás de você, pernas estendidas à frente.', 'Desça o quadril dobrando os cotovelos até ~90°.', 'Mantenha as costas próximas ao banco.', 'Empurre de volta estendendo os braços.'] },
  Leverage_Shoulder_Press: { n: 'Desenvolvimento na máquina', m: 'Máquina de desenvolvimento (shoulder press)', d: ['Ajuste o banco para as pegadas ficarem na altura dos ombros.', 'Costas apoiadas, segure as pegadas.', 'Empurre para cima até quase estender os braços.', 'Desça controlando até a altura das orelhas.'] },
  Machine_Shoulder_Military_Press: { n: 'Desenvolvimento militar na máquina', m: 'Máquina de desenvolvimento', d: ['Sente com as costas apoiadas e segure as pegadas na altura dos ombros.', 'Empurre para cima sem arquear a lombar.', 'Pare antes de travar os cotovelos.', 'Retorne devagar.'] },
  Dumbbell_Shoulder_Press: { n: 'Desenvolvimento com halteres', m: 'Banco com encosto + halteres', d: ['Sente com o encosto reto e os halteres na altura dos ombros, palmas para frente.', 'Empurre para cima até quase encostar os halteres.', 'Desça até os cotovelos ficarem um pouco abaixo dos ombros.', 'Mantenha o abdômen firme e a lombar apoiada.'] },
  Side_Lateral_Raise: { n: 'Elevação lateral', m: 'Halteres', d: ['Em pé, halteres ao lado do corpo, cotovelos levemente dobrados.', 'Eleve os braços para os lados até a altura dos ombros.', 'Lidere o movimento com os cotovelos, não com as mãos.', 'Desça devagar, sem balançar o tronco.'] },
  Front_Dumbbell_Raise: { n: 'Elevação frontal', m: 'Halteres', d: ['Em pé, halteres à frente das coxas.', 'Eleve um braço (ou os dois) à frente até a altura dos ombros.', 'Mantenha o cotovelo levemente dobrado.', 'Desça controlando.'] },
  Face_Pull: { n: 'Face pull', m: 'Polia alta + corda', d: ['Regule a polia na altura do rosto e segure a corda com as palmas para dentro.', 'Dê um passo para trás com os braços estendidos.', 'Puxe a corda em direção ao rosto, abrindo os cotovelos para os lados.', 'Contraia a parte de trás dos ombros e volte devagar.'] },
  Reverse_Machine_Flyes: { n: 'Crucifixo inverso na máquina', m: 'Máquina voador (sentado de frente para o encosto)', d: ['Sente de frente para o encosto do voador, peito apoiado.', 'Segure as pegadas com os braços estendidos à frente.', 'Abra os braços para trás até a linha do corpo.', 'Contraia a parte posterior do ombro e volte devagar.'] },
  'Triceps_Pushdown_-_Rope_Attachment': { n: 'Tríceps na polia com corda', m: 'Polia alta + corda', d: ['De frente para a polia alta, segure a corda com cotovelos colados ao corpo.', 'Empurre para baixo até estender totalmente os braços.', 'No final, afaste as pontas da corda para os lados.', 'Suba só até ~90°, sem mexer os cotovelos.'] },
  Triceps_Pushdown: { n: 'Tríceps pulley (barra)', m: 'Polia alta + barra reta', d: ['Segure a barra com as palmas para baixo, cotovelos colados ao corpo.', 'Empurre até estender os braços.', 'Contraia o tríceps por 1 segundo.', 'Volte devagar sem afastar os cotovelos do tronco.'] },
  'EZ-Bar_Skullcrusher': { n: 'Tríceps testa', m: 'Banco reto + barra W', d: ['Deite com a barra W acima do peito, braços estendidos.', 'Dobre só os cotovelos, levando a barra em direção à testa.', 'Mantenha os braços parados, apontando para cima.', 'Estenda de volta contraindo o tríceps.'] },
  'Wide-Grip_Lat_Pulldown': { n: 'Puxada frontal aberta', m: 'Máquina de puxada (pulley alto)', d: ['Ajuste o apoio das coxas e segure a barra com pegada aberta.', 'Incline levemente o tronco para trás e estufe o peito.', 'Puxe a barra até a parte de cima do peito, levando os cotovelos para baixo.', 'Suba controlando até estender os braços.'] },
  'V-Bar_Pulldown': { n: 'Puxada com triângulo', m: 'Máquina de puxada + triângulo', d: ['Encaixe o triângulo na polia alta e sente com as coxas travadas.', 'Puxe o triângulo até o peito, cotovelos junto ao corpo.', 'Aperte as escápulas no final.', 'Volte devagar alongando as costas.'] },
  Seated_Cable_Rows: { n: 'Remada baixa sentada', m: 'Polia baixa (remada sentada) + triângulo', d: ['Sente com os pés na plataforma e joelhos levemente dobrados.', 'Segure o triângulo com o tronco reto.', 'Puxe até o abdômen, levando os cotovelos para trás e unindo as escápulas.', 'Volte estendendo os braços sem curvar a coluna.'] },
  'One-Arm_Dumbbell_Row': { n: 'Remada unilateral (serrote)', m: 'Banco + halter', d: ['Apoie joelho e mão do mesmo lado no banco, costas retas.', 'Segure o halter com o outro braço estendido.', 'Puxe o halter até a lateral do abdômen, cotovelo junto ao corpo.', 'Desça controlando. Troque de lado.'] },
  Bent_Over_Barbell_Row: { n: 'Remada curvada com barra', m: 'Barra', d: ['Segure a barra, dobre levemente os joelhos e incline o tronco à frente com as costas retas.', 'Puxe a barra até o abdômen.', 'Una as escápulas no topo.', 'Desça controlando, sem arredondar a coluna.'] },
  Pullups: { n: 'Barra fixa', m: 'Barra fixa', d: ['Segure a barra com as palmas para frente, pegada um pouco além dos ombros.', 'Puxe o corpo até o queixo passar da barra.', 'Leve os cotovelos para baixo e para trás.', 'Desça até estender os braços. Iniciante: use elástico ou o gravitron.'] },
  Barbell_Deadlift: { n: 'Levantamento terra', m: 'Barra', d: ['Pés na largura do quadril, barra sobre o meio dos pés.', 'Agache segurando a barra, costas retas e peito aberto.', 'Suba empurrando o chão com as pernas, barra rente ao corpo.', 'Termine com o quadril estendido e desça pelo mesmo caminho.'] },
  Barbell_Curl: { n: 'Rosca direta com barra', m: 'Barra', d: ['Em pé, segure a barra com as palmas para frente na largura dos ombros.', 'Dobre os cotovelos levando a barra até o peito.', 'Mantenha os cotovelos colados ao corpo, sem balançar.', 'Desça devagar até estender os braços.'] },
  Hammer_Curls: { n: 'Rosca martelo', m: 'Halteres', d: ['Em pé, halteres ao lado do corpo com as palmas voltadas para dentro.', 'Suba os halteres mantendo a pegada neutra.', 'Cotovelos fixos ao lado do corpo.', 'Desça controlando.'] },
  Dumbbell_Bicep_Curl: { n: 'Rosca com halteres', m: 'Halteres', d: ['Em pé, halteres ao lado do corpo.', 'Suba girando as palmas para cima.', 'Contraia o bíceps no topo.', 'Desça devagar, sem balançar o tronco.'] },
  Machine_Preacher_Curls: { n: 'Rosca Scott na máquina', m: 'Máquina Scott', d: ['Ajuste o banco para os braços apoiarem totalmente no apoio.', 'Segure as pegadas com as palmas para cima.', 'Dobre os cotovelos até a contração máxima.', 'Desça devagar quase até estender.'] },
  Barbell_Squat: { n: 'Agachamento livre com barra', m: 'Rack / gaiola + barra', d: ['Apoie a barra no trapézio e retire do rack.', 'Pés na largura dos ombros, pontas levemente para fora.', 'Desça empurrando o quadril para trás até as coxas ficarem paralelas ao chão.', 'Suba empurrando o chão, joelhos alinhados com os pés.'] },
  Bodyweight_Squat: { n: 'Agachamento livre', m: 'Peso corporal', d: ['Pés na largura dos ombros, braços à frente para equilíbrio.', 'Desça levando o quadril para trás como se fosse sentar.', 'Mantenha o peito aberto e os calcanhares no chão.', 'Suba até estender o quadril.'] },
  Leg_Press: { n: 'Leg press 45°', m: 'Máquina leg press 45°', d: ['Sente com as costas apoiadas e os pés no meio da plataforma, na largura do quadril.', 'Destrave e desça a plataforma dobrando os joelhos até ~90°.', 'Não deixe o quadril descolar do banco.', 'Empurre de volta sem travar os joelhos.'] },
  Hack_Squat: { n: 'Agachamento hack', m: 'Máquina hack', d: ['Apoie as costas e os ombros na máquina, pés no meio da plataforma.', 'Destrave e desça até as coxas ficarem paralelas.', 'Mantenha joelhos alinhados com os pés.', 'Suba empurrando com os calcanhares.'] },
  Smith_Machine_Squat: { n: 'Agachamento no Smith', m: 'Máquina Smith', d: ['Posicione a barra do Smith no trapézio, pés um pouco à frente do corpo.', 'Destrave girando a barra.', 'Desça até as coxas ficarem paralelas ao chão.', 'Suba estendendo quadril e joelhos.'] },
  Leg_Extensions: { n: 'Cadeira extensora', m: 'Cadeira extensora', d: ['Ajuste o encosto para o joelho ficar alinhado ao eixo da máquina.', 'Rolo apoiado logo acima dos tornozelos.', 'Estenda as pernas até ficarem retas, contraindo o quadríceps.', 'Desça devagar.'] },
  Lying_Leg_Curls: { n: 'Mesa flexora', m: 'Mesa flexora', d: ['Deite de bruços com o joelho logo após a borda do banco.', 'Rolo apoiado acima dos calcanhares.', 'Flexione os joelhos trazendo o rolo em direção aos glúteos.', 'Desça controlando, sem tirar o quadril do banco.'] },
  Seated_Leg_Curl: { n: 'Cadeira flexora', m: 'Cadeira flexora', d: ['Sente com o joelho alinhado ao eixo da máquina e trave as coxas.', 'Rolo apoiado atrás dos tornozelos.', 'Puxe o rolo para baixo e para trás dobrando os joelhos.', 'Volte devagar.'] },
  Romanian_Deadlift: { n: 'Stiff / terra romeno', m: 'Barra', d: ['Em pé com a barra à frente das coxas, joelhos levemente dobrados.', 'Leve o quadril para trás descendo a barra rente às pernas.', 'Desça até sentir alongar o posterior, costas sempre retas.', 'Suba empurrando o quadril para frente.'] },
  Barbell_Hip_Thrust: { n: 'Elevação pélvica com barra', m: 'Banco + barra (use protetor)', d: ['Apoie a parte de cima das costas no banco, barra sobre o quadril.', 'Pés firmes no chão, na largura do quadril.', 'Eleve o quadril até o tronco ficar alinhado com as coxas.', 'Contraia os glúteos no topo e desça controlando.'] },
  Dumbbell_Lunges: { n: 'Afundo com halteres', m: 'Halteres', d: ['Em pé com um halter em cada mão.', 'Dê um passo à frente e desça até os dois joelhos formarem ~90°.', 'Joelho da frente alinhado ao pé.', 'Volte empurrando com o pé da frente. Alterne as pernas.'] },
  Bodyweight_Walking_Lunge: { n: 'Afundo caminhando', m: 'Peso corporal', d: ['Em pé, mãos na cintura.', 'Dê um passo longo à frente e desça o joelho de trás em direção ao chão.', 'Suba e já avance com a outra perna.', 'Mantenha o tronco ereto.'] },
  Thigh_Adductor: { n: 'Cadeira adutora', m: 'Cadeira adutora', d: ['Sente com as pernas abertas apoiadas nas almofadas.', 'Feche as pernas contraindo a parte interna das coxas.', 'Segure 1 segundo.', 'Abra devagar.'] },
  Thigh_Abductor: { n: 'Cadeira abdutora', m: 'Cadeira abdutora', d: ['Sente com as pernas fechadas e as almofadas por fora dos joelhos.', 'Abra as pernas contra a resistência.', 'Segure 1 segundo contraindo os glúteos.', 'Feche devagar.'] },
  Standing_Calf_Raises: { n: 'Panturrilha em pé', m: 'Máquina de panturrilha em pé', d: ['Ombros sob as almofadas, pontas dos pés na borda da plataforma.', 'Desça os calcanhares até alongar.', 'Suba na ponta dos pés o mais alto possível.', 'Segure 1 segundo no topo.'] },
  Seated_Calf_Raise: { n: 'Panturrilha sentado', m: 'Máquina de panturrilha sentado', d: ['Sente com a almofada sobre as coxas, perto dos joelhos.', 'Pontas dos pés na plataforma.', 'Eleve os calcanhares o máximo possível.', 'Desça até alongar.'] },
  Crunches: { n: 'Abdominal supra', m: 'Colchonete', d: ['Deite com joelhos dobrados e pés no chão.', 'Mãos atrás da cabeça, sem puxar o pescoço.', 'Eleve os ombros do chão contraindo o abdômen.', 'Desça devagar.'] },
  Ab_Crunch_Machine: { n: 'Abdominal na máquina', m: 'Máquina de abdominal', d: ['Ajuste o banco e segure as pegadas.', 'Flexione o tronco para frente contraindo o abdômen.', 'Expire na descida do tronco.', 'Volte devagar sem soltar a carga.'] },
  Cable_Crunch: { n: 'Abdominal na polia (ajoelhado)', m: 'Polia alta + corda', d: ['Ajoelhe de frente para a polia, corda atrás da cabeça.', 'Flexione o tronco levando os cotovelos em direção às coxas.', 'O quadril fica parado — quem trabalha é o abdômen.', 'Volte controlando.'] },
  Plank: { n: 'Prancha', m: 'Colchonete', d: ['Apoie antebraços e pontas dos pés no chão.', 'Corpo reto da cabeça aos calcanhares.', 'Contraia abdômen e glúteos.', 'Mantenha a posição respirando normalmente.'] },
  Hanging_Leg_Raise: { n: 'Elevação de pernas na barra', m: 'Barra fixa', d: ['Pendure-se na barra com os braços estendidos.', 'Eleve as pernas até a altura do quadril (ou mais).', 'Evite balançar o corpo.', 'Desça devagar.'] },
  Mountain_Climbers: { n: 'Escalador (mountain climber)', m: 'Peso corporal', d: ['Posição de prancha alta, mãos sob os ombros.', 'Traga um joelho em direção ao peito.', 'Troque as pernas rapidamente, como se corresse.', 'Mantenha o quadril baixo.'] },
  Rope_Jumping: { n: 'Pular corda', m: 'Corda', d: ['Segure a corda com os cotovelos junto ao corpo.', 'Gire a corda com os punhos.', 'Salte baixo, na ponta dos pés.', 'Mantenha um ritmo constante.'] },
  Running_Treadmill: { n: 'Corrida na esteira', m: 'Esteira', d: ['Comece caminhando 3–5 min para aquecer.', 'Aumente a velocidade até um ritmo em que ainda consiga falar frases curtas.', 'Postura ereta, olhar à frente, passadas curtas.', 'Termine com 3 min de caminhada.'] },
  Bicycling_Stationary: { n: 'Bicicleta ergométrica', m: 'Bicicleta ergométrica', d: ['Ajuste o banco: joelho levemente dobrado com o pedal embaixo.', 'Pedale em cadência constante.', 'Aumente a carga para subir a intensidade.', 'Mantenha o tronco estável.'] },
  Elliptical_Trainer: { n: 'Elíptico (transport)', m: 'Elíptico', d: ['Suba nos pedais e segure as alças móveis.', 'Movimente braços e pernas em sincronia.', 'Ajuste a resistência para manter o esforço.', 'Postura ereta.'] },
  Rowing_Stationary: { n: 'Remo ergômetro', m: 'Remo ergômetro', d: ['Prenda os pés e segure a pegada com os braços estendidos.', 'Empurre com as pernas primeiro, depois incline o tronco e puxe com os braços.', 'Volte na ordem inversa: braços, tronco, pernas.', 'Mantenha as costas retas.'] },
  Stairmaster: { n: 'Simulador de escada', m: 'Máquina de escada (stair climber)', d: ['Suba e segure levemente as alças, sem apoiar o peso nelas.', 'Pise com o pé inteiro em cada degrau.', 'Mantenha o tronco ereto.', 'Ajuste a velocidade ao seu nível.'] },
  Hyperextensions_Back_Extensions: { n: 'Hiperextensão lombar', m: 'Banco romano (hiperextensão)', d: ['Apoie o quadril na almofada e prenda os tornozelos.', 'Desça o tronco com as costas retas.', 'Suba até alinhar o tronco com as pernas.', 'Não hiperestenda a coluna no topo.'] },
  Barbell_Shrug: { n: 'Encolhimento com barra', m: 'Barra', d: ['Em pé, segure a barra à frente das coxas.', 'Eleve os ombros em direção às orelhas.', 'Segure 1 segundo.', 'Desça devagar, sem girar os ombros.'] },
  Standing_Cable_Chest_Press: { n: 'Crossover (supino em pé na polia)', m: 'Crossover (polias duplas)', d: ['Fique entre as polias segurando as pegadas na altura do peito.', 'Dê um passo à frente para tensionar os cabos.', 'Empurre as pegadas à frente até estender os braços.', 'Volte controlando.'] },
  Smith_Machine_Incline_Bench_Press: { n: 'Supino inclinado no Smith', m: 'Máquina Smith + banco inclinado', d: ['Posicione o banco inclinado sob a barra do Smith.', 'Destrave e desça a barra até a parte de cima do peito.', 'Empurre até estender os braços.', 'Trave girando a barra ao terminar.'] },
};

let DB = null;
let loading = null;

/** Carrega o catálogo completo (726 KB, sob demanda, em cache pelo service worker). */
export function loadExercises() {
  return (loading ??= fetch('data/exercises.json')
    .then((r) => { if (!r.ok) throw new Error('Não foi possível carregar a biblioteca de exercícios.'); return r.json(); })
    .then((list) => {
      DB = new Map(list.map((e) => [e.id, e]));
      return DB;
    })
    .catch((e) => { loading = null; throw e; }));
}

export const exercisesLoaded = () => DB !== null;
export const getExercise = (id) => DB?.get(id) ?? null;
export const allExercises = () => (DB ? [...DB.values()] : []);

/** Nome amigável: PT se houver tradução, senão o original. */
export const exName = (id, fallback) => PT[id]?.n ?? DB?.get(id)?.name ?? fallback ?? id.replace(/_/g, ' ');

/** Aparelho: nome de academia (PT) ou o tipo de equipamento. */
export const exMachine = (id) => PT[id]?.m ?? EQUIPMENT[DB?.get(id)?.eq] ?? '';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function searchExercises({ q = '', group = '', eqf = '', limit = Infinity } = {}) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  const muscles = GROUPS[group]?.muscles;
  const eqs = EQ_FILTERS[eqf]?.eq;
  const out = [];
  for (const e of DB?.values() ?? []) {
    if (muscles && !e.pm.some((m) => muscles.includes(m))) continue;
    if (eqs && !eqs.includes(e.eq)) continue;
    if (words.length) {
      const hay = norm(`${PT[e.id]?.n ?? ''} ${PT[e.id]?.m ?? ''} ${e.name} ${e.pm.map((m) => MUSCLES[m]).join(' ')} ${EQUIPMENT[e.eq]}`);
      if (!words.every((w) => hay.includes(w))) continue;
    }
    out.push(e);
  }
  // Traduzidos primeiro; depois por nome.
  out.sort((a, b) => (PT[b.id] ? 1 : 0) - (PT[a.id] ? 1 : 0) || exName(a.id).localeCompare(exName(b.id), 'pt'));
  return out.slice(0, limit);
}
