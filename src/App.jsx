import React from 'react';
import * as Sentry from '@sentry/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Diet from './pages/Diet';
import Training from './pages/Training';
import Profile from './pages/Profile';
import Fridge from './pages/Fridge';
import Layout from './components/Layout';

import { PlanProvider } from './hooks/usePlan';
import { ToastProvider } from './components/Toast';

function FallbackUI() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
                <div className="text-4xl mb-4">💥</div>
                <h1 className="text-xl font-bold text-white mb-2">Algo ha fallado</h1>
                <p className="text-sm text-slate-400 mb-6">
                    Se ha producido un error inesperado. El equipo ha sido notificado automáticamente.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold"
                >
                    Recargar la app
                </button>
            </div>
        </div>
    );
}

function App() {
    return (
        <Sentry.ErrorBoundary fallback={<FallbackUI />}>
            <PlanProvider>
                <ToastProvider>
                    <Router>
                        <Routes>
                            <Route path="/" element={<Layout />}>
                                <Route index element={<Dashboard />} />
                                <Route path="diet" element={<Diet />} />
                                <Route path="fridge" element={<Fridge />} />
                                <Route path="training" element={<Training />} />
                                <Route path="profile" element={<Profile />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Route>
                        </Routes>
                    </Router>
                </ToastProvider>
            </PlanProvider>
        </Sentry.ErrorBoundary>
    );
}

export default App;
