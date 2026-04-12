/**
 * Servicio de email vía Resend API.
 *
 * Tipos de email:
 * - welcome: email de bienvenida al registrarse
 * - accountDeleted: confirmación de eliminación de cuenta
 * - nutritionistNote: notificación de nota de nutricionista
 *
 * La API key se configura como Firebase secret:
 *   firebase functions:secrets:set RESEND_API_KEY
 */

import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getClient(apiKey: string): Resend {
    if (!resendClient) {
        resendClient = new Resend(apiKey);
    }
    return resendClient;
}

const FROM_EMAIL = 'TrainEat <noreply@traineat.app>';

interface SendEmailParams {
    apiKey: string;
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ apiKey, to, subject, html }: SendEmailParams): Promise<void> {
    const client = getClient(apiKey);
    await client.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
    });
}

export function welcomeEmail(name: string, lang: string = 'es'): { subject: string; html: string } {
    if (lang === 'en') {
        return {
            subject: 'Welcome to TrainEat! 🎉',
            html: `
                <div style="font-family:system-ui;max-width:480px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:16px;">
                    <h1 style="color:#38bdf8;margin:0 0 16px;">Welcome, ${name}! 💪</h1>
                    <p>Your personalized nutrition and training plan is ready.</p>
                    <p>Here's what you can do:</p>
                    <ul>
                        <li>📊 Track your macros per meal</li>
                        <li>🧊 Scan barcodes to add your real products</li>
                        <li>🏋️ Log your workouts with rest timers</li>
                        <li>📤 Share your diet with a nutritionist</li>
                    </ul>
                    <p style="margin-top:24px;"><a href="https://fitness-6d907.web.app" style="background:#3b82f6;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;">Open TrainEat</a></p>
                    <p style="color:#64748b;font-size:12px;margin-top:32px;">TrainEat — Nutrition & Training</p>
                </div>
            `,
        };
    }
    return {
        subject: '¡Bienvenido a TrainEat! 🎉',
        html: `
            <div style="font-family:system-ui;max-width:480px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:16px;">
                <h1 style="color:#38bdf8;margin:0 0 16px;">¡Bienvenido, ${name}! 💪</h1>
                <p>Tu plan de nutrición y entrenamiento personalizado está listo.</p>
                <p>Esto es lo que puedes hacer:</p>
                <ul>
                    <li>📊 Controlar tus macros por comida</li>
                    <li>🧊 Escanear códigos de barras para añadir tus productos reales</li>
                    <li>🏋️ Registrar tus entrenamientos con timer de descanso</li>
                    <li>📤 Compartir tu dieta con un nutricionista</li>
                </ul>
                <p style="margin-top:24px;"><a href="https://fitness-6d907.web.app" style="background:#3b82f6;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;">Abrir TrainEat</a></p>
                <p style="color:#64748b;font-size:12px;margin-top:32px;">TrainEat — Nutrición y Entrenamiento</p>
            </div>
        `,
    };
}

export function accountDeletedEmail(name: string, lang: string = 'es'): { subject: string; html: string } {
    if (lang === 'en') {
        return {
            subject: 'Your TrainEat account has been deleted',
            html: `
                <div style="font-family:system-ui;max-width:480px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:16px;">
                    <h1 style="color:#f87171;margin:0 0 16px;">Account deleted</h1>
                    <p>Hi ${name}, your TrainEat account and all associated data have been permanently deleted.</p>
                    <p>If this was a mistake, unfortunately we cannot recover your data. You can always create a new account.</p>
                    <p style="color:#64748b;font-size:12px;margin-top:32px;">TrainEat — Nutrition & Training</p>
                </div>
            `,
        };
    }
    return {
        subject: 'Tu cuenta de TrainEat ha sido eliminada',
        html: `
            <div style="font-family:system-ui;max-width:480px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:16px;">
                <h1 style="color:#f87171;margin:0 0 16px;">Cuenta eliminada</h1>
                <p>Hola ${name}, tu cuenta de TrainEat y todos los datos asociados han sido eliminados permanentemente.</p>
                <p>Si fue un error, lamentablemente no podemos recuperar tus datos. Siempre puedes crear una cuenta nueva.</p>
                <p style="color:#64748b;font-size:12px;margin-top:32px;">TrainEat — Nutrición y Entrenamiento</p>
            </div>
        `,
    };
}
