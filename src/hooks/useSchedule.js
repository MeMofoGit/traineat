import { useState, useEffect } from 'react';
import { usePlan } from './usePlan';

export function useSchedule() {
    const { plan } = usePlan();
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    const getCurrentPhase = () => {
        if (!plan.phases || plan.phases.length === 0) return { name: "Fase 1", id: 1 };
        const active = plan.phases.find(p => p.id === plan.activePhaseId);
        return active || plan.phases[0];
    };

    const getNextEvent = () => {
        const currentTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const mealSchedule = (plan.schedule?.default || []).filter(item => item.type === 'meal');

        if (mealSchedule.length === 0) return null;

        const upcoming = mealSchedule.find(item => item.time > currentTimeStr);
        const target = upcoming || mealSchedule[0];
        const mealDetails = plan.meals?.[target.id] || { goal: "Sin datos", options: [], selectedOptionIndex: 0 };

        return {
            ...target,
            details: mealDetails,
            label: upcoming ? target.label : `Mañana: ${target.label}`
        };
    };

    const getActiveTraining = () => {
        const currentPhase = getCurrentPhase();
        const day = now.getDay(); // 0-6
        // plan.routines is { phaseId: { dayId: { ... } } }
        // dayId in plan: 1=Mon, ..., 6=Sat, 0=Sun

        const phaseRoutines = plan.routines?.[currentPhase.id] || {};
        const routine = phaseRoutines[day];

        return {
            phase: currentPhase,
            dayLabel: getDayLabel(day),
            routine: routine || null // null means Rest or not configured
        };
    };

    const getDayLabel = (d) => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return days[d];
    };

    return {
        now,
        currentPhase: getCurrentPhase(),
        nextEvent: getNextEvent(),
        activeTraining: getActiveTraining()
    };
}
