import { useState, useCallback } from 'react';

const STORAGE_KEY = 'fitness_disclaimer_accepted';

export function useDisclaimer() {
    const [accepted, setAccepted] = useState(() => {
        return localStorage.getItem(STORAGE_KEY) === 'true';
    });

    const accept = useCallback(() => {
        localStorage.setItem(STORAGE_KEY, 'true');
        setAccepted(true);
    }, []);

    return { accepted, accept };
}
