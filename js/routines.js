// Fichas de treino prontas. Item: ex (id do exercício), sets, reps (texto livre: "8-10", "40s"), rest (segundos)
// e m opcional = equipamento caseiro no lugar do de academia. place: 'academia' | 'casa'; need = o que é preciso ter.
const it = (ex, sets, reps, rest = 75, m) => ({ ex, sets, reps, rest, ...(m ? { m } : {}) });

export const PLACES = { academia: 'Academia', casa: 'Em casa' };

export const PRESET_ROUTINES = [
  {
    id: 'preset-a', place: 'academia', name: 'Ficha A · Peito, ombro e tríceps', attr: 'STR', level: 'Intermediário',
    desc: 'Empurrar: supino, voador, desenvolvimento e tríceps.',
    items: [
      it('Barbell_Bench_Press_-_Medium_Grip', 4, '8-10', 120),
      it('Incline_Dumbbell_Press', 3, '10', 90),
      it('Butterfly', 3, '12', 60),
      it('Leverage_Shoulder_Press', 3, '10', 90),
      it('Side_Lateral_Raise', 3, '12-15', 60),
      it('Triceps_Pushdown_-_Rope_Attachment', 3, '12', 60),
    ],
  },
  {
    id: 'preset-b', place: 'academia', name: 'Ficha B · Costas e bíceps', attr: 'STR', level: 'Intermediário',
    desc: 'Puxar: puxada, remadas, posterior de ombro e roscas.',
    items: [
      it('Wide-Grip_Lat_Pulldown', 4, '10', 90),
      it('Seated_Cable_Rows', 3, '10', 90),
      it('One-Arm_Dumbbell_Row', 3, '10 cada lado', 60),
      it('Reverse_Machine_Flyes', 3, '12', 60),
      it('Barbell_Curl', 3, '10', 60),
      it('Hammer_Curls', 3, '12', 60),
    ],
  },
  {
    id: 'preset-c', place: 'academia', name: 'Ficha C · Pernas e glúteos', attr: 'STR', level: 'Intermediário',
    desc: 'Agachamento, leg press, extensora, flexora, pélvica e panturrilha.',
    items: [
      it('Barbell_Squat', 4, '8', 120),
      it('Leg_Press', 4, '10', 90),
      it('Leg_Extensions', 3, '12', 60),
      it('Lying_Leg_Curls', 3, '12', 60),
      it('Barbell_Hip_Thrust', 3, '10', 90),
      it('Standing_Calf_Raises', 4, '15', 45),
    ],
  },
  {
    id: 'preset-maquinas', place: 'academia', name: 'Iniciante · Circuito de máquinas', attr: 'STR', level: 'Iniciante',
    desc: 'Corpo inteiro só em máquinas: seguro e fácil de aprender.',
    items: [
      it('Leverage_Chest_Press', 3, '12', 60),
      it('Wide-Grip_Lat_Pulldown', 3, '12', 60),
      it('Leg_Press', 3, '12', 60),
      it('Seated_Leg_Curl', 3, '12', 60),
      it('Machine_Shoulder_Military_Press', 3, '12', 60),
      it('Ab_Crunch_Machine', 3, '15', 45),
    ],
  },
  {
    id: 'preset-cardio', place: 'academia', name: 'Cardio · Queima', attr: 'AGI', level: 'Todos',
    desc: 'Circuito de máquinas de cardio para condicionamento.',
    items: [
      it('Running_Treadmill', 1, '15 min', 60),
      it('Rowing_Stationary', 1, '10 min', 60),
      it('Bicycling_Stationary', 1, '10 min', 60),
      it('Rope_Jumping', 3, '1 min', 45),
    ],
  },
  // ---- Em casa: mesma lógica das fichas de academia (A/B/C, iniciante, corpo inteiro, core e cardio) ----
  {
    id: 'casa-a', place: 'casa', name: 'Casa A · Peito, ombro e tríceps', attr: 'STR', level: 'Intermediário',
    need: 'Chão, uma cadeira firme e um sofá ou degrau',
    desc: 'Empurrar só com o peso do corpo: flexões em ângulos diferentes e mergulho na cadeira.',
    items: [
      it('Pushups', 4, '12-15', 90),
      it('Push-Ups_With_Feet_Elevated', 3, '8-12', 90, 'Pés no sofá, cama ou degrau'),
      it('Push-Up_Wide', 3, '10-12', 75),
      it('Push_Up_to_Side_Plank', 3, '6 cada lado', 60),
      it('Push-Ups_-_Close_Triceps_Position', 3, '8-12', 75),
      it('Bench_Dips', 3, '12-15', 60, 'Cadeira firme encostada na parede'),
    ],
  },
  {
    id: 'casa-b', place: 'casa', name: 'Casa B · Costas e bíceps', attr: 'STR', level: 'Intermediário',
    need: 'Mesa firme (ou cabo de vassoura entre 2 cadeiras), mochila com peso ou galões de água',
    desc: 'Puxar sem aparelho: remada invertida, remadas com mochila/galão e roscas.',
    items: [
      it('Inverted_Row', 4, '8-12', 90, 'Debaixo de uma mesa firme ou cabo de vassoura entre 2 cadeiras'),
      it('One-Arm_Dumbbell_Row', 3, '12 cada lado', 60, 'Mochila com livros ou galão de 5 L + cadeira'),
      it('Bent_Over_Two-Dumbbell_Row', 3, '12', 75, '2 galões de água ou mochila'),
      it('Superman', 3, '15', 45, 'Colchonete ou tapete'),
      it('Dumbbell_Bicep_Curl', 3, '12-15', 60, 'Galões de água, garrafas ou mochila'),
      it('Hammer_Curls', 3, '12-15', 60, 'Galões de água ou garrafas'),
    ],
  },
  {
    id: 'casa-c', place: 'casa', name: 'Casa C · Pernas e glúteos', attr: 'STR', level: 'Intermediário',
    need: 'Chão, um degrau ou escada e uma cadeira para apoio',
    desc: 'Agachamento, afundo, subida no degrau, pontes de glúteo e panturrilha.',
    items: [
      it('Bodyweight_Squat', 4, '20', 75),
      it('Bodyweight_Walking_Lunge', 3, '12 cada perna', 75),
      it('Step-up_with_Knee_Raise', 3, '10 cada perna', 60, 'Degrau da escada ou banquinho firme'),
      it('Butt_Lift_Bridge', 4, '15', 60, 'Colchonete ou tapete'),
      it('Single_Leg_Glute_Bridge', 3, '10 cada perna', 60, 'Colchonete ou tapete'),
      it('Glute_Kickback', 3, '15 cada perna', 45, 'Colchonete ou tapete'),
      it('Standing_Dumbbell_Calf_Raise', 4, '20', 45, 'Degrau da escada (peso opcional)'),
    ],
  },
  {
    id: 'casa-iniciante', place: 'casa', name: 'Iniciante · Corpo inteiro em casa', attr: 'STR', level: 'Iniciante',
    need: 'Chão e uma mesa ou bancada firme',
    desc: 'Versões mais fáceis para começar com segurança: flexão inclinada, agachamento, ponte e core.',
    items: [
      it('Incline_Push-Up', 3, '10', 60, 'Mãos na bancada, mesa ou encosto do sofá'),
      it('Bodyweight_Squat', 3, '12', 60),
      it('Butt_Lift_Bridge', 3, '12', 60, 'Colchonete ou tapete'),
      it('Superman', 3, '10', 45, 'Colchonete ou tapete'),
      it('Dead_Bug', 3, '8 cada lado', 45, 'Colchonete ou tapete'),
      it('Plank', 3, '20s', 45),
    ],
  },
  {
    id: 'preset-casa', place: 'casa', name: 'Casa · Corpo inteiro sem equipamento', attr: 'STR', level: 'Todos',
    need: 'Só o chão e uma cadeira',
    desc: 'Treino de corpo inteiro com o peso do corpo, em qualquer lugar.',
    items: [
      it('Pushups', 4, '15', 60),
      it('Bodyweight_Squat', 4, '20', 60),
      it('Bodyweight_Walking_Lunge', 3, '12 cada perna', 60),
      it('Bench_Dips', 3, '12', 60, 'Cadeira firme encostada na parede'),
      it('Plank', 3, '40s', 45),
      it('Mountain_Climbers', 3, '30s', 45),
    ],
  },
  {
    id: 'casa-halteres', place: 'casa', name: 'Casa · Halteres e elástico', attr: 'STR', level: 'Intermediário',
    need: 'Um par de halteres (ou galões de água) e um elástico/faixa',
    desc: 'Para quem tem halteres em casa: corpo inteiro com progressão de carga igual à academia.',
    items: [
      it('Dumbbell_Floor_Press', 4, '10', 90, 'Halteres, deitado no chão'),
      it('Bent_Over_Two-Dumbbell_Row', 4, '10', 90, 'Halteres'),
      it('Dumbbell_Squat', 4, '12', 90, 'Halteres'),
      it('Stiff-Legged_Dumbbell_Deadlift', 3, '10', 90, 'Halteres'),
      it('Standing_Dumbbell_Press', 3, '10', 75, 'Halteres'),
      it('Band_Pull_Apart', 3, '15', 45, 'Elástico / faixa de resistência'),
      it('Dumbbell_Bicep_Curl', 3, '12', 60, 'Halteres'),
      it('Tricep_Dumbbell_Kickback', 3, '12', 60, 'Halteres'),
    ],
  },
  {
    id: 'casa-core', place: 'casa', name: 'Casa · Abdômen e core', attr: 'STR', level: 'Todos',
    need: 'Colchonete ou tapete',
    desc: 'Abdômen completo: supra, infra, oblíquos e estabilidade.',
    items: [
      it('Crunches', 3, '20', 40),
      it('Reverse_Crunch', 3, '15', 40, 'Colchonete ou tapete'),
      it('Russian_Twist', 3, '20 (10 cada lado)', 40, 'Colchonete (peso opcional)'),
      it('Flutter_Kicks', 3, '30s', 40, 'Colchonete ou tapete'),
      it('Side_Bridge', 3, '30s cada lado', 40, 'Colchonete ou tapete'),
      it('Plank', 3, '45s', 45),
    ],
  },
  {
    id: 'casa-hiit', place: 'casa', name: 'Casa · HIIT queima', attr: 'AGI', level: 'Todos',
    need: 'Espaço livre de 2×2 m (corda opcional)',
    desc: 'Cardio intervalado em casa: tiros de 30–40s com pouco descanso. Substitui esteira e bike.',
    items: [
      it('Star_Jump', 4, '40s', 20, 'Peso corporal'),
      it('Mountain_Climbers', 4, '30s', 20),
      it('Freehand_Jump_Squat', 4, '30s', 30, 'Peso corporal'),
      it('Split_Jump', 3, '30s', 30, 'Peso corporal'),
      it('Rope_Jumping', 4, '1 min', 30, 'Corda (ou simule o movimento sem corda)'),
      it('Plank', 3, '40s', 30),
    ],
  },
];

export const findPreset = (id) => PRESET_ROUTINES.find((r) => r.id === id);
