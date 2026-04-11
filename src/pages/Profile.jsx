import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePlan } from '../hooks/usePlan';
import { calculateAge } from '../hooks/useMacros';
import {
    User,
    Save,
    Cake,
    Ruler,
    Activity,
    Target,
    Flag,
    LogOut,
    Mail,
    Shield,
    Link2,
    Loader2,
    Info,
} from 'lucide-react';
import { linkWithCredential, linkWithPopup, EmailAuthProvider, GoogleAuthProvider } from 'firebase/auth';
import { useToast } from '../components/Toast';

const GENDERS = [
    { value: 'male', label: 'Hombre' },
    { value: 'female', label: 'Mujer' },
];

const ACTIVITY_LEVELS = [
    { value: 'sedentary', label: 'Sedentario', desc: 'Sin ejercicio o muy poco' },
    { value: 'light', label: 'Ligero', desc: '1-3 días/semana' },
    { value: 'moderate', label: 'Moderado', desc: '3-5 días/semana' },
    { value: 'active', label: 'Activo', desc: '6-7 días/semana' },
    { value: 'very_active', label: 'Muy activo', desc: 'Doble sesión / trabajo físico' },
];

const GOAL_TYPES = [
    { value: 'cut', label: 'Definición', desc: 'Déficit calórico' },
    { value: 'recomp', label: 'Recomposición', desc: 'Déficit ligero' },
    { value: 'maintain', label: 'Mantenimiento', desc: 'Calorías de mantenimiento' },
    { value: 'bulk', label: 'Volumen', desc: 'Superávit calórico' },
];

