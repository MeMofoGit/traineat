import { useState } from 'react';

const STORAGE_KEY = 'fitness_onboarding_done';

export function useOnboarding() {
    const [done, setDone] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');
    const finish = () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        setDone(true);
    };
    return { done, finish };
}
