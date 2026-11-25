import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/useAuth';
import './Teacher.css';

const THEME_KEY = 'theme';

const defaultSettings = {
    passMark: 40,
    grades: [
        { label: 'A+', min: 90 },
        { label: 'A', min: 80 },
        { label: 'B', min: 70 },
        { label: 'C', min: 60 },
        { label: 'D', min: 50 },
        { label: 'F', min: 0 }
    ]
};

const defaultOverview = {
    assignments: [],
    classes: [],
    studentCount: 0,
    reportCount: 0,
    averageMarks: 0
};

function Teacher() {
    const { user: currentUser, logout: authLogout } = useAuth();

    const [activeSection, setActiveSection] = useState('dashboard');

    const [theme, setTheme] = useState(
        localStorage.getItem(THEME_KEY) || 'light'
    );

    const [overview, setOverview] = useState(defaultOverview);
    const [rosterStudents, setRosterStudents] = useState([]);
    const [rosterClasses, setRosterClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [reports, setReports] = useState([]);
    const [settings, setSettings] = useState(defaultSettings);

    const [rosterClass, setRosterClass] = useState('all');

    const [reportSearch, setReportSearch] = useState('');

    const [reportFilter, setReportFilter] = useState('all');

    const [formMessage, setFormMessage] = useState('');
    const [pageError, setPageError] = useState('');
    const [savingReport, setSavingReport] = useState(false);

    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        studentUserId: '',
        reportClass: '',
        subject: '',
        testMarks: 0,
        examMarks: 0,
        attendance: '',
        attendanceStatus: 'Present',
        remarks: ''
    });

    // Theme

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem(THEME_KEY, theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev =>
            prev === 'dark' ? 'light' : 'dark'
        );
    };

    // Data loaders

    const loadOverview = useCallback(async () => {
        const data = await api.getTeacherOverview();
        if (data?.overview) {
            setOverview(data.overview);
        }
    }, []);

    const loadRoster = useCallback(async () => {
        const query = rosterClass !== 'all' ? { className: rosterClass } : undefined;
        const data = await api.getTeacherRoster(query);
        setRosterStudents(data?.students || []);
        setRosterClasses(data?.classes || []);
    }, [rosterClass]);

    const loadStudents = useCallback(async () => {
        const data = await api.getTeacherStudents();
        setStudents(data?.students || []);
    }, []);

    const loadReports = useCallback(async () => {
        const query = {};
        if (reportSearch.trim()) query.search = reportSearch.trim();
        if (reportFilter !== 'all') query.result = reportFilter;

        const data = await api.listReports(query);
        setReports(data?.reports || []);
    }, [reportSearch, reportFilter]);

    const loadSettings = useCallback(async () => {
        const data = await api.getSettings();
        if (data?.gradingPolicy) {
            setSettings(data.gradingPolicy);
        }
    }, []);

    useEffect(() => {
        let active = true;

        (async () => {
            setPageError('');
            try {
                if (activeSection === 'dashboard') {
                    await Promise.all([loadOverview(), loadSettings()]);
                } else if (activeSection === 'roster') {
                    await loadRoster();
                } else if (activeSection === 'addReport') {
                    await Promise.all([loadStudents(), loadSettings()]);
                } else if (activeSection === 'reports') {
                    await loadReports();
                }
            } catch (err) {
                if (active) {
                    setPageError(err?.message || 'Failed to load teacher data.');
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [
        activeSection,
        loadOverview,
        loadRoster,
        loadStudents,
        loadReports,
        loadSettings
    ]);

    // Grade preview helper (backend remains authoritative on save)

    const grade = marks => {
        return [...(settings.grades || defaultSettings.grades)]
            .sort((a, b) => b.min - a.min)
            .find(g => marks >= g.min)?.label || 'F';
    };

    // Navigation

    const showSection = section => {
        setActiveSection(section);
        setFormMessage('');
        setPageError('');
    };

    // Form calculations

    const totalMarks =
        Number(form.testMarks || 0) +
        Number(form.examMarks || 0);

    const liveGrade = grade(totalMarks);

    const liveResult =
        totalMarks >= (settings.passMark ?? 40) ? 'Pass' : 'Fail';

    // Student selection

    const updateStudent = studentUserId => {
        const selected = students.find(
            u => u.id === studentUserId
        );

        setForm(prev => ({
            ...prev,
            studentUserId,
            reportClass: selected?.className || ''
        }));
    };

    // Form input handling

    const handleChange = e => {
        const { name, value } = e.target;

        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Reset form

    const resetForm = () => {
        setForm({
            studentUserId: '',
            reportClass: '',
            subject: '',
            testMarks: 0,
            examMarks: 0,
            attendance: '',
            attendanceStatus: 'Present',
            remarks: ''
        });

        setEditingId(null);
    };

    // Save or update report

    const handleSubmit = async e => {
        e.preventDefault();
        setFormMessage('');

        if (!form.studentUserId) {
            setFormMessage('Please select a valid student.');
            return;
        }

        const test = Number(form.testMarks);
        const exam = Number(form.examMarks);
        const attendance = Number(form.attendance);

        if (
            Number.isNaN(test) || test < 0 || test > 40 ||
            Number.isNaN(exam) || exam < 0 || exam > 60 ||
            test + exam > 100 ||
            form.attendance === '' || Number.isNaN(attendance) || attendance < 0 || attendance > 100
        ) {
            setFormMessage(
                'Please enter valid marks and attendance.'
            );
            return;
        }

        if (!form.subject.trim()) {
            setFormMessage('Please enter a subject.');
            return;
        }

        const payload = {
            studentUserId: form.studentUserId,
            subject: form.subject.trim(),
            testMarks: test,
            examMarks: exam,
            attendance,
            attendanceStatus: form.attendanceStatus,
            remarks: form.remarks.trim()
        };

        setSavingReport(true);

        try {
            if (editingId !== null) {
                await api.updateReport(editingId, payload);
                setFormMessage('Report updated successfully.');
            } else {
                await api.createReport(payload);
                setFormMessage(
                    'Report saved successfully. The student portal will reflect it immediately.'
                );
            }

            resetForm();
            await Promise.all([loadOverview(), loadReports(), loadRoster()]);
        } catch (err) {
            setFormMessage(err?.message || 'Unable to save report.');
        } finally {
            setSavingReport(false);
        }
    };

    // Edit report

    const editReport = report => {
        setEditingId(report.id);

        setForm({
            studentUserId: report.studentUserId || '',
            reportClass: report.className || '',
            subject: report.subject,
            testMarks: report.testMarks ?? report.marks,
            examMarks: report.examMarks ?? 0,
            attendance: report.attendance,
            attendanceStatus:
                report.attendanceStatus || 'Present',
            remarks: report.remarks || ''
        });

        setFormMessage(
            'Editing a report: saving will update the existing report.'
        );

        setActiveSection('addReport');
    };

    // Logout

    const logout = async () => {
        await authLogout();
    };

    // Authentication

    if (!currentUser || currentUser.role !== 'teacher') {
        return (
            <div className="access-denied">
                <h2>Teacher Access Required</h2>
                <p>Please log in using your teacher account.</p>
            </div>
        );
    }

    const assigned = overview.assignments || [];
    const classes = overview.classes || [];
    const average = Number(overview.averageMarks || 0);
    const availableRosterClasses = rosterClasses.length ? rosterClasses : classes;

    return (
        <div className="teacher-container">

            {/* Header */}

            <header className="topbar">

                <div className="brand">
                    <span className="brand-icon">SR</span>

                    <div>
                        <strong>Student Report System</strong>
                        <small>Teacher Portal</small>
                    </div>
                </div>

                <div className="top-actions">

                    <button
                        className="icon-btn"
                        onClick={toggleTheme}
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>

                    <span className="user-chip">
                        {currentUser.name}
                    </span>

                    <button
                        className="danger-btn"
                        onClick={logout}
                    >
                        Logout
                    </button>

                </div>

            </header>

            <div className="app-shell">

                {/* Sidebar */}

                <aside className="sidebar">

                    <div className="side-title">
                        TEACHER WORKSPACE
                    </div>

                    {[
                        ['dashboard', '▦', 'Dashboard'],
                        ['roster', '♙', 'Class Roster'],
                        ['addReport', '✎', 'Marks & Attendance'],
                        ['reports', '▤', 'My Reports']
                    ].map(([id, icon, label]) => (

                        <button
                            key={id}
                            className={`nav-btn ${
                                activeSection === id ? 'active' : ''
                            }`}
                            onClick={() => showSection(id)}
                        >
                            {icon}
                            <span>{label}</span>
                        </button>

                    ))}

                </aside>

                {/* Main content */}

                <main className="content">
                    {pageError && (
                        <p className="message" style={{ color: '#ef4444', marginBottom: '16px' }}>
                            {pageError}
                        </p>
                    )}

                    {/* Dashboard */}

                    {activeSection === 'dashboard' && (

                        <section className="page-section">

                            <div className="page-head">

                                <div>

                                    <span className="eyebrow">
                                        TEACHING HUB
                                    </span>

                                    <h1>
                                        Welcome, {currentUser.name} 👋
                                    </h1>

                                    <p>
                                        Track your classes and student performance.
                                    </p>

                                </div>

                                <button
                                    className="primary-btn"
                                    onClick={() => showSection('addReport')}
                                >
                                    ＋ New Report
                                </button>

                            </div>

                            <div className="stats-grid">

                                <div className="stat-card purple">
                                    <span>Assigned Classes</span>
                                    <strong>{classes.length}</strong>
                                    <small>Your mapped classes</small>
                                </div>

                                <div className="stat-card cyan">
                                    <span>Students</span>
                                    <strong>{overview.studentCount}</strong>
                                    <small>Across assigned classes</small>
                                </div>

                                <div className="stat-card orange">
                                    <span>Reports</span>
                                    <strong>{overview.reportCount}</strong>
                                    <small>Submitted by you</small>
                                </div>

                                <div className="stat-card green">
                                    <span>Average Marks</span>
                                    <strong>{average.toFixed(1)}%</strong>
                                    <small>Your report average</small>
                                </div>

                            </div>

                            <div className="panel">

                                <div className="panel-head">

                                    <h2>Assigned Teaching Load</h2>

                                    <p>
                                        Classes and subjects mapped by the administrator.
                                    </p>

                                </div>

                                <div className="assignment-grid">

                                    {assigned.length > 0 ? (

                                        assigned.map((m, index) => (

                                            <div
                                                className="assignment"
                                                key={m.id || index}
                                            >

                                                <span>SUBJECT</span>

                                                <strong>{m.subject}</strong>

                                                <small>
                                                    {m.className} · {m.teacherName}
                                                </small>

                                            </div>

                                        ))

                                    ) : (

                                        <div className="empty">
                                            No class assignments yet. Ask the administrator to map your classes.
                                        </div>

                                    )}

                                </div>

                            </div>

                        </section>

                    )}

                    {/* Class Roster */}

                    {activeSection === 'roster' && (

                        <section className="page-section">

                            <div className="page-head">

                                <div>

                                    <span className="eyebrow">
                                        STUDENTS
                                    </span>

                                    <h1>Class Roster</h1>

                                    <p>
                                        Select an assigned class to see enrolled students.
                                    </p>

                                </div>

                            </div>

                            <div className="toolbar">

                                <select
                                    value={rosterClass}
                                    onChange={e => setRosterClass(e.target.value)}
                                >

                                    <option value="all">
                                        All assigned classes
                                    </option>

                                    {availableRosterClasses.map(c => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}

                                </select>

                            </div>

                            <div className="panel table-wrap">

                                <table>

                                    <thead>

                                        <tr>
                                            <th>Student</th>
                                            <th>Email</th>
                                            <th>Student ID</th>
                                            <th>Class</th>
                                            <th>Latest Grade</th>
                                            <th>Latest Attendance</th>
                                        </tr>

                                    </thead>

                                    <tbody>

                                        {rosterStudents.length > 0 ? (

                                            rosterStudents.map(s => {

                                                const r = s.latestReport;

                                                return (

                                                    <tr key={s.id || s.email}>

                                                        <td>
                                                            <strong>{s.name}</strong>
                                                        </td>

                                                        <td>{s.email}</td>

                                                        <td>{s.studentId || '—'}</td>

                                                        <td>{s.className || '—'}</td>

                                                        <td>
                                                            <span className="badge grade">
                                                                {s.latestGrade || r?.grade || '—'}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            {r
                                                                ? `${r.attendance}% · ${r.attendanceStatus || ''}`
                                                                : '—'}
                                                        </td>

                                                    </tr>

                                                );

                                            })

                                        ) : (

                                            <tr>
                                                <td colSpan="6" className="empty">
                                                    No students found in this class.
                                                </td>
                                            </tr>

                                        )}

                                    </tbody>

                                </table>

                            </div>

                        </section>

                    )}

                    {/* Marks and Attendance */}

                    {activeSection === 'addReport' && (

                        <section className="page-section">

                            <div className="page-head">

                                <div>

                                    <span className="eyebrow">
                                        ASSESSMENT
                                    </span>

                                    <h1>
                                        Marks, Attendance & Feedback
                                    </h1>

                                    <p>
                                        Enter test/exam marks and attendance for a student.
                                    </p>

                                </div>

                            </div>

                            <div className="panel form-panel">

                                <form onSubmit={handleSubmit}>

                                    <div className="form-grid">

                                        <label>
                                            Student

                                            <select
                                                name="studentUserId"
                                                value={form.studentUserId}
                                                onChange={e => updateStudent(e.target.value)}
                                                required
                                            >

                                                <option value="">
                                                    Select student
                                                </option>

                                                {students.map(s => (
                                                    <option
                                                        key={s.id}
                                                        value={s.id}
                                                    >
                                                        {s.name} · {s.className || 'Unassigned'}
                                                    </option>
                                                ))}

                                            </select>

                                        </label>

                                        <label>
                                            Class / Section

                                            <input
                                                name="reportClass"
                                                value={form.reportClass}
                                                readOnly
                                            />

                                        </label>

                                        <label>
                                            Subject

                                            <input
                                                name="subject"
                                                placeholder="e.g. Data Structures"
                                                value={form.subject}
                                                onChange={handleChange}
                                                required
                                            />

                                        </label>

                                        <label>
                                            Test / Internal Marks (40)

                                            <input
                                                type="number"
                                                name="testMarks"
                                                min="0"
                                                max="40"
                                                value={form.testMarks}
                                                onChange={handleChange}
                                                required
                                            />

                                        </label>

                                        <label>
                                            Exam Marks (60)

                                            <input
                                                type="number"
                                                name="examMarks"
                                                min="0"
                                                max="60"
                                                value={form.examMarks}
                                                onChange={handleChange}
                                                required
                                            />

                                        </label>

                                        <label>
                                            Total / Percentage

                                            <input
                                                type="number"
                                                value={totalMarks}
                                                readOnly
                                            />

                                        </label>

                                        <label>
                                            Attendance (%)

                                            <input
                                                type="number"
                                                name="attendance"
                                                min="0"
                                                max="100"
                                                placeholder="0 - 100"
                                                value={form.attendance}
                                                onChange={handleChange}
                                                required
                                            />

                                        </label>

                                        <label>
                                            Attendance Status

                                            <select
                                                name="attendanceStatus"
                                                value={form.attendanceStatus}
                                                onChange={handleChange}
                                            >
                                                <option>Present</option>
                                                <option>Late</option>
                                                <option>Absent</option>
                                            </select>

                                        </label>

                                        <label className="full">
                                            Teacher Remarks

                                            <textarea
                                                name="remarks"
                                                rows="4"
                                                placeholder="Add feedback or conduct remarks…"
                                                value={form.remarks}
                                                onChange={handleChange}
                                            />

                                        </label>

                                    </div>

                                    <div className="live-grade">

                                        <span>Live grade</span>

                                        <strong>{liveGrade}</strong>

                                        <small>{liveResult}</small>

                                    </div>

                                    <button
                                        className="primary-btn"
                                        type="submit"
                                        disabled={savingReport}
                                    >
                                        {savingReport
                                            ? 'Saving...'
                                            : editingId !== null
                                                ? 'Update Student Report'
                                                : 'Save Student Report'}
                                    </button>

                                    <p className="message">
                                        {formMessage}
                                    </p>

                                </form>

                            </div>

                        </section>

                    )}

                    {/* My Reports */}

                    {activeSection === 'reports' && (

                        <section className="page-section">

                            <div className="page-head">

                                <div>

                                    <span className="eyebrow">
                                        SUBMISSIONS
                                    </span>

                                    <h1>My Reports</h1>

                                    <p>
                                        Review and edit the reports you submitted.
                                    </p>

                                </div>

                            </div>

                            <div className="toolbar">

                                <input
                                    placeholder="Search student or subject…"
                                    value={reportSearch}
                                    onChange={e => setReportSearch(e.target.value)}
                                />

                                <select
                                    value={reportFilter}
                                    onChange={e => setReportFilter(e.target.value)}
                                >
                                    <option value="all">All results</option>
                                    <option value="Pass">Pass</option>
                                    <option value="Fail">Fail</option>
                                </select>

                            </div>

                            <div className="panel table-wrap">

                                <table>

                                    <thead>

                                        <tr>
                                            <th>Student</th>
                                            <th>Subject</th>
                                            <th>Test</th>
                                            <th>Exam</th>
                                            <th>Total</th>
                                            <th>Attendance</th>
                                            <th>Grade</th>
                                            <th>Result</th>
                                            <th>Action</th>
                                        </tr>

                                    </thead>

                                    <tbody>

                                        {reports.length > 0 ? (

                                            reports.map(r => (

                                                <tr key={r.id}>

                                                    <td>{r.studentName}</td>

                                                    <td>{r.subject}</td>

                                                    <td>{r.testMarks ?? '—'}</td>

                                                    <td>{r.examMarks ?? '—'}</td>

                                                    <td>
                                                        <strong>{r.marks}%</strong>
                                                    </td>

                                                    <td>{r.attendance}%</td>

                                                    <td>
                                                        <span className="badge grade">
                                                            {r.grade}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span className={`badge ${
                                                            (r.result || '').toLowerCase()
                                                        }`}>
                                                            {r.result}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <button
                                                            className="small-btn"
                                                            onClick={() => editReport(r)}
                                                        >
                                                            Edit
                                                        </button>
                                                    </td>

                                                </tr>

                                            ))

                                        ) : (

                                            <tr>
                                                <td colSpan="9" className="empty">
                                                    No reports submitted yet.
                                                </td>
                                            </tr>

                                        )}

                                    </tbody>

                                </table>

                            </div>

                        </section>

                    )}

                </main>

            </div>

        </div>
    );
}

export default Teacher;
