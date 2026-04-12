import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePlan } from '../hooks/usePlan';
import { calculateAge } from '../hooks/useMacros';
import { useTranslation } from 'react-i18next';
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
    Globe,
} from 'lucide-react';
import { linkWithCredential, linkWithPopup, EmailAuthProvider, GoogleAuthProvider } from 'firebase/auth';
import { useToast } from '../components/Toast';
import { createShareToken, listShareTokens, revokeShareToken } from '../services/shareTokens';
import { Share2, Copy, Trash2 as TrashIcon, ExternalLink as LinkIcon } from 'lucide-react';

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
    const { t } = useTranslation();
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
                    <h1 className="text-2xl font-bold text-white">{t('profile.title')}</h1>
                    <p className="text-xs text-slate-400"></p>
                </div>
            </header>

            {/* Identidad */}
            <Section title={t('profile.identity')}>
                <Field label={t('profile.name')}>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                    />
                </Field>

                <Field label={t('profile.birthday')} icon={<Cake size={14} />}>
                    <input
                        type="date"
                        value={form.birthday}
                        onChange={(e) => handleChange('birthday', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                    />
                    {derivedAge != null && <p className="text-xs text-slate-500 mt-1 font-mono">{derivedAge} años</p>}
                </Field>

                <Field label={t('profile.gender')}>
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
            <Section title={t('profile.physical')}>
                <Field label={t('profile.height')} icon={<Ruler size={14} />}>
                    <input
                        type="number"
                        value={form.height}
                        onChange={(e) => handleChange('height', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                    />
                </Field>
            </Section>

            {/* Actividad */}
            <Section title={t('profile.activity')} icon={<Activity size={14} />}>
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
            <Section title={t('profile.goal')} icon={<Target size={14} />}>
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

                <Field label={t('profile.goalDesc')}>
                    <textarea
                        rows="2"
                        value={form.goal}
                        onChange={(e) => handleChange('goal', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-amber-500 resize-none"
                        placeholder="Ej. Recomposición corporal estética"
                    />
                </Field>

                <Field label={t('profile.deadline')} icon={<Flag size={14} />}>
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
                {savedFlash ? t('profile.saved') : t('common.save')}
            </button>

            {/* Cuenta */}
            <AccountSection authUser={authUser} signOut={signOut} />

            {/* Compartir con nutricionista */}
            <ShareSection authUser={authUser} />

            {/* Idioma */}
            {/* Consentimiento comunicaciones */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={!!plan.user?.emailConsent}
                        onChange={(e) => {
                            updateUser({
                                emailConsent: e.target.checked,
                                emailConsentDate: e.target.checked ? new Date().toISOString() : null,
                            });
                        }}
                        className="mt-0.5 accent-blue-500"
                    />
                    <span className="text-[11px] text-slate-400 leading-relaxed">
                        {t('nav.home') === 'Home'
                            ? 'I agree to receive nutrition tips, updates and product news by email. You can unsubscribe at any time.'
                            : 'Acepto recibir consejos de nutrición, actualizaciones y novedades por email. Puedes darte de baja en cualquier momento.'}
                    </span>
                </label>
            </div>

            <LanguageSelector />

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
    const { i18n } = useTranslation();
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
                onClick={async () => {
                    const isEn = i18n?.language === 'en';
                    try {
                        const uid = authUser.uid;
                        const {
                            collection: col,
                            getDocs: gd,
                            getDoc: gDoc,
                            doc: d,
                            query: q,
                            orderBy: ob,
                        } = await import('firebase/firestore');
                        const { db } = await import('../firebase');

                        const planDoc = await gDoc(d(db, 'users', uid, 'data', 'plan'));
                        const foodsSnap = await gd(q(col(db, 'users', uid, 'customFoods'), ob('name')));
                        const histSnap = await gd(col(db, 'users', uid, 'history'));

                        const data = {
                            exportedAt: new Date().toISOString(),
                            plan: planDoc.exists() ? planDoc.data() : null,
                            customFoods: foodsSnap.docs.map((d) => d.data()),
                            history: histSnap.docs.map((d) => d.data()),
                        };

                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `traineat-export-${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success(isEn ? 'Data exported' : 'Datos exportados');
                    } catch (err) {
                        toast.error(err.message || 'Error');
                    }
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 mt-2"
            >
                <Save size={14} /> {i18n?.language === 'en' ? 'Export my data' : 'Exportar mis datos'}
            </button>
            <button
                onClick={signOut}
                className="w-full py-2.5 bg-rose-950 hover:bg-rose-900 border border-rose-800/50 text-rose-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 mt-2"
            >
                <LogOut size={14} /> Cerrar sesión
            </button>
            <button
                onClick={async () => {
                    const isEn = i18n?.language === 'en';
                    // Paso 1: confirmación simple
                    if (
                        !confirm(
                            isEn
                                ? 'Are you sure you want to delete your account? This cannot be undone.'
                                : '¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.'
                        )
                    )
                        return;
                    // Paso 2: escribir palabra de confirmación
                    const msg = isEn
                        ? 'Type DELETE to permanently delete your account and ALL data:'
                        : 'Escribe ELIMINAR para borrar permanentemente tu cuenta y TODOS tus datos:';
                    const expected = isEn ? 'DELETE' : 'ELIMINAR';
                    const input = prompt(msg);
                    if (input == null) return; // canceló el prompt
                    if (input !== expected) {
                        toast.error(
                            isEn
                                ? `You typed "${input}" — expected "${expected}". Account NOT deleted.`
                                : `Escribiste "${input}" — se esperaba "${expected}". Cuenta NO eliminada.`
                        );
                        return;
                    }
                    try {
                        const uid = authUser.uid;
                        // Borrar subcolecciones y datos
                        const {
                            collection: col,
                            getDocs: gd,
                            deleteDoc: dd,
                            doc: d,
                        } = await import('firebase/firestore');
                        const { db } = await import('../firebase');
                        // customFoods
                        const foodsSnap = await gd(col(db, 'users', uid, 'customFoods'));
                        for (const doc of foodsSnap.docs) await dd(doc.ref);
                        // history
                        const histSnap = await gd(col(db, 'users', uid, 'history'));
                        for (const doc of histSnap.docs) await dd(doc.ref);
                        // shareTokens
                        const tokSnap = await gd(col(db, 'users', uid, 'shareTokens'));
                        for (const doc of tokSnap.docs) {
                            await dd(d(db, '_shareTokens', doc.id)).catch(() => {});
                            await dd(doc.ref);
                        }
                        // plan
                        await dd(d(db, 'users', uid, 'data', 'plan')).catch(() => {});
                        // auth user
                        await authUser.delete();
                        localStorage.clear();
                        toast.success(isEn ? 'Account deleted. Goodbye!' : 'Cuenta eliminada. ¡Hasta pronto!');
                    } catch (err) {
                        if (err.code === 'auth/requires-recent-login') {
                            toast.error(
                                isEn
                                    ? 'Please log out and log back in, then try again.'
                                    : 'Por seguridad, cierra sesión, vuelve a entrar e inténtalo de nuevo.'
                            );
                        } else {
                            toast.error(err.message || 'Error');
                        }
                    }
                }}
                className="w-full py-2 bg-transparent border border-rose-900/30 text-rose-500/60 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 mt-3 hover:bg-rose-950/30 hover:text-rose-400 transition-colors"
            >
                <TrashIcon size={12} /> {i18n?.language === 'en' ? 'Delete account' : 'Eliminar cuenta'}
            </button>
        </Section>
    );
}

function LanguageSelector() {
    const { t, i18n } = useTranslation();
    const langs = [
        { code: 'es', label: 'Español', flag: '🇪🇸' },
        { code: 'en', label: 'English', flag: '🇬🇧' },
    ];

    return (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                <Globe size={14} /> {t('profile.language')}
            </div>
            <div className="grid grid-cols-2 gap-2">
                {langs.map((l) => (
                    <button
                        key={l.code}
                        onClick={() => i18n.changeLanguage(l.code)}
                        className={`py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                            i18n.language === l.code
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                    >
                        {l.flag} {l.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    }
    return fallbackCopy(text);
}
function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
}

function ShareSection({ authUser }) {
    const { i18n } = useTranslation();
    const isEn = i18n.language === 'en';
    const toast = useToast();
    const [tokens, setTokens] = useState([]);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (authUser?.uid) loadTokens();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authUser?.uid]);

    async function loadTokens() {
        try {
            const list = await listShareTokens(authUser.uid);
            setTokens(list);
        } catch {
            /* ignore */
        }
    }

    async function handleCreate() {
        setCreating(true);
        try {
            const { tokenId } = await createShareToken(authUser.uid, 'readwrite');
            const url = `${window.location.origin}/shared/${tokenId}`;
            copyToClipboard(url);
            toast.success(isEn ? 'Link copied!' : '¡Enlace copiado!');
            loadTokens();
        } catch (err) {
            toast.error(err.message || 'Error');
        } finally {
            setCreating(false);
        }
    }

    async function handleRevoke(tokenId) {
        try {
            await revokeShareToken(authUser.uid, tokenId);
            setTokens((t) => t.filter((tk) => tk.tokenId !== tokenId));
            toast.info(isEn ? 'Link revoked' : 'Enlace revocado');
        } catch {
            /* ignore */
        }
    }

    function handleCopy(tokenId) {
        const url = `${window.location.origin}/shared/${tokenId}`;
        copyToClipboard(url);
        toast.success(isEn ? 'Link copied!' : '¡Enlace copiado!');
    }

    return (
        <Section title={isEn ? 'Share with nutritionist' : 'Compartir con nutricionista'} icon={<Share2 size={14} />}>
            <p className="text-xs text-slate-400 mb-3">
                {isEn
                    ? 'Generate a temporary link (7 days) so a nutritionist can view or edit your diet.'
                    : 'Genera un enlace temporal (7 días) para que un nutricionista pueda ver o editar tu dieta.'}
            </p>

            <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors mb-3"
            >
                <LinkIcon size={14} /> {creating ? '...' : isEn ? 'Generate link' : 'Generar enlace'}
            </button>

            {tokens.length > 0 && (
                <div className="space-y-2">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">
                        {isEn ? 'Active links' : 'Enlaces activos'}
                    </div>
                    {tokens.map((tk) => {
                        const exp = new Date(tk.expiresAt);
                        const daysLeft = Math.max(0, Math.ceil((exp - new Date()) / 86400000));
                        return (
                            <div
                                key={tk.tokenId}
                                className="flex items-center justify-between bg-slate-900 rounded-lg p-2.5"
                            >
                                <div className="min-w-0">
                                    <div className="text-[10px] text-slate-400 font-mono truncate">
                                        {tk.tokenId.slice(0, 8)}...
                                    </div>
                                    <div className="text-[9px] text-slate-600">
                                        {daysLeft}d {isEn ? 'left' : 'restantes'}
                                    </div>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <button
                                        onClick={() => handleCopy(tk.tokenId)}
                                        className="p-1.5 text-slate-500 hover:text-blue-400"
                                    >
                                        <Copy size={12} />
                                    </button>
                                    <button
                                        onClick={() => handleRevoke(tk.tokenId)}
                                        className="p-1.5 text-slate-500 hover:text-rose-400"
                                    >
                                        <TrashIcon size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Section>
    );
}
