/**
 * Cloud Functions para envío de email vía Resend.
 *
 * - sendWelcomeEmail: callable, envía email de bienvenida al registrarse
 * - sendAccountDeletedEmail: callable, envía confirmación de eliminación
 *
 * API key en Firebase secret: RESEND_API_KEY
 *   firebase functions:secrets:set RESEND_API_KEY
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { sendEmail, welcomeEmail, accountDeletedEmail } from '../services/email';

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

export const sendWelcomeEmailFn = onCall(
    {
        region: 'europe-west1',
        secrets: [RESEND_API_KEY],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Auth required');
        }

        const { name, lang } = request.data as { name?: string; lang?: string };
        const email = request.auth.token.email;
        if (!email) {
            throw new HttpsError('failed-precondition', 'No email on account');
        }

        const { subject, html } = welcomeEmail(name || 'Atleta', lang || 'es');
        await sendEmail({ apiKey: RESEND_API_KEY.value(), to: email, subject, html });

        return { success: true };
    }
);

export const sendAccountDeletedEmailFn = onCall(
    {
        region: 'europe-west1',
        secrets: [RESEND_API_KEY],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Auth required');
        }

        const { name, email, lang } = request.data as { name?: string; email?: string; lang?: string };
        const targetEmail = email || request.auth.token.email;
        if (!targetEmail) {
            throw new HttpsError('failed-precondition', 'No email');
        }

        const { subject, html } = accountDeletedEmail(name || 'Usuario', lang || 'es');
        await sendEmail({ apiKey: RESEND_API_KEY.value(), to: targetEmail, subject, html });

        return { success: true };
    }
);
