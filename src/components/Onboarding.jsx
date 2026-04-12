import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ArrowLeft, Dumbbell, User, Target, Activity, Check, X, FileText } from 'lucide-react';
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
        termsAccepted: false,
    });

    const [legalPopup, setLegalPopup] = useState(null); // 'terms' | 'privacy' | null
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
                {/* T&C obligatorio */}
                <label
                    className={`flex items-start gap-3 mt-4 p-3 rounded-xl border cursor-pointer ${form.termsAccepted ? 'bg-blue-950/20 border-blue-800/30' : 'bg-slate-800/50 border-rose-800/30'}`}
                >
                    <input
                        type="checkbox"
                        checked={form.termsAccepted}
                        onChange={(e) => set('termsAccepted', e.target.checked)}
                        className="mt-0.5 accent-blue-500"
                    />
                    <span className="text-[11px] text-slate-300 leading-relaxed">
                        {isEn ? 'I accept the ' : 'Acepto los '}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                setLegalPopup('terms');
                            }}
                            className="text-blue-400 underline"
                        >
                            {isEn ? 'Terms of Service' : 'Términos de Servicio'}
                        </button>
                        {isEn ? ' and the ' : ' y la '}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                setLegalPopup('privacy');
                            }}
                            className="text-blue-400 underline"
                        >
                            {isEn ? 'Privacy Policy' : 'Política de Privacidad'}
                        </button>
                        . <span className="text-rose-400">*</span>
                    </span>
                </label>

                {/* Marketing opcional */}
                <label className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={form.emailConsent}
                        onChange={(e) => set('emailConsent', e.target.checked)}
                        className="mt-0.5 accent-blue-500"
                    />
                    <span className="text-[11px] text-slate-400 leading-relaxed">
                        {isEn
                            ? '🎯 Keep me in the loop! Get smart meal ideas, new features & exclusive content. Easy unsubscribe.'
                            : '🎯 ¡Mantenme al día! Recibir ideas de comidas, nuevas funciones y contenido exclusivo por email. Baja fácil.'}
                    </span>
                </label>
            </div>
        ),
    ];

    const isLast = step === steps.length - 1;
    const canNext = step === 0 || (step === 1 && form.name.trim()) || step === 2 || (step === 3 && form.termsAccepted);

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
                termsAcceptedDate: new Date().toISOString(),
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

            {/* Legal popup */}
            {legalPopup && <LegalPopup type={legalPopup} isEn={isEn} onClose={() => setLegalPopup(null)} />}
        </div>,
        document.body
    );
}

