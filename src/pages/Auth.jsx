import React, { useState } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase';
import { Dumbbell, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '../components/Toast';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default function Auth() {
    const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const toast = useToast();

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            if (mode === 'register') {
                await createUserWithEmailAndPassword(auth, email, password);
                toast.success('Cuenta creada correctamente');
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(getErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setError(null);
        setLoading(true);
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err) {
            if (err.code !== 'auth/popup-closed-by-user') {
                setError(getErrorMessage(err.code));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        if (!email) {
            setError('Introduce tu email');
            return;
        }
        setError(null);
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            toast.success('Email de recuperación enviado. Revisa tu bandeja.');
            setMode('login');
        } catch (err) {
            setError(getErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };

    if (mode === 'reset') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <div className="w-full max-w-sm space-y-6">
                    <header className="text-center">
                        <Dumbbell size={40} className="text-blue-500 mx-auto mb-3" />
                        <h1 className="text-xl font-bold text-white">Recuperar contraseña</h1>
                        <p className="text-sm text-slate-400 mt-1">Te enviaremos un email para resetearla</p>
                    </header>
                    <form onSubmit={handleReset} className="space-y-4">
                        <InputField
                            icon={<Mail size={16} />}
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={setEmail}
                        />
                        {error && <p className="text-rose-400 text-xs text-center">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />} Enviar email
                        </button>
                    </form>
                    <button
                        onClick={() => setMode('login')}
                        className="w-full text-center text-sm text-slate-400 hover:text-white"
                    >
                        Volver al login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="w-full max-w-sm space-y-6">
                <header className="text-center">
                    <Dumbbell size={40} className="text-blue-500 mx-auto mb-3" />
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                        TrainEat
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {mode === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
                    </p>
                </header>

                {/* Google */}
                <button
                    onClick={handleGoogle}
                    disabled={loading}
                    className="w-full py-3 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    <svg width="18" height="18" viewBox="0 0 48 48">
                        <path
                            fill="#EA4335"
                            d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.8-6.8C35.9 2.4 30.2 0 24 0 14.6 0 6.7 5.6 2.8 13.7l7.9 6.2C12.8 13.5 17.9 9.5 24 9.5z"
                        />
                        <path
                            fill="#4285F4"
                            d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h12.4c-.5 2.8-2.2 5.2-4.6 6.8l7.1 5.5c4.2-3.8 6.6-9.5 6.6-16.4z"
                        />
                        <path
                            fill="#34A853"
                            d="M10.7 28.6A14.5 14.5 0 019.5 24c0-1.6.3-3.2.7-4.6l-7.9-6.2A23.9 23.9 0 000 24c0 3.9.9 7.6 2.6 10.8l8.1-6.2z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2.2 1.5-5 2.3-8.8 2.3-6.1 0-11.2-4-13.1-9.6l-8 6.2C6.7 42.4 14.6 48 24 48z"
                        />
                    </svg>
                    Continuar con Google
                </button>

                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-xs text-slate-500">o con email</span>
                    <div className="flex-1 h-px bg-slate-800" />
                </div>

                {/* Email/Password */}
                <form onSubmit={handleEmailAuth} className="space-y-3">
                    <InputField
                        icon={<Mail size={16} />}
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={setEmail}
                    />
                    <div className="relative">
                        <InputField
                            icon={<Lock size={16} />}
                            type={showPw ? 'text' : 'password'}
                            placeholder="Contraseña"
                            value={password}
                            onChange={setPassword}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPw(!showPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    {error && <p className="text-rose-400 text-xs text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                    </button>
                </form>

                <div className="text-center space-y-2">
                    {mode === 'login' ? (
                        <>
                            <button
                                onClick={() => setMode('reset')}
                                className="text-xs text-slate-500 hover:text-blue-400"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                            <p className="text-sm text-slate-400">
                                ¿No tienes cuenta?{' '}
                                <button
                                    onClick={() => {
                                        setMode('register');
                                        setError(null);
                                    }}
                                    className="text-blue-400 font-bold hover:underline"
                                >
                                    Regístrate
                                </button>
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-slate-400">
                            ¿Ya tienes cuenta?{' '}
                            <button
                                onClick={() => {
                                    setMode('login');
                                    setError(null);
                                }}
                                className="text-blue-400 font-bold hover:underline"
                            >
                                Inicia sesión
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

function InputField({ icon, type, placeholder, value, onChange }) {
    return (
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 focus-within:border-blue-500 transition-colors">
            <span className="text-slate-500">{icon}</span>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="bg-transparent flex-1 text-sm text-white outline-none placeholder:text-slate-600"
                required
            />
        </div>
    );
}

function getErrorMessage(code) {
    const map = {
        'auth/invalid-email': 'Email no válido',
        'auth/user-disabled': 'Cuenta desactivada',
        'auth/user-not-found': 'No existe una cuenta con ese email',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/email-already-in-use': 'Ya existe una cuenta con ese email',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
        'auth/invalid-credential': 'Email o contraseña incorrectos',
        'auth/network-request-failed': 'Error de red. Comprueba tu conexión.',
    };
    return map[code] || 'Error de autenticación. Inténtalo de nuevo.';
}
