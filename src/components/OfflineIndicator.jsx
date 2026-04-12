import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function OfflineIndicator() {
    const [offline, setOffline] = useState(!navigator.onLine);
    const { i18n } = useTranslation();
    const isEn = i18n.language === 'en';

    useEffect(() => {
        const goOffline = () => setOffline(true);
        const goOnline = () => setOffline(false);
        window.addEventListener('offline', goOffline);
        window.addEventListener('online', goOnline);
        return () => {
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('online', goOnline);
        };
    }, []);

    if (!offline) return null;

    return (
        <div className="fixed top-0 inset-x-0 z-[80] bg-amber-600 text-white text-xs font-bold text-center py-1.5 flex items-center justify-center gap-2">
            <WifiOff size={14} />
            {isEn ? 'No internet connection — changes saved locally' : 'Sin conexión — cambios guardados localmente'}
        </div>
    );
}
