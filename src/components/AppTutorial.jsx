import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ArrowLeft, X, Home, Utensils, Refrigerator, Dumbbell, User, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const STEPS_ES = [
    {
        icon: Home,
        color: 'text-blue-400',
        title: 'Inicio',
        desc: 'Tu panel principal. Aquí ves tu próxima comida, el entrenamiento de hoy, tu progreso semanal y puedes registrar tu peso.',
    },
    {
        icon: Utensils,
        color: 'text-blue-400',
        title: 'Dieta',
        desc: 'Gestiona tus comidas del día. Cada comida puede tener variantes por día de la semana. Puedes confirmar lo que comiste o registrar cambios.',
    },
    {
        icon: Refrigerator,
        color: 'text-cyan-400',
        title: 'Mi Nevera',
        desc: 'Tus productos reales. Escanea códigos de barras o haz fotos de etiquetas para añadirlos. La app los usa para sustituir alimentos genéricos.',
    },
    {
        icon: Dumbbell,
        color: 'text-emerald-400',
        title: 'Entrenamiento',
        desc: 'Tus rutinas por fase. Inicia sesiones, marca series completadas, y controla los tiempos de descanso con el timer integrado.',
    },
    {
        icon: User,
        color: 'text-slate-300',
        title: 'Mis Datos',
        desc: 'Tu perfil, objetivo y cuenta. Desde aquí puedes compartir tu dieta con un nutricionista, cambiar idioma o exportar tus datos.',
    },
    {
        icon: Sparkles,
        color: 'text-amber-400',
        title: '¡Listo!',
        desc: 'La app calcula tus macros según tu fase (volumen, definición, recomp...) y ajusta automáticamente las comidas. ¡Empieza explorando tu Dashboard!',
    },
];

const STEPS_EN = [
    {
        icon: Home,
        color: 'text-blue-400',
        title: 'Home',
        desc: "Your main panel. See your next meal, today's training, weekly progress, and log your weight.",
    },
    {
        icon: Utensils,
        color: 'text-blue-400',
        title: 'Diet',
        desc: 'Manage your daily meals. Each meal can have variants per day of the week. Confirm what you ate or log changes.',
    },
    {
        icon: Refrigerator,
        color: 'text-cyan-400',
        title: 'My Fridge',
        desc: 'Your real products. Scan barcodes or take photos of labels to add them. The app uses them to replace generic foods.',
    },
    {
        icon: Dumbbell,
        color: 'text-emerald-400',
        title: 'Training',
        desc: 'Your routines by phase. Start sessions, mark completed sets, and track rest times with the built-in timer.',
    },
    {
        icon: User,
        color: 'text-slate-300',
        title: 'My Profile',
        desc: 'Your profile, goals, and account. Share your diet with a nutritionist, change language, or export your data.',
    },
    {
        icon: Sparkles,
        color: 'text-amber-400',
        title: 'Ready!',
        desc: 'The app calculates your macros based on your phase (bulk, cut, recomp...) and automatically adjusts meals. Start by exploring your Dashboard!',
    },
];

export default function AppTutorial({ onFinish }) {
    const { i18n } = useTranslation();
    const isEn = i18n.language === 'en';
    const steps = isEn ? STEPS_EN : STEPS_ES;
    const [step, setStep] = useState(0);

    const isLast = step === steps.length - 1;
    const current = steps[step];
    const Icon = current.icon;

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-950/95 flex flex-col">
            {/* Skip */}
            <div className="flex justify-end p-4">
                <button
                    onClick={onFinish}
                    className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                >
                    <X size={14} /> {isEn ? 'Skip tutorial' : 'Saltar tutorial'}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center px-8">
                <div className="text-center max-w-sm space-y-6">
                    <div
                        className={`mx-auto w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center ${current.color}`}
                    >
                        <Icon size={36} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">{current.title}</h2>
                        <p className="text-sm text-slate-400 leading-relaxed">{current.desc}</p>
                    </div>
                </div>
            </div>

            {/* Progress + navigation */}
            <div className="p-6 space-y-4">
                {/* Dots */}
                <div className="flex justify-center gap-2">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-blue-500 w-6' : i < step ? 'bg-blue-800' : 'bg-slate-700'}`}
                        />
                    ))}
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    {step > 0 && (
                        <button
                            onClick={() => setStep((s) => s - 1)}
                            className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <button
                        onClick={() => (isLast ? onFinish() : setStep((s) => s + 1))}
                        className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                        {isLast ? (isEn ? "Let's go!" : '¡Empezar!') : isEn ? 'Next' : 'Siguiente'}{' '}
                        {!isLast && <ArrowRight size={18} />}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
