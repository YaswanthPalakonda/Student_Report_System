import React, { useState, useEffect } from 'react';
import './Teacher.css';

const K = {
users: 'users',
reports: 'reports',
settings: 'gradingSettings',
maps: 'teacherAssignments',
current: 'currentUser',
theme: 'theme'
};

const read = (key, fallback = []) => {
try {
return JSON.parse(localStorage.getItem(key)) ?? fallback;
} catch {
return fallback;
}
};

const write = (key, value) => {
localStorage.setItem(key, JSON.stringify(value));
};

function Teacher() {


const currentUser = read(K.current, null);

const [activeSection, setActiveSection] = useState('dashboard');

const [theme, setTheme] = useState(
    localStorage.getItem(K.theme) || 'light'
);

const [users] = useState(() => read(K.users));

const [reports, setReports] = useState(() => read(K.reports));

const [mappings] = useState(() => read(K.maps));

const [rosterClass, setRosterClass] = useState('all');

const [reportSearch, setReportSearch] = useState('');

const [reportFilter, setReportFilter] = useState('all');

const [formMessage, setFormMessage] = useState('');

const [editingId, setEditingId] = useState(null);

const [form, setForm] = useState({
    studentEmail: '',
    reportClass: '',
    subject: '',
    testMarks: 0,
    examMarks: 0,
    attendance: '',
    attendanceStatus: 'Present',
    remarks: ''
});

// Grading settings

const settings = read(K.settings, {
    passMark: 40,
    grades: [
        { label: 'A+', min: 90 },
        { label: 'A', min: 80 },
        { label: 'B', min: 70 },
        { label: 'C', min: 60 },
        { label: 'D', min: 50 },
        { label: 'F', min: 0 }
    ]
});

const grade = marks => {
    return [...settings.grades]
        .sort((a, b) => b.min - a.min)
        .find(g => marks >= g.min)?.label || 'F';
};

const assigned = mappings.filter(
    m => m.teacherEmail === currentUser?.email
);

const classes = [...new Set(
    assigned.map(m => m.className)
)];

const students = users.filter(
    u =>
        u.role === 'student' &&
        (!u.className || classes.includes(u.className))
);

const teacherReports = reports.filter(
    r => r.teacherEmail === currentUser?.email
);

// Theme

useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(K.theme, theme);
}, [theme]);

const toggleTheme = () => {
    setTheme(prev =>
        prev === 'dark' ? 'light' : 'dark'
    );
};

// Navigation

const showSection = section => {
    setActiveSection(section);
    setFormMessage('');
};

// Dashboard calculations

const average = teacherReports.length
    ? teacherReports.reduce(
        (sum, r) => sum + Number(r.marks || 0), 0
    ) / teacherReports.length
    : 0;

// Form calculations

const totalMarks =
    Number(form.testMarks || 0) +
    Number(form.examMarks || 0);

const liveGrade = grade(totalMarks);

const liveResult =
    totalMarks >= settings.passMark ? 'Pass' : 'Fail';

// Student selection

const updateStudent = email => {
    const selected = users.find(
        u => u.email === email
    );

    setForm(prev => ({
        ...prev,
        studentEmail: email,
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
        studentEmail: '',
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

const handleSubmit = e => {
    e.preventDefault();

    const student = users.find(
        u => u.email === form.studentEmail
    );

    if (!student) {
        setFormMessage('Please select a valid student.');
        return;
    }

    const test = Number(form.testMarks);
    const exam = Number(form.examMarks);
    const attendance = Number(form.attendance);

    if (
        test < 0 || test > 40 ||
        exam < 0 || exam > 60 ||
        test + exam > 100 ||
        attendance < 0 || attendance > 100
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

    const reportData = {
        studentEmail: student.email,
        studentName: student.name,
        studentId: student.studentId || '',
        className: student.className || '',
        subject: form.subject.trim(),
        testMarks: test,
        examMarks: exam,
        marks: test + exam,
        percentage: test + exam,
        grade: grade(test + exam),
        result:
            test + exam >= settings.passMark
                ? 'Pass'
                : 'Fail',
        attendance,
        attendanceStatus: form.attendanceStatus,
        remarks: form.remarks.trim(),
        teacherEmail: currentUser.email,
        date: new Date().toLocaleDateString()
    };

    let updatedReports;

    if (editingId !== null) {

        updatedReports = reports.map(r =>
            r.id === editingId
                ? { ...r, ...reportData }
                : r
        );

        setFormMessage('Report updated successfully.');

    } else {

        updatedReports = [
            ...reports,
            {
                id: Date.now(),
                ...reportData
            }
        ];

        setFormMessage(
            'Report saved successfully. The student portal will reflect it immediately.'
        );
    }

    setReports(updatedReports);
    write(K.reports, updatedReports);

    resetForm();
};

// Class roster

const rosterStudents = users.filter(u => {
    return (
        u.role === 'student' &&
        classes.includes(u.className) &&
        (
            rosterClass === 'all' ||
            u.className === rosterClass
        )
    );
});

const getLatestReport = email => {
    return reports.filter(
        r =>
            r.studentEmail === email &&
            r.teacherEmail === currentUser?.email
    ).slice(-1)[0];
};

// Reports filtering

const filteredReports = teacherReports
    .filter(r =>
        `${r.studentName} ${r.subject}`
            .toLowerCase()
            .includes(reportSearch.toLowerCase())
    )
    .filter(
        r =>
            reportFilter === 'all' ||
            r.result === reportFilter
    )
    .slice()
    .reverse();

// Edit report

const editReport = report => {

    setEditingId(report.id);

    setForm({
        studentEmail: report.studentEmail,
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

    showSection('addReport');
};

// Logout

const logout = () => {
    localStorage.removeItem(K.current);
    window.location.href = '/login';
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
                                >
                                    {editingId !== null
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
