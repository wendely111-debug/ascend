// Fichas de treino prontas. Item: ex (id do exercício), sets, reps (texto livre: "8-10", "40s"), rest (segundos).
const it = (ex, sets, reps, rest = 75) => ({ ex, sets, reps, rest });

export const PRESET_ROUTINES = [
  {
    id: 'preset-a', name: 'Ficha A · Peito, ombro e tríceps', attr: 'STR', level: 'Intermediário',
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
    id: 'preset-b', name: 'Ficha B · Costas e bíceps', attr: 'STR', level: 'Intermediário',
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
    id: 'preset-c', name: 'Ficha C · Pernas e glúteos', attr: 'STR', level: 'Intermediário',
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
    id: 'preset-maquinas', name: 'Iniciante · Circuito de máquinas', attr: 'STR', level: 'Iniciante',
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
    id: 'preset-casa', name: 'Casa · Sem equipamento', attr: 'STR', level: 'Todos',
    desc: 'Treino de corpo inteiro com o peso do corpo, em qualquer lugar.',
    items: [
      it('Pushups', 4, '15', 60),
      it('Bodyweight_Squat', 4, '20', 60),
      it('Bodyweight_Walking_Lunge', 3, '12 cada perna', 60),
      it('Bench_Dips', 3, '12', 60),
      it('Plank', 3, '40s', 45),
      it('Mountain_Climbers', 3, '30s', 45),
    ],
  },
  {
    id: 'preset-cardio', name: 'Cardio · Queima', attr: 'AGI', level: 'Todos',
    desc: 'Circuito de máquinas de cardio para condicionamento.',
    items: [
      it('Running_Treadmill', 1, '15 min', 60),
      it('Rowing_Stationary', 1, '10 min', 60),
      it('Bicycling_Stationary', 1, '10 min', 60),
      it('Rope_Jumping', 3, '1 min', 45),
    ],
  },
];

export const findPreset = (id) => PRESET_ROUTINES.find((r) => r.id === id);
