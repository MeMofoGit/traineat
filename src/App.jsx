import React, { lazy, Suspense } from 'react';
import * as Sentry from '@sentry/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Layout from './components/Layout';

// Lazy load pages — cada una en su chunk separado
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Diet = lazy(() => import('./pages/Diet'));
const Training = lazy(() => import('./pages/Training'));
const Profile = lazy(() => import('./pages/Profile'));
const Fridge = lazy(() => import('./pages/Fridge'));
const Auth = lazy(() => import('./pages/Auth'));
const About = lazy(() => import('./pages/About'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const SharedView = lazy(() => import('./pages/SharedView'));
import HealthDisclaimer from './components/HealthDisclaimer';
import { useDisclaimer } from './hooks/useDisclaimer';
import Onboarding from './components/Onboarding';
import { useOnboarding } from './hooks/useOnboarding';
import AppTutorial from './components/AppTutorial';
import { useTutorial } from './hooks/useTutorial';

import { PlanProvider, usePlan } from './hooks/usePlan';
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

function AuthGate() {
    const { authUser, authReady } = usePlan();
    const { accepted, accept } = useDisclaimer();
    const { done: onboardingDone, finish: finishOnboarding } = useOnboarding();
    const { done: tutorialDone, finish: finishTutorial } = useTutorial();
    const { updateUser } = usePlan();

    if (!authReady) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 size={32} className="text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!authUser) {
        return <Auth />;
    }

    return (
        <>
            {!accepted && <HealthDisclaimer onAccept={accept} />}
            {accepted && !onboardingDone && (
                <Onboarding
                    onFinish={() => {
                        finishOnboarding();
                        window.history.replaceState(null, '', '/');
                    }}
                    onSave={updateUser}
                />
            )}
            {accepted && onboardingDone && !tutorialDone && <AppTutorial onFinish={finishTutorial} />}
            <Suspense
                fallback={
                    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                        <Loader2 size={24} className="text-blue-500 animate-spin" />
                    </div>
                }
            >
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Dashboard />} />
                        <Route path="diet" element={<Diet />} />
                        <Route path="fridge" element={<Fridge />} />
                        <Route path="training" element={<Training />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="about" element={<About />} />
                        <Route path="privacy" element={<Privacy />} />
                        <Route path="terms" element={<Terms />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                </Routes>
            </Suspense>
        </>
    );
}

function App() {
    return (
        <Sentry.ErrorBoundary fallback={<FallbackUI />}>
            <PlanProvider>
                <ToastProvider>
                    <Router>
                        <Suspense
                            fallback={
                                <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                                    <Loader2 size={24} className="text-blue-500 animate-spin" />
                                </div>
                            }
                        >
                            <Routes>
                                <Route path="/shared/:tokenId" element={<SharedView />} />
                                <Route path="/*" element={<AuthGate />} />
                            </Routes>
                        </Suspense>
                    </Router>
                </ToastProvider>
            </PlanProvider>
        </Sentry.ErrorBoundary>
    );
}

export default App;
