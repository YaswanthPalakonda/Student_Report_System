import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/auth';
import { preference } from '../../lib/preferences';
import './Auth.css';

function Login() {
    const { user, login, loading, error: sessionError } = useAuth();
    const [email, setEmail] = useState(() => preference('rememberedUser', {})?.email || '');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(() => Boolean(preference('rememberedUser', {})?.email));
    const [showPassword, setShowPassword] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('theme', theme);
    }, [theme]);
    const toggleTheme = () => setTheme(previous => previous === 'dark' ? 'light' : 'dark');
    const togglePassword = () => setShowPassword(previous => !previous);
    const handleLogin = async event => {
        event.preventDefault();
        if (busy) return;
        setBusy(true); setMessage('');
        try {
            const normalizedEmail = email.trim().toLowerCase();
            await login(normalizedEmail, password);
            if (rememberMe) localStorage.setItem('rememberedUser', JSON.stringify({ email: normalizedEmail }));
            else localStorage.removeItem('rememberedUser');
            setPassword('');
        } catch (err) { setMessage(err.message); }
        finally { setBusy(false); }
    };
    if (user) return <Navigate to={`/${user.role}`} replace />;
    return (

        <div className="auth-shell">

            {/* Left Hero Section */}

            <div className="auth-hero">

                <div className="hero-orb orb-a"></div>

                <div className="hero-orb orb-b"></div>

                <div className="hero-content">

                    <div className="brand-mark">
                        SR
                    </div>

                    <span className="eyebrow">
                        ACADEMIC MANAGEMENT
                    </span>

                    <h1>
                        Student Report
                        <span> System</span>
                    </h1>

                    <p>
                        One beautiful workspace for student performance,
                        attendance, grading and academic feedback.
                    </p>

                    <div className="hero-pills">

                        <span>
                            ⚡ Shared academic records
                        </span>

                        <span>
                            🔐 Role-based access
                        </span>

                        <span>
                            📊 Smart reports
                        </span>

                    </div>

                </div>

            </div>

            {/* Login Card */}

            <main className="auth-card">

                <button
                    className="theme-toggle"
                    id="themeToggle"
                    type="button"
                    aria-label="Toggle theme"
                    onClick={toggleTheme}
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>

                <section id="loginView">

                    <div className="form-head">

                        <span className="eyebrow">
                            WELCOME BACK
                        </span>

                        <h2>
                            Sign in to your portal
                        </h2>

                        <p>
                            Sign in with the credentials provided by
                            your university administrator.
                        </p>

                    </div>

                    <form id="loginForm" onSubmit={handleLogin}>

                        <label>
                            Email

                            <input
                                type="email"
                                id="loginEmail"
                                placeholder="you@school.com"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />

                        </label>

                        <label>
                            Password

                            <div className="password-wrap">

                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="loginPassword"
                                    aria-label="Password"
                                    placeholder="Enter password"
                                    required
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    id="passwordToggle"
                                    aria-label={
                                        showPassword
                                            ? 'Hide password'
                                            : 'Show password'
                                    }
                                    title={
                                        showPassword
                                            ? 'Hide password'
                                            : 'Show password'
                                    }
                                    onClick={togglePassword}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>

                            </div>

                        </label>

                        <div className="form-row">

                            <label className="check">

                                <input
                                    type="checkbox"
                                    id="rememberMe"
                                    checked={rememberMe}
                                    onChange={e =>
                                        setRememberMe(e.target.checked)
                                    }
                                />

                                Remember me

                            </label>

                            <span className="credential-note">
                                Credentials are provided by Admin
                            </span>

                        </div>

                        <button
                            className="primary-btn"
                            type="submit"
                            disabled={busy || loading}
                        >
                            Sign in
                            <span>→</span>
                        </button>

                        <p className="message">
                            {message || sessionError || (loading ? 'Restoring your session…' : busy ? 'Signing in…' : '')}
                        </p>

                    </form>

                </section>


            </main>

        </div>

    );

}

export default Login;