export default function Profile() {
    const { plan, updateUser, authUser, signOut } = usePlan();
    const user = plan.user || {};

    const [form, setForm] = useState({
        name: user.name || '',
        birthday: user.birthday || '',
        gender: user.gender || 'male',
        height: user.height || '',
        activity: user.activity || 'moderate',
        goalType: user.goalType || 'recomp',
        goal: user.goal || '',
        deadline: user.deadline || '',
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
            deadline: user.deadline || '',
        });
    }, [user.name, user.birthday, user.gender, user.height, user.activity, user.goalType, user.goal, user.deadline]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const [savedFlash, setSavedFlash] = useState(false);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
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
            deadline: form.deadline,
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
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                    />
                </Field>

                <Field label="Fecha de nacimiento" icon={<Cake size={14} />}>
                    <input
                        type="date"
                        value={form.birthday}
                        onChange={(e) => handleChange('birthday', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                    />
                    {derivedAge != null && <p className="text-xs text-slate-500 mt-1 font-mono">{derivedAge} años</p>}
                </Field>

                <Field label="Sexo">
                    <div className="grid grid-cols-2 gap-2">
                        {GENDERS.map((g) => (
                            <button
                                key={g.value}
                                onClick={() => handleChange('gender', g.value)}
                                className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                                    form.gender === g.value
                                        ? 'bg-blue-600 border-blue-500 text-white'
                                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                                }`}
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
                        onChange={(e) => handleChange('height', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                    />
                </Field>
            </Section>

            {/* Actividad */}
            <Section title="Nivel de actividad" icon={<Activity size={14} />}>
                <div className="space-y-2">
                    {ACTIVITY_LEVELS.map((a) => (
                        <button
                            key={a.value}
                            onClick={() => handleChange('activity', a.value)}
                            className={`w-full text-left p-3 rounded-xl border transition-all ${
                                form.activity === a.value
                                    ? 'bg-emerald-900/20 border-emerald-600 text-white'
                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
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
                    {GOAL_TYPES.map((g) => (
                        <button
                            key={g.value}
                            onClick={() => handleChange('goalType', g.value)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                                form.goalType === g.value
                                    ? 'bg-amber-900/20 border-amber-600 text-white'
                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
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
                        onChange={(e) => handleChange('goal', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-amber-500 resize-none"
                        placeholder="Ej. Recomposición corporal estética"
                    />
                </Field>

                <Field label="Fecha límite" icon={<Flag size={14} />}>
                    <input
                        type="date"
                        value={form.deadline}
                        onChange={(e) => handleChange('deadline', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-amber-500"
                    />
                </Field>
            </Section>

            {/* Save */}
            <button
                onClick={handleSave}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    savedFlash ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
            >
                <Save size={16} />
                {savedFlash ? '¡Guardado!' : 'Guardar Cambios'}
            </button>

            {/* Cuenta */}
            <AccountSection authUser={authUser} signOut={signOut} />

            {/* Acerca de */}
            <Link
                to="/about"
                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-colors"
            >
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Info size={16} /> Acerca de TrainEat
                </div>
                <span className="text-xs text-slate-600">v1.0.0</span>
            </Link>
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

function AccountSection({ authUser, signOut }) {
    const toast = useToast();
    const [linkEmail, setLinkEmail] = useState('');
    const [linkPw, setLinkPw] = useState('');
    const [linking, setLinking] = useState(false);
    const [showLinkForm, setShowLinkForm] = useState(false);

    const isAnonymous = authUser?.isAnonymous;

    const handleLinkGoogle = async () => {
        setLinking(true);
        try {
            await linkWithPopup(authUser, new GoogleAuthProvider());
            toast.success('Cuenta vinculada con Google');
        } catch (err) {
            if (err.code === 'auth/credential-already-in-use') {
                toast.error('Esa cuenta de Google ya está vinculada a otro usuario');
            } else if (err.code !== 'auth/popup-closed-by-user') {
                toast.error('Error al vincular: ' + (err.message || err.code));
            }
        } finally {
            setLinking(false);
        }
    };

    const handleLinkEmail = async (e) => {
        e.preventDefault();
        if (!linkEmail || !linkPw) return;
        setLinking(true);
        try {
            const credential = EmailAuthProvider.credential(linkEmail, linkPw);
            await linkWithCredential(authUser, credential);
            toast.success('Cuenta vinculada con email');
            setShowLinkForm(false);
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                toast.error('Ese email ya está registrado');
            } else if (err.code === 'auth/weak-password') {
                toast.error('La contraseña debe tener al menos 6 caracteres');
            } else {
                toast.error('Error al vincular: ' + (err.message || err.code));
            }
        } finally {
            setLinking(false);
        }
    };

    return (
        <Section title="Mi Cuenta" icon={<Shield size={14} />}>
            {authUser && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Mail size={14} className="text-slate-500" />
                        <span>{authUser.email || (isAnonymous ? 'Cuenta anónima (sin email)' : 'Sin email')}</span>
                    </div>

                    {isAnonymous && (
                        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 space-y-3">
                            <p className="text-xs text-amber-300">
                                Tu cuenta es anónima. Vincula un email o Google para no perder tus datos si cierras
                                sesión.
                            </p>
                            <button
                                onClick={handleLinkGoogle}
                                disabled={linking}
                                className="w-full py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {linking ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                                Vincular con Google
                            </button>
                            {!showLinkForm ? (
                                <button
                                    onClick={() => setShowLinkForm(true)}
                                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                                >
                                    <Mail size={14} /> Vincular con email
                                </button>
                            ) : (
                                <form onSubmit={handleLinkEmail} className="space-y-2">
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        value={linkEmail}
                                        onChange={(e) => setLinkEmail(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none focus:border-blue-500"
                                        required
                                    />
                                    <input
                                        type="password"
                                        placeholder="Contraseña (min 6 chars)"
                                        value={linkPw}
                                        onChange={(e) => setLinkPw(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none focus:border-blue-500"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={linking}
                                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {linking && <Loader2 size={14} className="animate-spin" />} Vincular
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            )}
            <button
                onClick={signOut}
                className="w-full py-2.5 bg-rose-950 hover:bg-rose-900 border border-rose-800/50 text-rose-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 mt-2"
            >
                <LogOut size={14} /> Cerrar sesión
            </button>
        </Section>
    );
}
