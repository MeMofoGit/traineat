import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Utensils, Dumbbell, User } from 'lucide-react';

export default function Layout() {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 pb-20 font-sans">
            <main className="max-w-md mx-auto min-h-screen relative bg-slate-950 shadow-2xl overflow-hidden">
                {/* Helper gradient for aesthetics */}
                <div className="fixed top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />

                <Outlet />
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-md border-t border-slate-800 z-40">
                <div className="max-w-md mx-auto flex justify-around items-center p-4">
                    <NavItem to="/" icon={<Home size={24} />} label="Inicio" />
                    <NavItem to="/diet" icon={<Utensils size={24} />} label="Dieta" />
                    <NavItem to="/training" icon={<Dumbbell size={24} />} label="Entreno" />
                    <NavItem to="/profile" icon={<User size={24} />} label="Mis Datos" />
                </div>
            </nav>
        </div>
    );
}

function NavItem({ to, icon, label }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`
            }
        >
            {icon}
            <span className="text-xs font-medium">{label}</span>
        </NavLink>
    );
}
