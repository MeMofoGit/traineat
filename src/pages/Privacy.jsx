import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Privacy() {
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const isEn = i18n.language === 'en';

    return (
        <div className="p-6 space-y-6 pb-24">
            <header className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                    <Shield size={20} className="text-blue-400" />
                    <h1 className="text-xl font-bold text-white">
                        {isEn ? 'Privacy Policy' : 'Política de Privacidad'}
                    </h1>
                </div>
            </header>

            <div className="prose prose-sm prose-invert max-w-none text-slate-300 leading-relaxed space-y-4 text-sm">
                <p className="text-slate-400 text-xs">
                    {isEn ? 'Last updated: April 2026' : 'Última actualización: abril 2026'}
                </p>

                <h2 className="text-white text-base font-bold">
                    {isEn ? '1. Data We Collect' : '1. Datos que recopilamos'}
                </h2>
                <p>
                    {isEn
                        ? 'TrainEat collects the following information to provide its services:'
                        : 'TrainEat recopila la siguiente información para prestar sus servicios:'}
                </p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>
                        {isEn
                            ? 'Profile data: name, date of birth, gender, height, activity level, goals'
                            : 'Datos de perfil: nombre, fecha de nacimiento, sexo, altura, nivel de actividad, objetivos'}
                    </li>
                    <li>{isEn ? 'Nutrition plans and food diary' : 'Planes nutricionales y diario de comidas'}</li>
                    <li>
                        {isEn
                            ? 'Training routines and session history'
                            : 'Rutinas de entrenamiento e historial de sesiones'}
                    </li>
                    <li>{isEn ? 'Weight log' : 'Registro de peso'}</li>
                    <li>{isEn ? 'Custom food products (My Fridge)' : 'Productos personalizados (Mi Nevera)'}</li>
                    <li>
                        {isEn
                            ? 'Authentication data (email or Google account)'
                            : 'Datos de autenticación (email o cuenta de Google)'}
                    </li>
                </ul>

                <h2 className="text-white text-base font-bold">
                    {isEn ? '2. How We Use Your Data' : '2. Cómo usamos tus datos'}
                </h2>
                <ul className="list-disc pl-5 space-y-1">
                    <li>
                        {isEn
                            ? 'Calculate personalized macro targets and nutritional recommendations'
                            : 'Calcular objetivos de macros personalizados y recomendaciones nutricionales'}
                    </li>
                    <li>{isEn ? 'Sync your data across devices' : 'Sincronizar tus datos entre dispositivos'}</li>
                    <li>
                        {isEn
                            ? 'Improve the app through anonymous usage analytics'
                            : 'Mejorar la app mediante analíticas de uso anónimas'}
                    </li>
                </ul>

                <h2 className="text-white text-base font-bold">
                    {isEn ? '3. Third-Party Services' : '3. Servicios de terceros'}
                </h2>
                <ul className="list-disc pl-5 space-y-1">
                    <li>
                        <strong>Firebase (Google)</strong>:{' '}
                        {isEn ? 'Authentication, database, hosting' : 'Autenticación, base de datos, hosting'}
                    </li>
                    <li>
                        <strong>Open Food Facts</strong>:{' '}
                        {isEn
                            ? 'Product nutrition data (public API)'
                            : 'Datos nutricionales de productos (API pública)'}
                    </li>
                    <li>
                        <strong>Anthropic (Claude)</strong>:{' '}
                        {isEn
                            ? 'Label OCR processing (images are NOT stored)'
                            : 'Procesamiento OCR de etiquetas (las imágenes NO se almacenan)'}
                    </li>
                    <li>
                        <strong>Sentry</strong>:{' '}
                        {isEn ? 'Error tracking (no personal data)' : 'Seguimiento de errores (sin datos personales)'}
                    </li>
                </ul>

                <h2 className="text-white text-base font-bold">
                    {isEn ? '4. Data Storage & Security' : '4. Almacenamiento y seguridad'}
                </h2>
                <p>
                    {isEn
                        ? 'Your data is stored in Google Cloud (Firebase Firestore) with encryption at rest and in transit. Access is restricted to your authenticated account only.'
                        : 'Tus datos se almacenan en Google Cloud (Firebase Firestore) con cifrado en reposo y en tránsito. El acceso está restringido exclusivamente a tu cuenta autenticada.'}
                </p>

                <h2 className="text-white text-base font-bold">
                    {isEn ? '5. Your Rights (GDPR)' : '5. Tus derechos (RGPD)'}
                </h2>
                <ul className="list-disc pl-5 space-y-1">
                    <li>{isEn ? 'Access: request a copy of your data' : 'Acceso: solicitar una copia de tus datos'}</li>
                    <li>
                        {isEn ? 'Rectification: correct inaccurate data' : 'Rectificación: corregir datos inexactos'}
                    </li>
                    <li>
                        {isEn
                            ? 'Erasure: request deletion of your account and all data'
                            : 'Supresión: solicitar la eliminación de tu cuenta y todos tus datos'}
                    </li>
                    <li>
                        {isEn
                            ? 'Portability: export your data in a standard format'
                            : 'Portabilidad: exportar tus datos en formato estándar'}
                    </li>
                </ul>

                <h2 className="text-white text-base font-bold">{isEn ? '6. Contact' : '6. Contacto'}</h2>
                <p>
                    {isEn
                        ? 'For any privacy-related questions, contact us at: privacy@traineat.app'
                        : 'Para cualquier consulta relacionada con la privacidad, contacta en: privacy@traineat.app'}
                </p>
            </div>
        </div>
    );
}
