/**
 * Servicio de tokens compartidos para colaboración con nutricionistas.
 *
 * Cada token da acceso temporal (7 días) a los datos del usuario
 * vía un link público /shared/{tokenId}.
 *
 * Colección: users/{uid}/shareTokens/{tokenId}
 */

import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

function tokensCol(uid) {
    return collection(db, 'users', uid, 'shareTokens');
}

/**
 * Genera un token de 7 días.
 * @param {string} uid
 * @param {'read' | 'readwrite'} permissions
 * @returns {Promise<{ tokenId: string, expiresAt: Date }>}
 */
export async function createShareToken(uid, permissions = 'read') {
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    // Doc en colección top-level para que SharedView pueda leerlo sin auth
    await setDoc(doc(db, '_shareTokens', tokenId), {
        tokenId,
        uid,
        permissions,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt.toISOString(),
    });

    // Copia en subcolección del usuario para listar/revocar
    await setDoc(doc(db, 'users', uid, 'shareTokens', tokenId), {
        tokenId,
        permissions,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt.toISOString(),
    });

    return { tokenId, expiresAt };
}

/**
 * Lista todos los tokens activos del usuario.
 */
export async function listShareTokens(uid) {
    const q = query(tokensCol(uid), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data()).filter((t) => new Date(t.expiresAt) > new Date());
}

/**
 * Revoca un token.
 */
export async function revokeShareToken(uid, tokenId) {
    await deleteDoc(doc(db, 'users', uid, 'shareTokens', tokenId));
    await deleteDoc(doc(db, '_shareTokens', tokenId)).catch(() => {});
}
