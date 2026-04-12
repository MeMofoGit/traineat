import React, { useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Utensils, Dumbbell, User, Refrigerator } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Layout() {
    const { pathname } = useLocation();
    const navRef = useRef(null);

    // Scroll to top al cambiar de página
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    // Publicar altura real del nav como CSS variable para que otros componentes
    // (ej: rest timer overlay) se posicionen pixel-perfect encima.
    useEffect(() => {
        const nav = navRef.current;
        if (!nav) return;
        const update = () => document.documentElement.style.setProperty('--nav-height', `${nav.offsetHeight}px`);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(nav);
        return () => ro.disconnect();
    }, []);

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 pb-20 font-sans">
            <main className="max-w-md mx-auto min-h-screen relative bg-slate-950 shadow-2xl overflow-hidden">
                {/* Helper gradient for aesthetics */}
                <div className="fixed top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />

                <Outlet />
            </main>

            {/* Bottom Navigation */}
            <nav
                ref={navRef}
                className="fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-md border-t border-slate-800 z-50"
            >
                <div className="max-w-md mx-auto flex justify-around items-center p-4">
                    <NavItem to="/" icon={<Home size={22} />} tKey="nav.home" idx={0} />
                    <NavItem to="/diet" icon={<Utensils size={22} />} tKey="nav.diet" idx={1} />
                    <NavItem to="/fridge" icon={<Refrigerator size={22} />} tKey="nav.fridge" idx={2} />
                    <NavItem to="/training" icon={<Dumbbell size={22} />} tKey="nav.training" idx={3} />
                    <NavItem to="/profile" icon={<User size={22} />} tKey="nav.profile" idx={4} />
                </div>
            </nav>
        </div>
    );
}

function NavItem({ to, icon, tKey, idx }) {
    const { t } = useTranslation();
    const [tutorialHighlight, setTutorialHighlight] = React.useState(false);

    React.useEffect(() => {
        const check = () => {
            const step = document.documentElement.dataset.tutorialStep;
            setTutorialHighlight(step != null && Number(step) === idx);
        };
        check();
        const observer = new MutationObserver(check);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tutorial-step'] });
        return () => observer.disconnect();
    }, [idx]);

    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 transition-all ${
                    tutorialHighlight
                        ? 'text-blue-400 scale-125 animate-pulse'
                        : isActive
                          ? 'text-blue-500'
                          : 'text-slate-500 hover:text-slate-300'
                }`
            }
        >
            {icon}
            <span className="text-[10px] font-medium">{t(tKey)}</span>
        </NavLink>
    );
}
