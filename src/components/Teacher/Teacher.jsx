import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth';
import { usePortal } from '../../hooks/usePortal';
import PortalStatus from '../PortalStatus';
import './Teacher.css';

function Teacher() {
    const { user: currentUser, logout } = useAuth();
    const portal = usePortal('teacher');
    const { users, reports, mappings, settings, mutate, busy } = portal;
    const [activeSection, setActiveSection] = useState('dashboard');
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [rosterClass, setRosterClass] = useState('all');
    const [reportSearch, setReportSearch] = useState('');
    const [reportFilter, setReportFilter] = useState('all');
    const [formMessage, setFormMessage] = useState('');
    const [editingId, setEditingId] = useState(null);
    const emptyForm = { studentEmail: '', reportClass: '', subjectId: '', testMarks: 0, examMarks: 0, attendance: '', attendanceStatus: 'Present', remarks: '', revision: 0 };
    const [form, setForm] = useState(emptyForm);
    const grade = marks => [...settings.grades].sort((a, b) => b.min - a.min).find(g => marks >= g.min)?.label || 'F';
    const assigned = mappings;
    const classes = [...new Set(assigned.map(m => m.className))];
    const students = users;
    const teacherReports = reports;
    const selectedStudent = students.find(s => s.email === form.studentEmail);
    const availableSubjects = assigned.filter(a => a.classId === selectedStudent?.classId);
    useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('theme', theme); }, [theme]);
    const toggleTheme = () => setTheme(previous => previous === 'dark' ? 'light' : 'dark');
    const showSection = section => { setActiveSection(section); setFormMessage(''); };
    const average = reports.length ? reports.reduce((sum, r) => sum + r.marks, 0) / reports.length : 0;
    const totalMarks = Number(form.testMarks || 0) + Number(form.examMarks || 0);
    const liveGrade = grade(totalMarks);
    const liveResult = totalMarks >= settings.passMark ? 'Pass' : 'Fail';
    const updateStudent = email => {
        const selected = students.find(s => s.email === email);
        setForm(previous => ({ ...previous, studentEmail: email, reportClass: selected?.className || '', subjectId: '' }));
    };
    const handleChange = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));
    const resetForm = () => { setForm(emptyForm); setEditingId(null); };
    const handleSubmit = async event => {
        event.preventDefault();
        if (!selectedStudent || !form.subjectId) { setFormMessage('Select an assigned student and subject.'); return; }
        const body = { studentId: selectedStudent.id, subjectId: form.subjectId, testMarks: Number(form.testMarks), examMarks: Number(form.examMarks), attendance: Number(form.attendance), attendanceStatus: form.attendanceStatus, remarks: form.remarks };
        if (editingId) body.revision = form.revision;
        // A duplicate subject is opened for explicit editing rather than silently overwriting it.
        const existing = reports.find(r => r.studentRecordId === selectedStudent.id && r.classId === selectedStudent.classId && r.subjectId === form.subjectId);
        if (!editingId && existing) { setFormMessage('This student already has a report for this subject. Open it from My Reports to update it.'); return; }
        const saved = await mutate(editingId ? `/reports/${editingId}` : '/reports', editingId ? 'PATCH' : 'POST', body);
        if (saved) {
            setFormMessage('Report saved successfully! Students can view the updated report after refreshing their page.');
            resetForm();
        }
    };
    const rosterStudents = users.filter(u => rosterClass === 'all' || u.className === rosterClass);
    const getLatestReport = email => reports.filter(r => r.studentEmail === email).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
    const filteredReports = reports.filter(r => `${r.studentName} ${r.subject}`.toLowerCase().includes(reportSearch.toLowerCase())).filter(r => reportFilter === 'all' || r.result === reportFilter).slice().reverse();
    const editReport = report => {
        setEditingId(report.id);
        setForm({ studentEmail: report.studentEmail, reportClass: report.className, subjectId: report.subjectId, testMarks: report.testMarks, examMarks: report.examMarks, attendance: report.attendance, attendanceStatus: report.attendanceStatus, remarks: report.remarks, revision: report.revision });
        setActiveSection('addReport'); setFormMessage('Editing an existing report.');
    };
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
                            className={`nav-btn ${activeSection === id ? 'active' : ''
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
                    <PortalStatus {...portal} />

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
                                    <strong>{students.length}</strong>
                                    <small>Across assigned classes</small>
                                </div>

                                <div className="stat-card orange">
                                    <span>Reports</span>
                                    <strong>{teacherReports.length}</strong>
                                    <small>Across your assignments</small>
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

                                    {classes.map(c => (
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

                                                const r = getLatestReport(s.email);

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
                                                                {r?.grade || '—'}
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
                                                name="studentEmail"
                                                aria-label="Student"
                                                disabled={Boolean(editingId)}
                                                value={form.studentEmail}
                                                onChange={e => updateStudent(e.target.value)}
                                                required
                                            >

                                                <option value="">
                                                    Select student
                                                </option>

                                                {students.map(s => (
                                                    <option
                                                        key={s.id || s.email}
                                                        value={s.email}
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

                                            <select aria-label="Subject" name="subjectId" required disabled={Boolean(editingId)} value={form.subjectId} onChange={handleChange}>
                                                <option value="">Select assigned subject</option>
                                                {availableSubjects.map(a => <option key={a.id} value={a.subjectId}>{a.subject}</option>)}
                                            </select>

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
                                        disabled={busy || portal.loading}
                                    >
                                        {editingId !== null
                                            ? 'Update Student Report'
                                            : 'Save Student Report'}
                                    </button>

                                    {editingId && <button type="button" className="small-btn" onClick={resetForm}>Cancel edit</button>}
                                    <p className="message" role="status">
                                        {formMessage || portal.error}
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

                                        {filteredReports.length > 0 ? (

                                            filteredReports.map(r => (

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
                                                        <span className={`badge ${(r.result || '').toLowerCase()
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
