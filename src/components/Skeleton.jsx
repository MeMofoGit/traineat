import React from 'react';

/**
 * Skeleton loader reutilizable para estados de carga.
 *
 * Uso básico:
 *   <Skeleton className="h-4 w-32" />           // línea de texto
 *   <Skeleton className="h-10 w-full" />         // input
 *   <Skeleton className="h-20 w-full rounded-xl" /> // card
 *   <Skeleton circle className="w-10 h-10" />    // avatar
 *
 * Props:
 * - className: tamaño y forma (OBLIGATORIO — sin esto no se ve nada)
 * - circle: boolean — hace rounded-full
 * - count: number — repite N skeletons con gap-2
 * - children: si se pasan, envuelve en contenedor con shimmer
 */
export default function Skeleton({ className = '', circle = false, count = 1, children }) {
    if (children) {
        return <div className={`animate-pulse ${className}`}>{children}</div>;
    }

    const baseClasses = `bg-slate-800 animate-pulse ${circle ? 'rounded-full' : 'rounded-lg'} ${className}`;

    if (count === 1) {
        return <div className={baseClasses} />;
    }

    return (
        <div className="space-y-2">
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className={baseClasses} />
            ))}
        </div>
    );
}

/**
 * Skeleton preset para una card de producto (Mi Nevera).
 */
export function FoodCardSkeleton() {
    return (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-slate-700 shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-700 rounded w-3/4" />
                <div className="h-3 bg-slate-700/50 rounded w-1/2" />
            </div>
            <div className="h-4 bg-slate-700 rounded w-16 shrink-0" />
        </div>
    );
}

/**
 * Skeleton preset para una fila de comida en Diet.
 */
export function MealCardSkeleton() {
    return (
        <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-4 space-y-3 animate-pulse">
            <div className="flex justify-between">
                <div className="h-5 bg-slate-700 rounded w-1/3" />
                <div className="h-4 bg-slate-700 rounded w-20" />
            </div>
            <div className="space-y-2">
                <div className="h-3 bg-slate-700/50 rounded w-full" />
                <div className="h-3 bg-slate-700/50 rounded w-4/5" />
            </div>
            <div className="flex gap-2">
                <div className="h-8 bg-slate-700/30 rounded-lg flex-1" />
                <div className="h-8 bg-slate-700/30 rounded-lg flex-1" />
                <div className="h-8 bg-slate-700/30 rounded-lg flex-1" />
            </div>
        </div>
    );
}
