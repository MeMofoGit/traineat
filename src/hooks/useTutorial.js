import { useState } from 'react';

const STORAGE_KEY = 'fitness_tutorial_done';

export function useTutorial() {
    const [done, setDone] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');
    const finish = () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        setDone(true);
    };
    return { done, finish };
}
