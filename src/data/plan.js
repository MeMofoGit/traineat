// Forced update
import benchPressImg from '../assets/exercises/bench_press.jpg';
import squatImg from '../assets/exercises/squat.jpg';
import deadliftImg from '../assets/exercises/deadlift.jpg';
import overheadPressImg from '../assets/exercises/overhead_press.jpg';
import pullUpImg from '../assets/exercises/pull_up.jpg';

export const GIF_MAP = {
    'Press Banca Barra': benchPressImg,
    'Press Inclinado Mancuernas': benchPressImg,
    'Aperturas / Cruces': benchPressImg,
    Dominadas: pullUpImg,
    'Jalón al Pecho': pullUpImg,
    'Press Militar': overheadPressImg,
    'Elevaciones Laterales': overheadPressImg,
    'Face Pulls': overheadPressImg,
    'Sentadilla Barra': squatImg,
    Sentadilla: squatImg,
    'Prensa/Zancadas': squatImg,
    Prensa: squatImg,
    'Extension Cuádriceps': squatImg,
    'Peso Muerto Rumano': deadliftImg,
    'Remo Barra': deadliftImg,
    'Remo con Barra': deadliftImg,
    'Curl Bíceps Barra': benchPressImg, // Placeholder
    'Press Francés': benchPressImg, // Placeholder
    'Plancha Abdominal': benchPressImg, // Placeholder
    'Crunch en Polea': benchPressImg, // Placeholder
    'Elevación de Piernas': benchPressImg, // Placeholder
    'Cinta Inclinada': benchPressImg, // Placeholder
    Elíptica: benchPressImg, // Placeholder
};

