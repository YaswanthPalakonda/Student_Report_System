import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import './Auth.css';

const KEYS = {
    remember: 'rememberedUser',
    theme: 'theme'
};

const ROLE_ROUTES = {
    admin: '/admin',
    teacher: '/teacher',
    student: '/student'
};

function readRememberedEmail() {
    try {
        const stored = JSON.parse(localStorage.getItem(KEYS.remember) || 'null');
        return typeof stored?.email === 'string' ? stored.email : '';
    } catch {
        return '';
    }
}

function Login() {
    const navigate = useNavigate();
    const { user, loading, login } = useAuth();

    const [email, setEmail] = useState(() => readRememberedEmail());
    const [password, setPassword] = useState('');

    const [rememberMe, setRememberMe] = useState(() => Boolean(readRememberedEmail()));

    const [showPassword, setShowPassword] = useState(false);

    const [theme, setTheme] = useState(
        localStorage.getItem(KEYS.theme) || 'light'
    );

    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Theme management

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem(KEYS.theme, theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev =>
            prev === 'dark' ? 'light' : 'dark'
        );
    };

    // Password visibility

    const togglePassword = () => {
        setShowPassword(prev => !prev);
    };

    // Login functionality

    const handleLogin = async e => {
        e.preventDefault();
        setMessage('');

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail || !password) {
            setMessage('Please enter both email and password.');
            return;
        }

        setSubmitting(true);

        try {
            const authenticatedUser = await login({
                email: normalizedEmail,
                password,
                rememberMe
            });

            if (rememberMe) {
                localStorage.setItem(
                    KEYS.remember,
                    JSON.stringify({ email: normalizedEmail })
                );
            } else {
                localStorage.removeItem(KEYS.remember);
            }

            const targetRoute = ROLE_ROUTES[authenticatedUser?.role];

            if (targetRoute) {
                navigate(targetRoute, { replace: true });
            } else {
                setMessage('Invalid user role.');
            }
        } catch (error) {
            setMessage(
                error?.message ||
                    'Invalid email or password. Please use the credentials provided by Admin.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (!loading && user && ROLE_ROUTES[user.role]) {
        return <Navigate to={ROLE_ROUTES[user.role]} replace />;
    }

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
                            ⚡ Real-time cloud data
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
                            disabled={submitting}
                        >
                            {submitting ? 'Signing in...' : 'Sign in'}
                            <span>→</span>
                        </button>

                        <p className={`message ${message ? 'error' : ''}`}>
                            {message}
                        </p>

                    </form>

                </section>

            </main>

        </div>
    );
}

export default Login;
