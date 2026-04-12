/**
 * Servicio de email — llama a Firebase Functions para enviar emails vía Resend.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export async function sendWelcomeEmail(name, lang) {
    const fn = httpsCallable(functions, 'sendWelcomeEmail');
    return fn({ name, lang });
}

export async function sendAccountDeletedEmail(name, email, lang) {
    const fn = httpsCallable(functions, 'sendAccountDeletedEmail');
    return fn({ name, email, lang });
}
