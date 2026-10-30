import React, { useState, useEffect } from 'react';
import './Student.css';

const K = {
  users: 'users',
  reports: 'reports',
  settings: 'gradingSettings',
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

function Student() {

  const currentUser = read(K.current, null);

  const [activeSection, setActiveSection] = useState('dashboard');

  const [theme, setTheme] = useState(
    localStorage.getItem(K.theme) || 'light'
  );

  const [reports, setReports] = useState(() =>
    read(K.reports).filter(
      r => r.studentEmail === currentUser?.email
    )
  );

  const [settings] = useState(() =>
    read(K.settings, defaultSettings)
  );

  // Theme management

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(K.theme, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Grade calculation

  const calculateGrade = marks => {
    return [...settings.grades]
      .sort((a, b) => b.min - a.min)
      .find(g => Number(marks) >= g.min)?.label || 'F';
  };

  // Dashboard calculations

  const averageMarks = reports.length
    ? reports.reduce((sum, r) =>
        sum + Number(r.marks || 0), 0
      ) / reports.length
    : 0;

  const averageAttendance = reports.length
    ? reports.reduce((sum, r) =>
        sum + Number(r.attendance || 0), 0
      ) / reports.length
    : 0;

  const passedReports = reports.filter(
    r => r.result === 'Pass'
  ).length;

  const passRate = reports.length
    ? (passedReports / reports.length) * 100
    : 0;

  const overallGrade = reports.length
    ? calculateGrade(averageMarks)
    : '—';

  const gpa = reports.length
    ? (averageMarks / 10).toFixed(2)
    : '—';

  // Navigation

  const showSection = section => {
    setActiveSection(section);
  };

  // Print report

  const printReport = () => {
    setActiveSection('reports');

    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Logout

  const logout = () => {
    localStorage.removeItem(K.current);
    window.location.href = '/login';
  };

  // Authentication check

  if (!currentUser || currentUser.role !== 'student') {
    return (
      <div className="student-access-denied">
        <h2>Student Access Required</h2>
        <p>Please log in using your student account.</p>
      </div>
    );
  }

  return (

    <div className="student-container">

      {/* Header */}

      <header className="topbar">

        <div className="brand">

          <span className="brand-icon">
            SR
          </span>

          <div>
            <strong>Student Report System</strong>
            <small>Student Portal</small>
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
            MY ACADEMICS
          </div>

          {[
            ['dashboard', '▦', 'Overview'],
            ['reports', '▤', 'Report Card'],
            ['profile', '♙', 'My Profile']
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

        {/* Main Content */}

        <main className="content">

          {/* DASHBOARD */}

          {activeSection === 'dashboard' && (

            <section className="page-section">

              <div className="hero-card">

                <div>

                  <span className="eyebrow">
                    STUDENT OVERVIEW
                  </span>

                  <h1>
                    Welcome, {currentUser.name} ✨
                  </h1>

                  <p>
                    {currentUser.className || 'Class not assigned'}
                    {' · '}
                    {currentUser.studentId || 'Student account'}
                  </p>

                </div>

                <div className="hero-score">

                  <span>Overall Grade</span>

                  <strong>{overallGrade}</strong>

                  <small>GPA {gpa}</small>

                </div>

              </div>

              {/* Statistics */}

              <div className="stats-grid">

                <div className="stat-card purple">
                  <span>Subjects</span>
                  <strong>{reports.length}</strong>
                  <small>Reported subjects</small>
                </div>

                <div className="stat-card cyan">
                  <span>Average Marks</span>
                  <strong>{averageMarks.toFixed(1)}%</strong>
                  <small>Overall performance</small>
                </div>

                <div className="stat-card green">
                  <span>Attendance</span>
                  <strong>{averageAttendance.toFixed(1)}%</strong>
                  <small>Across subjects</small>
                </div>

                <div className="stat-card orange">
                  <span>Pass Rate</span>
                  <strong>{passRate.toFixed(0)}%</strong>
                  <small>Successful reports</small>
                </div>

              </div>

              {/* Performance Progress */}

              <div className="panel">

                <div className="panel-head">

                  <div>
                    <h2>Performance Progress</h2>

                    <p>
                      Subject-wise marks and attendance at a glance.
                    </p>
                  </div>

                </div>

                <div className="progress-list">

                  {reports.length > 0 ? (

                    reports.map((r, index) => (

                      <div
                        className="progress-item"
                        key={r.id || index}
                      >

                        <div className="progress-head">

                          <strong>{r.subject}</strong>

                          <span>
                            {r.marks}% · {r.grade}
                          </span>

                        </div>

                        <div className="bar">

                          <i
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, Number(r.marks) || 0)
                              )}%`
                            }}
                          />

                        </div>

                        <small>
                          Attendance {r.attendance}% · {r.result}
                        </small>

                      </div>

                    ))

                  ) : (

                    <div className="empty">
                      Your reports will appear here after a teacher submits them.
                    </div>

                  )}

                </div>

              </div>

            </section>

          )}

          {/* REPORT CARD */}

          {activeSection === 'reports' && (

            <section className="page-section">

              <div className="page-head">

                <div>

                  <span className="eyebrow">
                    DIGITAL REPORT CARD
                  </span>

                  <h1>My Academic Reports</h1>

                  <p>
                    Detailed subject-wise marks, attendance and teacher feedback.
                  </p>

                </div>

                <button
                  className="primary-btn"
                  onClick={printReport}
                >
                  🖨 Print / Save PDF
                </button>

              </div>

              {/* Report Summary */}

              <div className="report-summary">

                <div>
                  <span>Student</span>
                  <strong>{currentUser.name}</strong>
                </div>

                <div>
                  <span>Class</span>
                  <strong>{currentUser.className || '—'}</strong>
                </div>

                <div>
                  <span>GPA</span>
                  <strong>{gpa}</strong>
                </div>

              </div>

              {/* Reports Table */}

              <div className="panel table-wrap">

                <table>

                  <thead>

                    <tr>
                      <th>Subject</th>
                      <th>Test / 40</th>
                      <th>Exam / 60</th>
                      <th>Total</th>
                      <th>Grade</th>
                      <th>Attendance</th>
                      <th>Status</th>
                      <th>Teacher Remarks</th>
                    </tr>

                  </thead>

                  <tbody>

                    {reports.length > 0 ? (

                      reports.map((r, index) => (

                        <tr key={r.id || index}>

                          <td>
                            <strong>{r.subject}</strong>
                          </td>

                          <td>{r.testMarks ?? '—'}</td>

                          <td>{r.examMarks ?? '—'}</td>

                          <td>
                            <strong>{r.marks}%</strong>
                          </td>

                          <td>
                            <span className="badge grade">
                              {r.grade || calculateGrade(r.marks)}
                            </span>
                          </td>

                          <td>
                            {r.attendance}%

                            <small className="attendance-status">
                              {r.attendanceStatus || ''}
                            </small>
                          </td>

                          <td>
                            <span className={`badge ${
                              (r.result || '').toLowerCase()
                            }`}>
                              {r.result || '—'}
                            </span>
                          </td>

                          <td>{r.remarks || '—'}</td>

                        </tr>

                      ))

                    ) : (

                      <tr>
                        <td colSpan="8" className="empty">
                          No academic reports available yet.
                        </td>
                      </tr>

                    )}

                  </tbody>

                </table>

              </div>

            </section>

          )}

          {/* PROFILE */}

          {activeSection === 'profile' && (

            <section className="page-section">

              <div className="page-head">

                <div>

                  <span className="eyebrow">
                    PERSONAL DETAILS
                  </span>

                  <h1>My Profile</h1>

                  <p>
                    Your registered academic identity.
                  </p>

                </div>

              </div>

              <div className="profile-card">

                <div className="avatar">

                  {currentUser.name
                    .split(' ')
                    .map(word => word[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}

                </div>

                <div className="profile-info">

                  <h2>{currentUser.name}</h2>

                  <p>{currentUser.email}</p>

                  <div className="profile-grid">

                    <div>
                      <span>Role</span>
                      <strong>Student</strong>
                    </div>

                    <div>
                      <span>Student ID</span>
                      <strong>
                        {currentUser.studentId || '—'}
                      </strong>
                    </div>

                    <div>
                      <span>Class / Section</span>
                      <strong>
                        {currentUser.className || '—'}
                      </strong>
                    </div>

                  </div>

                </div>

              </div>

            </section>

          )}

        </main>

      </div>

    </div>

  );

}

export default Student;