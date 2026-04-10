import React, { useState, useEffect } from 'react';
import { usePlan } from '../hooks/usePlan';
import { calculateAge } from '../hooks/useMacros';
import { User, Save, Cake, Ruler, Activity, Target, Flag } from 'lucide-react';

const GENDERS = [
    { value: 'male', label: 'Hombre' },
    { value: 'female', label: 'Mujer' }
];

const ACTIVITY_LEVELS = [
    { value: 'sedentary', label: 'Sedentario', desc: 'Sin ejercicio o muy poco' },
    { value: 'light', label: 'Ligero', desc: '1-3 días/semana' },
    { value: 'moderate', label: 'Moderado', desc: '3-5 días/semana' },
    { value: 'active', label: 'Activo', desc: '6-7 días/semana' },
    { value: 'very_active', label: 'Muy activo', desc: 'Doble sesión / trabajo físico' }
];

const GOAL_TYPES = [
    { value: 'cut', label: 'Definición', desc: 'Déficit calórico' },
    { value: 'recomp', label: 'Recomposición', desc: 'Déficit ligero' },
    { value: 'maintain', label: 'Mantenimiento', desc: 'Calorías de mantenimiento' },
    { value: 'bulk', label: 'Volumen', desc: 'Superávit calórico' }
];

export default function Profile() {
    const { plan, updateUser } = usePlan();
    const user = plan.user || {};

    const [form, setForm] = useState({
        name: user.name || '',
        birthday: user.birthday || '',
        gender: user.gender || 'male',
        height: user.height || '',
        activity: user.activity || 'moderate',
        goalType: user.goalType || 'recomp',
        goal: user.goal || '',
        deadline: user.deadline || ''
    });

    // Re-sync form cuando el plan se carga de Firestore (puede ser async tras mount).
    // setState en effect intencional: sincronización externa → estado local.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        setForm({
            name: user.name || '',
            birthday: user.birthday || '',
            gender: user.gender || 'male',
            height: user.height || '',
            activity: user.activity || 'moderate',
            goalType: user.goalType || 'recomp',
            goal: user.goal || '',
            deadline: user.deadline || ''
        });
    }, [user.name, user.birthday, user.gender, user.height, user.activity, user.goalType, user.goal, user.deadline]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const [savedFlash, setSavedFlash] = useState(false);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        updateUser({
            name: form.name.trim(),
            birthday: form.birthday,
            gender: form.gender,
            height: form.height ? parseFloat(form.height) : undefined,
            activity: form.activity,
            goalType: form.goalType,
            goal: form.goal.trim(),
            deadline: form.deadline
        });
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1500);
    };

    const derivedAge = calculateAge(form.birthday);

    return (
        <div className="p-6 space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center gap-3">
                <div className="bg-blue-900/30 p-3 rounded-2xl text-blue-400">
                    <User size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Mis Datos</h1>
                    <p className="text-xs text-slate-400">Información personal y objetivos</p>
                </div>
            </header>

            {/* Identidad */}
            <Section title="Identidad">
                <Field label="Nombre">
                    <input
                        type="text"
                        value={form.name}
                        onChange={e => handleChange('name', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                    />
                </Field>

                <Field label="Fecha de nacimiento" icon={<Cake size={14} />}>
                    <input
                        type="date"
                        value={form.birthday}
                        onChange={e => handleChange('birthday', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                    />
                    {derivedAge != null && (
                        <p className="text-xs text-slate-500 mt-1 font-mono">{derivedAge} años</p>
                    )}
                </Field>

                <Field label="Sexo">
                    <div className="grid grid-cols-2 gap-2">
                        {GENDERS.map(g => (
                            <button
                                key={g.value}
                                onClick={() => handleChange('gender', g.value)}
                                className={`py-2 rounded-lg text-sm font-bold border transition-all ${form.gender === g.value
                                    ? 'bg-blue-600 border-blue-500 text-white'
                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>
                </Field>
            </Section>

            {/* Físico */}
            <Section title="Físico">
                <Field label="Altura (cm)" icon={<Ruler size={14} />}>
                    <input
                        type="number"
                        value={form.height}
                        onChange={e => handleChange('height', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                    />
                </Field>
            </Section>

            {/* Actividad */}
            <Section title="Nivel de actividad" icon={<Activity size={14} />}>
                <div className="space-y-2">
                    {ACTIVITY_LEVELS.map(a => (
                        <button
                            key={a.value}
                            onClick={() => handleChange('activity', a.value)}
                            className={`w-full text-left p-3 rounded-xl border transition-all ${form.activity === a.value
                                ? 'bg-emerald-900/20 border-emerald-600 text-white'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                        >
                            <div className="text-sm font-bold">{a.label}</div>
                            <div className="text-xs text-slate-500">{a.desc}</div>
                        </button>
                    ))}
                </div>
            </Section>

            {/* Objetivo */}
            <Section title="Objetivo" icon={<Target size={14} />}>
                <div className="grid grid-cols-2 gap-2">
                    {GOAL_TYPES.map(g => (
                        <button
                            key={g.value}
                            onClick={() => handleChange('goalType', g.value)}
                            className={`p-3 rounded-xl border text-left transition-all ${form.goalType === g.value
                                ? 'bg-amber-900/20 border-amber-600 text-white'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                        >
                            <div className="text-sm font-bold">{g.label}</div>
                            <div className="text-[10px] text-slate-500">{g.desc}</div>
                        </button>
                    ))}
                </div>

                <Field label="Descripción libre">
                    <textarea
                        rows="2"
                        value={form.goal}
                        onChange={e => handleChange('goal', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-amber-500 resize-none"
                        placeholder="Ej. Recomposición corporal estética"
                    />
                </Field>

                <Field label="Fecha límite" icon={<Flag size={14} />}>
                    <input
                        type="date"
                        value={form.deadline}
                        onChange={e => handleChange('deadline', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-amber-500"
                    />
                </Field>
            </Section>

            {/* Save */}
            <button
                onClick={handleSave}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${savedFlash
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
            >
                <Save size={16} />
                {savedFlash ? '¡Guardado!' : 'Guardar Cambios'}
            </button>
        </div>
    );
}

function Section({ title, icon, children }) {
    return (
        <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                {icon}
                {title}
            </h2>
            {children}
        </section>
    );
}

function Field({ label, icon, children }) {
    return (
        <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                {icon}
                {label}
            </label>
            {children}
        </div>
    );
}