function LegalPopup({ type, isEn, onClose }) {
    const isTerms = type === 'terms';
    const title = isTerms
        ? isEn
            ? 'Terms of Service'
            : 'Términos de Servicio'
        : isEn
          ? 'Privacy Policy'
          : 'Política de Privacidad';

    return (
        <div
            className="fixed inset-0 z-[200] bg-slate-950/95 flex items-start justify-center pt-8 px-4 pb-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                        <FileText size={16} className="text-blue-400" /> {title}
                    </div>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>
                <div className="overflow-y-auto p-4 text-xs text-slate-300 leading-relaxed space-y-3">
                    {isTerms ? <TermsContent isEn={isEn} /> : <PrivacyContent isEn={isEn} />}
                </div>
                <div className="p-3 border-t border-slate-800 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                    >
                        {isEn ? 'Close' : 'Cerrar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function TermsContent({ isEn }) {
    if (isEn)
        return (
            <>
                <p>
                    <strong>1. Acceptance.</strong> By using TrainEat you agree to these terms.
                </p>
                <p>
                    <strong>2. Service.</strong> TrainEat is a nutrition and training tracking tool with macro
                    calculations, meal planning, workout tracking and food scanning.
                </p>
                <p>
                    <strong>3. Health Disclaimer.</strong> TrainEat does NOT provide medical advice. All calculations
                    are estimates. Consult a professional before significant changes to diet or exercise.
                </p>
                <p>
                    <strong>4. Accounts.</strong> You must be 13+ years old. You are responsible for your account
                    security.
                </p>
                <p>
                    <strong>5. Your Data.</strong> You own all data you create. We do not sell personal data to third
                    parties.
                </p>
                <p>
                    <strong>6. Prohibited Use.</strong> No accessing others' data, distributing harmful content, or
                    abusing scanning features.
                </p>
                <p>
                    <strong>7. Liability.</strong> TrainEat is provided "as is". We are not liable for health outcomes
                    from using the app.
                </p>
                <p>
                    <strong>8. Changes.</strong> We may update these terms. Continued use constitutes acceptance.
                </p>
                <p>
                    <strong>9. Contact.</strong> legal@traineat.app
                </p>
            </>
        );
    return (
        <>
            <p>
                <strong>1. Aceptación.</strong> Al usar TrainEat aceptas estos términos.
            </p>
            <p>
                <strong>2. Servicio.</strong> TrainEat es una herramienta de seguimiento nutricional y de entrenamiento
                con cálculos de macros, planificación de comidas, seguimiento de entrenamientos y escaneo de alimentos.
            </p>
            <p>
                <strong>3. Aviso de salud.</strong> TrainEat NO proporciona consejo médico. Todos los cálculos son
                estimaciones. Consulta a un profesional antes de cambios significativos.
            </p>
            <p>
                <strong>4. Cuentas.</strong> Debes tener 13+ años. Eres responsable de la seguridad de tu cuenta.
            </p>
            <p>
                <strong>5. Tus datos.</strong> Conservas la propiedad de todos tus datos. No vendemos datos personales a
                terceros.
            </p>
            <p>
                <strong>6. Uso prohibido.</strong> No acceder a datos ajenos, distribuir contenido dañino ni abusar del
                escaneo.
            </p>
            <p>
                <strong>7. Responsabilidad.</strong> TrainEat se proporciona "tal cual". No somos responsables de
                resultados de salud.
            </p>
            <p>
                <strong>8. Cambios.</strong> Podemos actualizar estos términos. El uso continuado implica aceptación.
            </p>
            <p>
                <strong>9. Contacto.</strong> legal@traineat.app
            </p>
        </>
    );
}

function PrivacyContent({ isEn }) {
    if (isEn)
        return (
            <>
                <p>
                    <strong>1. Data We Collect.</strong> Profile data, nutrition plans, training history, weight log,
                    custom foods, authentication data.
                </p>
                <p>
                    <strong>2. How We Use It.</strong> Calculate personalized macros, sync across devices, improve the
                    app.
                </p>
                <p>
                    <strong>3. Third Parties.</strong> Firebase (Google): auth & database. Open Food Facts: product
                    data. Anthropic: label OCR (images NOT stored). Sentry: error tracking.
                </p>
                <p>
                    <strong>4. Security.</strong> Data stored in Google Cloud with encryption at rest and in transit.
                    Access restricted to your account.
                </p>
                <p>
                    <strong>5. Your Rights (GDPR).</strong> Access, rectification, erasure, portability. Contact:
                    privacy@traineat.app
                </p>
            </>
        );
    return (
        <>
            <p>
                <strong>1. Datos que recopilamos.</strong> Datos de perfil, planes nutricionales, historial de entrenos,
                registro de peso, productos personalizados, datos de autenticación.
            </p>
            <p>
                <strong>2. Cómo los usamos.</strong> Calcular macros personalizados, sincronizar entre dispositivos,
                mejorar la app.
            </p>
            <p>
                <strong>3. Terceros.</strong> Firebase (Google): auth y base de datos. Open Food Facts: datos de
                productos. Anthropic: OCR etiquetas (imágenes NO almacenadas). Sentry: seguimiento errores.
            </p>
            <p>
                <strong>4. Seguridad.</strong> Datos en Google Cloud con cifrado en reposo y tránsito. Acceso
                restringido a tu cuenta.
            </p>
            <p>
                <strong>5. Tus derechos (RGPD).</strong> Acceso, rectificación, supresión, portabilidad. Contacto:
                privacy@traineat.app
            </p>
        </>
    );
}
