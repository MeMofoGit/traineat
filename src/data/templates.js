import benchPressImg from '../assets/exercises/bench_press.jpg';
import squatImg from '../assets/exercises/squat.jpg';
import deadliftImg from '../assets/exercises/deadlift.jpg';
import overheadPressImg from '../assets/exercises/overhead_press.jpg';
import pullUpImg from '../assets/exercises/pull_up.jpg';

export const EXERCISE_TEMPLATES = [
    { category: "Pecho", name: "Press Banca Barra", sets: 3, reps: "6-8", rest: "2-3m", gifUrl: benchPressImg },
    { category: "Pecho", name: "Press Inclinado Mancuernas", sets: 3, reps: "8-10", rest: "90s", gifUrl: benchPressImg },
    { category: "Pecho", name: "Aperturas / Cruces", sets: 3, reps: "12-15", rest: "60s", gifUrl: benchPressImg },
    { category: "Espalda", name: "Dominadas", sets: 3, reps: "Fallo", rest: "2m", gifUrl: pullUpImg },
    { category: "Espalda", name: "Remo con Barra", sets: 3, reps: "8-10", rest: "90s", gifUrl: deadliftImg },
    { category: "Espalda", name: "Jalón al Pecho", sets: 3, reps: "10-12", rest: "90s", gifUrl: pullUpImg },
    { category: "Hombro", name: "Press Militar", sets: 3, reps: "8-10", rest: "2m", gifUrl: overheadPressImg },
    { category: "Hombro", name: "Elevaciones Laterales", sets: 4, reps: "15-20", rest: "60s", gifUrl: overheadPressImg },
    { category: "Hombro", name: "Face Pulls", sets: 4, reps: "15-20", rest: "60s", gifUrl: overheadPressImg },
    { category: "Pierna", name: "Sentadilla", sets: 3, reps: "6-8", rest: "3m", gifUrl: squatImg },
    { category: "Pierna", name: "Peso Muerto Rumano", sets: 3, reps: "8-10", rest: "2m", gifUrl: deadliftImg },
    { category: "Pierna", name: "Prensa", sets: 3, reps: "10-12", rest: "90s", gifUrl: squatImg },
    { category: "Pierna", name: "Extension Cuádriceps", sets: 3, reps: "15", rest: "60s", gifUrl: squatImg },
    { category: "Brazos", name: "Curl Bíceps Barra", sets: 3, reps: "10-12", rest: "60s", gifUrl: benchPressImg },
    { category: "Brazos", name: "Press Francés", sets: 3, reps: "10-12", rest: "60s", gifUrl: benchPressImg },
    { category: "Core", name: "Plancha Abdominal", sets: 3, reps: "60s", rest: "60s", gifUrl: benchPressImg },
    { category: "Core", name: "Crunch en Polea", sets: 3, reps: "15-20", rest: "60s", gifUrl: benchPressImg },
    { category: "Core", name: "Elevación de Piernas", sets: 3, reps: "12-15", rest: "60s", gifUrl: benchPressImg },
    { category: "Cardio", name: "Cinta Inclinada", sets: "20 min", reps: "-", rest: "-", gifUrl: benchPressImg },
    { category: "Cardio", name: "Elíptica", sets: "20 min", reps: "-", rest: "-", gifUrl: benchPressImg },
];
