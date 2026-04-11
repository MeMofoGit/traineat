import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Terms() {
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
                    <FileText size={20} className="text-blue-400" />
                    <h1 className="text-xl font-bold text-white">
                        {isEn ? 'Terms of Service' : 'Términos de Servicio'}
                    </h1>
                </div>
            </header>

            <div className="prose prose-sm prose-invert max-w-none text-slate-300 leading-relaxed space-y-4 text-sm">
                <p className="text-slate-400 text-xs">
                    {isEn ? 'Last updated: April 2026' : 'Última actualización: abril 2026'}
                </p>

                <h2 className="text-white text-base font-bold">{isEn ? '1. Acceptance' : '1. Aceptación'}</h2>
                <p>
                    {isEn
                        ? 'By using TrainEat you agree to these terms. If you disagree, do not use the app.'
                        : 'Al usar TrainEat aceptas estos términos. Si no estás de acuerdo, no uses la aplicación.'}
                </p>

                <h2 className="text-white text-base font-bold">
                    {isEn ? '2. Description of Service' : '2. Descripción del servicio'}
                </h2>
                <p>
                    {isEn
                        ? 'TrainEat is a nutrition and training tracking tool. It provides macro calculations, meal planning, workout tracking, and food scanning features.'
                        : 'TrainEat es una herramienta de seguimiento nutricional y de entrenamiento. Proporciona cálculos de macros, planificación de comidas, seguimiento de entrenamientos y funciones de escaneo de alimentos.'}
                </p>

                <h2 className="text-white text-base font-bold">
                    {isEn ? '3. Health Disclaimer' : '3. Aviso de salud'}
                </h2>
                <p>
                    {isEn
                        ? 'TrainEat does NOT provide medical advice. All nutritional calculations are estimates based on general formulas. Consult a healthcare professional before making significant changes to your diet or exercise routine.'
                        : 'TrainEat NO proporciona consejo médico. Todos los cálculos nutricionales son estimaciones basadas en fórmulas generales. Consulta a un profesional sanitario antes de realizar cambios significativos en tu dieta o rutina de ejercicio.'}
                </p>

                <h2 className="text-white text-base font-bold">
                    {isEn ? '4. User Accounts' : '4. Cuentas de usuario'}
                </h2>
                <ul className="list-disc pl-5 space-y-1">
                    <li>
                        {isEn
                            ? 'You are responsible for maintaining the security of your account'
                            : 'Eres responsable de mantener la seguridad de tu cuenta'}
                    </li>
                    <li>
                        {isEn
                            ? 'You must be at least 13 years old to use the service'
                            : 'Debes tener al menos 13 años para usar el servicio'}
                    </li>
                    <li>{isEn ? 'One account per person' : 'Una cuenta por persona'}</li>
                </ul>

                <h2 className="text-white text-base font-bold">
                    {isEn ? '5. User Content' : '5. Contenido del usuario'}
                </h2>
                <p>
                    {isEn
                        ? 'You retain ownership of all data you create (meal plans, custom foods, workout logs). We do not sell or share your personal data with third parties for marketing purposes.'
                        : 'Conservas la propiedad de todos los datos que crees (planes de comidas, productos personalizados, registros de entrenamiento). No vendemos ni compartimos tus datos personales con terceros con fines comerciales.'}
                </p>

                <h2 className="text-white text-base font-bold">{isEn ? '6. Prohibited Use' : '6. Uso prohibido'}</h2>
                <ul className="list-disc pl-5 space-y-1">
                    <li>
                        {isEn ? "Attempting to access other users' data" : 'Intentar acceder a datos de otros usuarios'}
                    </li>
                    <li>
                        {isEn
                            ? 'Using the service to distribute harmful content'
                            : 'Usar el servicio para distribuir contenido dañino'}
                    </li>
                    <li>
                        {isEn
                            ? 'Abusing the barcode/OCR scanning features'
                            : 'Abusar de las funciones de escaneo de código de barras/OCR'}
                    </li>
                </ul>

                <h2 className="text-white text-base font-bold">
                    {isEn ? '7. Limitation of Liability' : '7. Limitación de responsabilidad'}
                </h2>
                <p>
                    {isEn
                        ? 'TrainEat is provided "as is". We are not liable for any health outcomes resulting from following nutritional calculations or training plans generated by the app.'
                        : 'TrainEat se proporciona "tal cual". No somos responsables de ningún resultado de salud derivado de seguir los cálculos nutricionales o planes de entrenamiento generados por la aplicación.'}
                </p>

                <h2 className="text-white text-base font-bold">
                    {isEn ? '8. Changes to Terms' : '8. Cambios en los términos'}
                </h2>
                <p>
                    {isEn
                        ? 'We may update these terms at any time. Continued use of the app after changes constitutes acceptance.'
                        : 'Podemos actualizar estos términos en cualquier momento. El uso continuado de la app tras los cambios constituye aceptación.'}
                </p>

                <h2 className="text-white text-base font-bold">{isEn ? '9. Contact' : '9. Contacto'}</h2>
                <p>
                    {isEn
                        ? 'For questions about these terms: legal@traineat.app'
                        : 'Para consultas sobre estos términos: legal@traineat.app'}
                </p>
            </div>
        </div>
    );
}
