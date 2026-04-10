import { useMemo, useState, useCallback } from 'react';
import { usePlan } from './usePlan';

/**
 * Detecta entrenos pendientes (no completados) de la semana actual.
 *
 * Un día se considera "pendiente" si:
 *   1. Es un día ANTERIOR a hoy en la semana actual (Lun-Dom ISO).
 *   2. Tiene una rutina con ejercicios (no es descanso).
 *   3. No hay sesión completada en el historial para ese día+fase esta semana.
 *   4. No fue marcado como 'skipped' o 'done_elsewhere' en weeklyDecisions.
 *
 * weeklyDecisions se guarda en localStorage (efímero, no necesita Firestore).
 */

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const STORAGE_KEY = 'fitness_weekly_decisions';

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getWeekKey(date) {
    return getWeekStart(date).toISOString().split('T')[0];
}

function loadDecisions() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function saveDecisions(all) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function usePendingWorkouts() {
    const { plan } = usePlan();
    const [decisions, setDecisions] = useState(loadDecisions);

    const activePhaseId = plan.activePhaseId || plan.phases?.[0]?.id || 1;
    const history = plan.history || [];
    const routines = plan.routines?.[activePhaseId] || {};

    const pending = useMemo(() => {
        const now = new Date();
        const todayDayId = now.getDay();
        const weekKey = getWeekKey(now);
        const weekDecisions = decisions[weekKey] || {};

        const weekStart = getWeekStart(now);
        const weekSessions = history.filter((h) => {
            if (!h.date) return false;
            const d = new Date(h.date);
            return d >= weekStart && h.phaseId === activePhaseId;
        });
        const completedDays = new Set(weekSessions.map((h) => h.dayId));

        const daysToCheck =
            todayDayId === 0 ? [1, 2, 3, 4, 5, 6] : Array.from({ length: todayDayId - 1 }, (_, i) => i + 1);

        const result = [];
        for (const dayId of daysToCheck) {
            const routine = routines[dayId];
            if (!routine?.exercises?.length) continue;
            if (completedDays.has(dayId)) continue;
            if (weekDecisions[dayId]) continue;

            result.push({
                dayId,
                label: DAY_LABELS[dayId],
                routineLabel: routine.label || 'Entrenamiento',
                routine,
            });
        }
        return result;
    }, [history, routines, activePhaseId, decisions]);

    const setDecision = useCallback((dayId, decision) => {
        const weekKey = getWeekKey(new Date());
        setDecisions((prev) => {
            const updated = {
                ...prev,
                [weekKey]: { ...(prev[weekKey] || {}), [dayId]: decision },
            };
            saveDecisions(updated);
            return updated;
        });
    }, []);

    return {
        pending,
        hasPending: pending.length > 0,
        firstPending: pending[0] || null,
        markSkipped: (dayId) => setDecision(dayId, 'skipped'),
        markDoneElsewhere: (dayId) => setDecision(dayId, 'done_elsewhere'),
    };
}
