import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ArrowLeft, Dumbbell, User, Target, Activity, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const GENDERS = [
    { value: 'male', labelKey: 'profile.male', icon: '🧔' },
    { value: 'female', labelKey: 'profile.female', icon: '👩' },
];

const ACTIVITIES = [
    { value: 'sedentary', label: 'Sedentario', labelEn: 'Sedentary' },
    { value: 'light', label: 'Ligero (1-3d/sem)', labelEn: 'Light (1-3d/wk)' },
    { value: 'moderate', label: 'Moderado (3-5d/sem)', labelEn: 'Moderate (3-5d/wk)' },
    { value: 'active', label: 'Activo (6-7d/sem)', labelEn: 'Active (6-7d/wk)' },
    { value: 'very_active', label: 'Muy activo', labelEn: 'Very active' },
];

const GOALS = [
    { value: 'cut', label: 'Definición', labelEn: 'Cut', icon: '🔥', desc: 'Perder grasa', descEn: 'Lose fat' },
    {
        value: 'recomp',
        label: 'Recomposición',
        labelEn: 'Recomp',
        icon: '⚡',
        desc: 'Ganar músculo, perder grasa',
        descEn: 'Gain muscle, lose fat',
    },
    {
        value: 'maintain',
        label: 'Mantenimiento',
        labelEn: 'Maintain',
        icon: '⚖️',
        desc: 'Mantener peso',
        descEn: 'Maintain weight',
    },
    {
        value: 'bulk',
        label: 'Volumen',
        labelEn: 'Bulk',
        icon: '💪',
        desc: 'Ganar masa muscular',
        descEn: 'Gain muscle mass',
    },
];

export default function Onboarding({ onFinish, onSave }) {
    const { t, i18n } = useTranslation();
    const isEn = i18n.language === 'en';
    const [step, setStep] = useState(0);
    const [form, setForm] = useState({
        name: '',
        birthday: '',
        gender: 'male',
        height: '',
        activity: 'moderate',
        goalType: 'recomp',
        emailConsent: false,
    });

    const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

    const steps = [
        // Step 0: Welcome
        () => (
            <div className="text-center space-y-6">
                <Dumbbell size={56} className="text-blue-500 mx-auto" />
                <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                    TrainEat
                </h1>
                <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                    {isEn
                        ? "Your personalized nutrition and training plan. Let's set up your profile in 30 seconds."
                        : 'Tu plan de nutrición y entrenamiento personalizado. Configuremos tu perfil en 30 segundos.'}
                </p>
            </div>
        ),

        // Step 1: Name + Birthday + Gender
        () => (
            <div className="space-y-5">
                <div className="text-center mb-2">
                    <User size={28} className="text-blue-400 mx-auto mb-2" />
                    <h2 className="text-lg font-bold text-white">{isEn ? 'About you' : 'Sobre ti'}</h2>
                </div>
                <div>
                    <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">{t('profile.name')}</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => set('name', e.target.value)}
                        placeholder={isEn ? 'Your name' : 'Tu nombre'}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">
                        {t('profile.birthday')}
                    </label>
                    <input
                        type="date"
                        value={form.birthday}
                        onChange={(e) => set('birthday', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500 [color-scheme:dark]"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">
                        {t('profile.gender')}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {GENDERS.map((g) => (
                            <button
                                key={g.value}
                                onClick={() => set('gender', g.value)}
                                className={`py-3 rounded-xl text-sm font-bold border transition-all ${form.gender === g.value ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                            >
                                {g.icon} {t(g.labelKey)}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">
                        {t('profile.height')}
                    </label>
                    <input
                        type="number"
                        value={form.height}
                        onChange={(e) => set('height', e.target.value)}
                        placeholder="175"
                        inputMode="numeric"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                    />
                </div>
            </div>
        ),

        // Step 2: Activity
        () => (
            <div className="space-y-4">
                <div className="text-center mb-2">
                    <Activity size={28} className="text-emerald-400 mx-auto mb-2" />
                    <h2 className="text-lg font-bold text-white">{t('profile.activity')}</h2>
                </div>
                <div className="space-y-2">
                    {ACTIVITIES.map((a) => (
                        <button
                            key={a.value}
                            onClick={() => set('activity', a.value)}
                            className={`w-full text-left p-3.5 rounded-xl border transition-all ${form.activity === a.value ? 'bg-emerald-900/20 border-emerald-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                        >
                            <div className="text-sm font-bold">{isEn ? a.labelEn : a.label}</div>
                        </button>
                    ))}
                </div>
            </div>
        ),

        // Step 3: Goal
        () => (
            <div className="space-y-4">
                <div className="text-center mb-2">
                    <Target size={28} className="text-amber-400 mx-auto mb-2" />
                    <h2 className="text-lg font-bold text-white">{t('profile.goal')}</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {GOALS.map((g) => (
                        <button
                            key={g.value}
                            onClick={() => set('goalType', g.value)}
                            className={`p-4 rounded-xl border text-left transition-all ${form.goalType === g.value ? 'bg-amber-900/20 border-amber-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                        >
                            <div className="text-2xl mb-1">{g.icon}</div>
                            <div className="text-sm font-bold">{isEn ? g.labelEn : g.label}</div>
                            <div className="text-[10px] text-slate-500">{isEn ? g.descEn : g.desc}</div>
                        </button>
                    ))}
                </div>
                {/* Consentimiento comunicaciones */}
                <label className="flex items-start gap-3 mt-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={form.emailConsent}
                        onChange={(e) => set('emailConsent', e.target.checked)}
                        className="mt-0.5 accent-blue-500"
                    />
                    <span className="text-[11px] text-slate-400 leading-relaxed">
                        {isEn
                            ? 'I agree to receive nutrition tips, updates and product news by email. You can unsubscribe at any time.'
                            : 'Acepto recibir consejos de nutrición, actualizaciones y novedades por email. Puedes darte de baja en cualquier momento.'}
                    </span>
                </label>
            </div>
        ),
    ];

    const isLast = step === steps.length - 1;
    const canNext = step === 0 || (step === 1 && form.name.trim()) || step >= 2;

    const handleNext = () => {
        if (isLast) {
            onSave({
                name: form.name.trim() || 'Atleta',
                birthday: form.birthday,
                gender: form.gender,
                height: form.height ? parseFloat(form.height) : 175,
                activity: form.activity,
                goalType: form.goalType,
                emailConsent: form.emailConsent,
                emailConsentDate: form.emailConsent ? new Date().toISOString() : null,
            });
            onFinish();
        } else {
            setStep((s) => s + 1);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col">
            {/* Progress */}
            <div className="flex gap-1.5 p-4 pt-6">
                {steps.map((_, i) => (
                    <div
                        key={i}
                        className={`flex-1 h-1 rounded-full transition-all ${i <= step ? 'bg-blue-500' : 'bg-slate-800'}`}
                    />
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex items-center">
                <div className="w-full max-w-sm mx-auto">{steps[step]()}</div>
            </div>

            {/* Navigation */}
            <div className="p-6 flex gap-3">
                {step > 0 && (
                    <button
                        onClick={() => setStep((s) => s - 1)}
                        className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700"
                    >
                        <ArrowLeft size={20} />
                    </button>
                )}
                <button
                    onClick={handleNext}
                    disabled={!canNext}
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 transition-colors"
                >
                    {isLast ? (
                        <>
                            <Check size={18} /> {isEn ? "Let's go!" : '¡Empezar!'}
                        </>
                    ) : (
                        <>
                            {isEn ? 'Continue' : 'Continuar'} <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </div>
        </div>,
        document.body
    );
}
