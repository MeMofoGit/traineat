import React from 'react';
import { Lock } from 'lucide-react';
import { useEntitlements } from '../hooks/useEntitlements';

/**
 * Gate — envuelve una sección/botón premium y la muestra solo si el usuario
 * tiene el entitlement correspondiente. Si no, renderiza `fallback` (por
 * defecto, un placeholder de upsell).
 *
 * Hoy todos los entitlements están a `true` en dev (ver useEntitlements),
 * así que en la práctica nunca renderiza el fallback. La estructura está
 * lista para cuando los entitlements pasen a venir de un backend real
 * (Fase 6, Stripe webhook → Firestore).
 *
 * Uso:
 *   <Gate feature="customFoods">
 *     <BotonCrearProducto />
 *   </Gate>
 *
 *   <Gate feature="ocrLabel" fallback={<UpsellMini />}>
 *     <BotonEscanearEtiqueta />
 *   </Gate>
 */
export default function Gate({ feature, children, fallback = null }) {
    const entitlements = useEntitlements();
    const allowed = Boolean(entitlements[feature]);

    if (allowed) return children;
    if (fallback !== null) return fallback;
    return <DefaultUpsell feature={feature} />;
}

function DefaultUpsell({ feature }) {
    return (
        <div className="border border-dashed border-amber-700/50 bg-amber-950/20 rounded-xl p-4 flex items-center gap-3">
            <div className="bg-amber-900/40 p-2 rounded-lg text-amber-400 shrink-0">
                <Lock size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-amber-300">Función Premium</div>
                <div className="text-[10px] text-amber-200/70">
                    Desbloquea <code>{feature}</code> con la suscripción Premium
                </div>
            </div>
        </div>
    );
}