export const PLAN_DATA = {
    activePhaseId: 1,
    user: {
        name: 'Igor',
        birthday: '', // ISO date "YYYY-MM-DD" (la edad se deriva)
        gender: 'male', // 'male' | 'female'
        height: 180, // cm
        start_weight: 75, // kg
        activity: 'moderate', // 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
        goalType: 'recomp', // 'cut' | 'bulk' | 'recomp' | 'maintain' (usado por useMacros)
        goal: 'Recomposición Corporal Estética', // descripción libre, sólo para mostrar
        deadline: '2026-06-01',
    },
    priorities: ['Reducción perímetro cintura', 'Aumento anchura hombros/dorsales (V-Shape)', 'Mantener masa muscular'],
    phases: [
        {
            id: 1,
            name: 'Recomposición',
            monthLabel: 'Ene - Mar',
            dates: { start: '2026-01-22', end: '2026-03-31' },
            focus: 'Fuerza Base + Hipertrofia',
            cardio: '10k pasos/día (NEAT)',
            target_weight: '74.0 - 74.5 kg',
            nutrition_adjustment: 'Carbohidratos solo Desayuno y Post-Entreno.',
        },
        {
            id: 2,
            name: 'Intensificación',
            monthLabel: 'Abril',
            dates: { start: '2026-04-01', end: '2026-04-30' },
            focus: 'Densidad (Superseries)',
            cardio: 'Pasos + 1 HIIT semanal',
            target_weight: '72.5 - 73.0 kg',
            nutrition_adjustment: 'Días descanso: Sin carbos en desayuno/comida.',
        },
        {
            id: 3,
            name: 'Definición',
            monthLabel: 'May - Jun',
            dates: { start: '2026-05-01', end: '2026-06-01' },
            focus: 'Corte Metabólico + Cardio',
            cardio: 'Pasos + 20min Cardio LISS Post-Entreno',
            target_weight: '71.0 - 71.5 kg',
            nutrition_adjustment: 'Reducción arroz post-entreno a 50g. Sin frutos secos.',
        },
    ],
    schedule: {
        default: [
            { time: '07:15', type: 'meal', id: 'breakfast', label: 'Desayuno' },
            { time: '10:30', type: 'meal', id: 'snack1', label: 'Snack Mañana' },
            { time: '13:00', type: 'training', id: 'workout', label: 'Entrenamiento' },
            { time: '14:30', type: 'meal', id: 'lunch', label: 'Comida (Post-Entreno)' },
            { time: '18:00', type: 'meal', id: 'snack2', label: 'Merienda' },
            { time: '21:00', type: 'meal', id: 'dinner', label: 'Cena' },
        ],
    },
    meals: {
        breakfast: {
            goal: 'Carga de Energía. Grasas y CH complejos.',
            macros: 'High Carb / High Protein',
            selectedOptionIndex: 0,
            options: [
                {
                    id: 1,
                    name: 'Opción 1',
                    items: [
                        { foodId: 'egg', name: 'Huevo Entero', category: 'protein', quantity: '2', unit: 'pz' },
                        {
                            foodId: 'egg_whites',
                            name: 'Claras de Huevo',
                            category: 'protein',
                            quantity: '100',
                            unit: 'ml',
                        },
                        { foodId: 'oats', name: 'Avena', category: 'carbs', quantity: '60', unit: 'g' },
                        { foodId: 'kiwi', name: 'Kiwi', category: 'fruit', quantity: '1', unit: 'pz' },
                    ],
                    note: '',
                },
            ],
        },
        snack1: {
            goal: 'Pre-Entreno Ligero. Rápida digestión.',
            macros: 'Mod Carb / High Protein',
            selectedOptionIndex: 0,
            options: [
                {
                    id: 1,
                    name: 'Opción 1',
                    items: [
                        { foodId: 'apple', name: 'Manzana', category: 'fruit', quantity: '1', unit: 'pz' },
                        {
                            foodId: 'whey_protein',
                            name: 'Whey Protein',
                            category: 'protein',
                            quantity: '30',
                            unit: 'g',
                        },
                    ],
                    note: '',
                },
            ],
        },
        lunch: {
            goal: 'Ventana Anabólica. 60% CH diarios.',
            macros: 'High Carb / High Protein / Low Fat',
            note: 'Días de descanso: Reducir arroz a 40g.',
            selectedOptionIndex: 0,
            options: [
                {
                    id: 1,
                    name: 'Opción 1',
                    items: [
                        {
                            foodId: 'chicken_breast',
                            name: 'Pechuga de Pollo',
                            category: 'protein',
                            quantity: '150',
                            unit: 'g',
                        },
                        {
                            foodId: 'rice_white_raw',
                            name: 'Arroz (Crudo)',
                            category: 'carbs',
                            quantity: '80',
                            unit: 'g',
                        },
                        { foodId: 'broccoli', name: 'Brócoli', category: 'veggies', quantity: '150', unit: 'g' },
                    ],
                    note: '',
                },
            ],
        },
        snack2: {
            goal: 'Control de Apetito. Grasas y proteínas.',
            macros: 'Low Carb / High Fat / High Protein',
            selectedOptionIndex: 0,
            options: [
                {
                    id: 1,
                    name: 'Opción 1',
                    items: [
                        { foodId: 'walnuts', name: 'Nueces', category: 'fat', quantity: '30', unit: 'g' },
                        {
                            foodId: 'yogurt_greek',
                            name: 'Yogur Griego',
                            category: 'protein',
                            quantity: '150',
                            unit: 'g',
                        },
                    ],
                    note: '',
                },
            ],
        },
        dinner: {
            goal: 'Quema-Grasas Nocturna.',
            macros: 'Zero Carb / High Protein / Mod Fat',
            selectedOptionIndex: 0,
            options: [
                {
                    id: 1,
                    name: 'Opción 1',
                    items: [
                        {
                            foodId: 'white_fish',
                            name: 'Pescado Blanco',
                            category: 'protein',
                            quantity: '175',
                            unit: 'g',
                        },
                        {
                            foodId: 'salad_mix',
                            name: 'Mezcla Ensalada',
                            category: 'veggies',
                            quantity: '150',
                            unit: 'g',
                        },
                        {
                            foodId: 'olive_oil',
                            name: 'Aceite de Oliva (AOVE)',
                            category: 'fat',
                            quantity: '10',
                            unit: 'ml',
                        },
                    ],
                    note: '',
                },
            ],
        },
    },
    routines: {
        // Phase 1: Recomposición
        1: {
            1: {
                // Monday
                label: 'Torso Fuerza',
                focus: 'Mover kilos y ganar fuerza real',
                exercises: [
                    {
                        name: 'Press Banca Barra',
                        sets: 3,
                        reps: '6-8',
                        rest: '2-3m',
                        note: 'Explosivo al subir',
                        gifUrl: benchPressImg,
                    },
                    {
                        name: 'Dominadas',
                        sets: 3,
                        reps: 'Al fallo',
                        rest: '2m',
                        note: '+10 reps -> lastre',
                        gifUrl: pullUpImg,
                    },
                    {
                        name: 'Press Militar',
                        sets: 3,
                        reps: '8-10',
                        rest: '2m',
                        note: 'Rango completo',
                        gifUrl: overheadPressImg,
                    },
                    {
                        name: 'Remo Barra',
                        sets: 3,
                        reps: '8-10',
                        rest: '90s',
                        note: 'Espalda paralela suelo',
                        gifUrl: deadliftImg,
                    }, // Using DL as proxy for row for now
                    {
                        name: 'Elevaciones Laterales',
                        sets: 4,
                        reps: '12-15',
                        rest: '60s',
                        note: 'Controlar bajada',
                        gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGZ2YnN1bDNwM3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6/3o7TKr3nzbh5qt1kkw/giphy.gif',
                    },
                ],
            },
            2: {
                // Tuesday
                label: 'Pierna Cimientos',
                focus: 'Desarrollo general pierna',
                exercises: [
                    { name: 'Sentadilla Barra', sets: 3, reps: '6-8', rest: '3m', note: 'Profunda', gifUrl: squatImg },
                    {
                        name: 'Peso Muerto Rumano',
                        sets: 3,
                        reps: '8-10',
                        rest: '2m',
                        note: 'Sentir isquios',
                        gifUrl: deadliftImg,
                    },
                    { name: 'Prensa/Zancadas', sets: 3, reps: '10-12', rest: '90s', note: '', gifUrl: squatImg }, // Using Squat as proxy
                    {
                        name: 'Curl Femoral',
                        sets: 3,
                        reps: '12-15',
                        rest: '60s',
                        note: 'Contracción fuerte',
                        gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGZ2YnN1bDNwM3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6/3o7TKr3nzbh5qt1kkw/giphy.gif',
                    },
                    {
                        name: 'Gemelos',
                        sets: 4,
                        reps: '15-20',
                        rest: '45s',
                        note: 'Aguantar 1s arriba',
                        gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGZ2YnN1bDNwM3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6/3o7TKr3nzbh5qt1kkw/giphy.gif',
                    },
                    {
                        name: 'Plancha Abdominal',
                        sets: 3,
                        reps: '45s',
                        rest: '30s',
                        note: 'Tensión constante',
                        gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGZ2YnN1bDNwM3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6/3o7TKr3nzbh5qt1kkw/giphy.gif',
                    },
                ],
            },
            3: {
                // Wednesday
                label: 'Descanso Activo',
                focus: 'Caminar 10k pasos. Reducir hidratos.',
                exercises: [],
            },
            4: {
                // Thursday
                label: 'Torso Hipertrofia',
                focus: 'Bombeo y estética 3D',
                exercises: [
                    {
                        name: 'Press Inclinado Manc.',
                        sets: 3,
                        reps: '10-12',
                        rest: '90s',
                        note: 'Pecho alto',
                        gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGZ2YnN1bDNwM3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6/3o7TKr3nzbh5qt1kkw/giphy.gif',
                    },
                    {
                        name: 'Jalón al Pecho',
                        sets: 3,
                        reps: '10-12',
                        rest: '90s',
                        note: 'Agarre ancho',
                        gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGZ2YnN1bDNwM3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6/3o7TKr3nzbh5qt1kkw/giphy.gif',
                    },
                    {
                        name: 'Remo Polea/Manc.',
                        sets: 3,
                        reps: '12',
                        rest: '60s',
                        note: '',
                        gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGZ2YnN1bDNwM3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6/3o7TKr3nzbh5qt1kkw/giphy.gif',
                    },
                    {
                        name: 'Face Pulls',
                        sets: 4,
                        reps: '15-20',
                        rest: '45s',
                        note: 'Postura',
                        gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGZ2YnN1bDNwM3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6/3o7TKr3nzbh5qt1kkw/giphy.gif',
                    },
                    {
                        name: 'Elev. Laterales',
                        sets: 4,
                        reps: '15-20',
                        rest: '45s',
                        note: 'Volumen lateral',
                        gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGZ2YnN1bDNwM3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6/3o7TKr3nzbh5qt1kkw/giphy.gif',
                    },
                    {
                        name: 'Fondos Paralelas',
                        sets: 3,
                        reps: 'Fallo',
                        rest: '90s',
                        note: 'Inclinado adelante',
                        gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGZ2YnN1bDNwM3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6/3o7TKr3nzbh5qt1kkw/giphy.gif',
                    },
                ],
            },
            5: {
                // Friday
                label: 'Pierna + Brazos',
                focus: 'Detalle y Brazos',
                exercises: [
                    {
                        name: 'Sentadilla Búlgara',
                        sets: 3,
                        reps: '10/leg',
                        rest: '90s',
                        note: 'Unilateral',
                        gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGZ2YnN1bDNwM3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6/3o7TKr3nzbh5qt1kkw/giphy.gif',
                    },
                    {
                        name: 'Extensión Cuádriceps',
                        sets: 3,
                        reps: '15',
                        rest: '60s',
                        note: 'Quemazón',
                        gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGZ2YnN1bDNwM3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6/3o7TKr3nzbh5qt1kkw/giphy.gif',
                    },
                    {
                        name: 'Curl Bíceps Barra',
                        sets: 3,
                        reps: '10-12',
                        rest: '60s',
                        note: 'Estricto',
                        gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGZ2YnN1bDNwM3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6/3o7TKr3nzbh5qt1kkw/giphy.gif',
                    },
                    {
                        name: 'Press Francés/Polea',
                        sets: 3,
                        reps: '10-12',
                        rest: '60s',
                        note: '',
                        gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGZ2YnN1bDNwM3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6/3o7TKr3nzbh5qt1kkw/giphy.gif',
                    },
                    {
                        name: 'Elev. Piernas',
                        sets: 3,
                        reps: '12-15',
                        rest: '45s',
                        note: 'Colgado',
                        gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGZ2YnN1bDNwM3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6c3Z6/3o7TKr3nzbh5qt1kkw/giphy.gif',
                    },
                ],
            },
            6: { label: 'Descanso', exercises: [] },
            0: { label: 'Descanso', exercises: [] },
        },
        // Phase 2: Intensificación (Superseries)
        2: {
            1: {
                // Mon
                label: 'Torso Ritmo Alto',
                focus: 'Superseries A1+A2',
                exercises: [
                    { name: 'A1. Press Banca', sets: 3, reps: '8-10', rest: '0', note: 'Pecho' },
                    { name: 'A2. Remo Barra', sets: 3, reps: '10', rest: '90s', note: 'Espalda' },
                    { name: 'B1. Press Militar', sets: 3, reps: '10-12', rest: '0', note: 'Hombro' },
                    { name: 'B2. Dominadas', sets: 3, reps: 'Fallo', rest: '90s', note: 'Espalda' },
                    { name: 'C1. Elev. Laterales', sets: 4, reps: '15', rest: '0', note: 'Lateral' },
                    { name: 'C2. Face Pulls', sets: 4, reps: '15', rest: '90s', note: 'Posterior' },
                ],
            },
            2: {
                // Tue - Pierna Volumen
                label: 'Pierna Volumen',
                focus: 'Descansos normales',
                exercises: [
                    { name: 'Sentadilla', sets: 4, reps: '8-10', rest: '2m', note: 'Sube 1 serie' },
                    { name: 'Prensa Inclinada', sets: 3, reps: '12-15', rest: '90s', note: 'Pies juntos' },
                    { name: 'Peso Muerto Rumano', sets: 4, reps: '10-12', rest: '2m', note: 'Control bajada' },
                    { name: 'Zancadas', sets: 3, reps: '20 pasos', rest: '90s', note: 'Quemazón total' },
                    { name: 'Plancha', sets: 4, reps: '1 min', rest: '60s', note: '' },
                ],
            },
            3: { label: 'Descanso (Low Carb)', exercises: [] },
            4: {
                // Thu
                label: 'Torso Bombeo',
                focus: 'Superseries',
                exercises: [
                    { name: 'A1. Press Inclinado', sets: 3, reps: '12', rest: '0', note: 'Pecho Sup' },
                    { name: 'A2. Jalón Pecho', sets: 3, reps: '12', rest: '90s', note: 'Espalda' },
                    { name: 'B1. Fondos', sets: 3, reps: 'Fallo', rest: '0', note: 'Tríceps' },
                    { name: 'B2. Curl Bíceps', sets: 3, reps: '12', rest: '90s', note: '' },
                    { name: 'C1. Elev. Laterales', sets: 5, reps: '15-20', rest: '60s', note: '5 Series!' },
                ],
            },
            5: {
                // Fri
                label: 'Torso Intensificación',
                focus: 'Superseries A1+A2 / B1+B2',
                exercises: [
                    { name: 'A1. Press Inclinado Manc.', sets: 3, reps: '12', rest: '0', note: 'Pecho Superior' },
                    { name: 'A2. Jalón al Pecho', sets: 3, reps: '12', rest: '90s', note: 'Espalda Ancha' },
                    { name: 'B1. Fondos en Paralelas', sets: 3, reps: 'Fallo', rest: '0', note: 'Tríceps/Pecho' },
                    { name: 'B2. Curl Bíceps Barra', sets: 3, reps: '12', rest: '90s', note: 'Bíceps' },
                    {
                        name: 'C1. Elevaciones Laterales',
                        sets: 5,
                        reps: '15-20',
                        rest: '60s',
                        note: '¡5 series! Foco en anchura',
                    },
                ],
            },
            6: { label: 'Descanso (Low Carb)', exercises: [] },
            0: { label: 'Descanso (Low Carb)', exercises: [] },
        },
        // Phase 3: Definición
        3: {
            1: {
                // Mon
                label: 'Torso + Cardio',
                focus: 'Dropsets en última serie + 20min Cardio',
                exercises: [
                    { name: 'Press Banca', sets: 3, reps: '6-8', rest: '2m', note: 'Ultima: Drop set 30%' },
                    { name: 'Dominadas', sets: 3, reps: 'Fallo', rest: '2m', note: '' },
                    { name: 'Press Militar', sets: 3, reps: '8-10', rest: '2m', note: 'Ultima: Drop set' },
                    { name: 'Elev. Laterales', sets: 4, reps: '15-20', rest: '30s', note: 'Descanso corto' },
                    { name: 'CARDIO LISS', sets: '20 min', reps: 'Cinta/Elíp', rest: '', note: 'Obligatorio' },
                ],
            },
            2: {
                // Tue
                label: 'Pierna + Cardio',
                focus: 'Glúteo/Femoral + 20min Cardio',
                exercises: [
                    { name: 'Peso Muerto Rumano', sets: 4, reps: '8-10', rest: '2m', note: 'Pesado' },
                    { name: 'Prensa', sets: 3, reps: '15-20', rest: '90s', note: 'Vaciar glucógeno' },
                    { name: 'Curl Femoral', sets: 4, reps: '12-15', rest: '60s', note: 'Ultima: Drop Set' },
                    { name: 'Gemelos', sets: 4, reps: '15-20', rest: '45s', note: '' },
                    { name: 'Elev. Piernas', sets: 4, reps: '15', rest: '45s', note: 'Abdomen bajo' },
                    { name: 'CARDIO LISS', sets: '20 min', reps: 'Cinta/Elíp', rest: '', note: 'Obligatorio' },
                ],
            },
            3: { label: 'Descanso', exercises: [] },
            4: {
                // Thu
                label: 'Torso Circuito',
                focus: 'Circuito Metabólico (3-4 vueltas) + 20min Cardio',
                exercises: [
                    {
                        name: 'Circuito: Press Inc + Remo + Laterales + Flexiones + FacePull',
                        sets: '3-4',
                        reps: '12-15',
                        rest: '2m final',
                        note: 'Sin descanso entre ej.',
                    },
                    { name: 'CARDIO LISS', sets: '20 min', reps: '', rest: '', note: 'Obligatorio' },
                ],
            },
            5: {
                // Fri
                label: 'Pierna + Brazo + Cardio',
                focus: 'Mismo Fase 1 + Cardio',
                exercises: [
                    { name: 'Rutina Viernes Fase 1', sets: '-', reps: '-', rest: '-', note: 'Ver Fase 1' },
                    { name: 'CARDIO LISS', sets: '20 min', reps: '', rest: '', note: 'Obligatorio' },
                ],
            },
            6: { label: 'Descanso', exercises: [] },
            0: { label: 'Descanso', exercises: [] },
        },
    },
};
