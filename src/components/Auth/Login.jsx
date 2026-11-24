import React, { useState, useEffect } from 'react';
import './Auth.css';

const KEYS = {
    users: 'users',
    reports: 'reports',
    settings: 'gradingSettings',
    current: 'currentUser',
    remember: 'rememberedUser',
    theme: 'theme'
};

const defaults = {
    grades: [
        { label: 'A+', min: 90 },
        { label: 'A', min: 80 },
        { label: 'B', min: 70 },
        { label: 'C', min: 60 },
        { label: 'D', min: 50 },
        { label: 'F', min: 0 }
    ],
    passMark: 40
};

function read(key, fallback = []) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
}

function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function Login() {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [rememberMe, setRememberMe] = useState(false);

    const [showPassword, setShowPassword] = useState(false);

    const [theme, setTheme] = useState(
        localStorage.getItem(KEYS.theme) || 'light'
    );

    const [message, setMessage] = useState('');

    // Initialize application data

    useEffect(() => {

        let users = read(KEYS.users);

        if (!users.some(u => u.email === 'admin@school.com')) {

            users.unshift({
                id: 'admin-1',
                name: 'System Administrator',
                email: 'admin@school.com',
                password: 'admin123',
                role: 'admin'
            });

        }

        write(KEYS.users, users);

        if (!localStorage.getItem(KEYS.reports)) {
            write(KEYS.reports, []);
        }

        if (!localStorage.getItem(KEYS.settings)) {
            write(KEYS.settings, defaults);
        }

        const remembered = read(KEYS.remember, null);

        if (remembered?.email) {
            setEmail(remembered.email);
            setRememberMe(true);
        }

    }, []);

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

    const handleLogin = e => {

        e.preventDefault();

        const normalizedEmail = email.trim().toLowerCase();

        const users = read(KEYS.users);

        const user = users.find(
            u =>
                u.email.toLowerCase() === normalizedEmail &&
                u.password === password
        );

        if (!user) {

            setMessage(
                'Invalid email or password. Please use the credentials provided by Admin.'
            );

            return;

        }

        // Save current user

        write(KEYS.current, user);

        // Remember email

        if (rememberMe) {

            write(KEYS.remember, {
                email: normalizedEmail
            });

        } else {

            localStorage.removeItem(KEYS.remember);

        }

        // Role-based navigation

        if (user.role === 'admin') {

            window.location.href = '/admin';

        } else if (user.role === 'teacher') {

            window.location.href = '/teacher';

        } else if (user.role === 'student') {

            window.location.href = '/student';

        } else {

            setMessage('Invalid user role.');

        }

    };

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
                            ⚡ Real-time local data
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
                        >
                            Sign in
                            <span>→</span>
                        </button>

                        <p className="message">
                            {message}
                        </p>

                    </form>

                </section>


            </main>

        </div>

    );

}

export default Login;