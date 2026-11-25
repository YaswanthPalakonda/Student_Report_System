import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/useAuth';
import './Admin.css';

const THEME_KEY = 'theme';

const defaultSettings = {
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

const defaultOverview = {
  totalUsers: 0,
  students: 0,
  teachers: 0,
  reports: 0,
  assignments: 0,
  classAverage: 0,
  recentReports: []
};

function Admin() {
  const { user: currentUser, logout: authLogout } = useAuth();

  const [activeSection, setActiveSection] = useState('dashboard');
  const [theme, setTheme] = useState(
    localStorage.getItem(THEME_KEY) || 'light'
  );

  const [overview, setOverview] = useState(defaultOverview);
  const [users, setUsers] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [reports, setReports] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [reportSearch, setReportSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('all');

  const [userMessage, setUserMessage] = useState('');
  const [mappingMessage, setMappingMessage] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');

  const [savingMapping, setSavingMapping] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    className: '',
    studentId: ''
  });

  const [mappingForm, setMappingForm] = useState({
    teacherId: '',
    className: '',
    subject: ''
  });

  // Theme

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Data loaders

  const loadOverview = useCallback(async () => {
    const data = await api.getAdminOverview();
    if (data?.overview) {
      setOverview(data.overview);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    const query = {};
    if (roleFilter !== 'all') query.role = roleFilter;
    if (search.trim()) query.search = search.trim();

    const data = await api.listUsers(query);
    setUsers(data?.users || []);
  }, [roleFilter, search]);

  const loadTeachers = useCallback(async () => {
    const data = await api.listUsers({ role: 'teacher' });
    setTeachers(data?.users || []);
  }, []);

  const loadMappings = useCallback(async () => {
    const data = await api.listAssignments();
    setMappings(data?.assignments || []);
  }, []);

  const loadReports = useCallback(async () => {
    const query = {};
    if (reportSearch.trim()) query.search = reportSearch.trim();
    if (resultFilter !== 'all') query.result = resultFilter;

    const data = await api.listReports(query);
    setReports(data?.reports || []);
  }, [reportSearch, resultFilter]);

  const loadSettings = useCallback(async () => {
    const data = await api.getSettings();
    if (data?.gradingPolicy) {
      setSettings(data.gradingPolicy);
    }
  }, []);

  // Initial load and section refresh

  useEffect(() => {
    let active = true;

    (async () => {
      setPageError('');
      try {
        if (activeSection === 'dashboard') {
          await loadOverview();
        } else if (activeSection === 'users') {
          await Promise.all([loadUsers(), loadTeachers()]);
        } else if (activeSection === 'mapping') {
          await Promise.all([loadMappings(), loadTeachers()]);
        } else if (activeSection === 'reports') {
          await loadReports();
        } else if (activeSection === 'settings') {
          await loadSettings();
        }
      } catch (err) {
        if (active) {
          setPageError(err?.message || 'Failed to load admin data.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [
    activeSection,
    loadOverview,
    loadUsers,
    loadTeachers,
    loadMappings,
    loadReports,
    loadSettings
  ]);

  // Navigation

  const showSection = section => {
    setActiveSection(section);
    setSettingsMessage('');
    setUserMessage('');
    setMappingMessage('');
    setPageError('');
  };

  // User management

  const openUserModal = user => {
    setEditId(user?.id || '');

    setUserForm({
      name: user?.name || '',
      email: user?.email || '',
      password: '',
      role: user?.role || 'student',
      className: user?.className || '',
      studentId: user?.studentId || ''
    });

    setUserMessage('');
    setShowModal(true);
  };

  const closeUserModal = () => {
    setShowModal(false);
    setEditId('');
    setUserMessage('');
  };

  const handleUserSubmit = async e => {
    e.preventDefault();
    setUserMessage('');

    const email = userForm.email.trim().toLowerCase();

    if (!editId && userForm.password.length < 6) {
      setUserMessage(
        'New users need a password of at least 6 characters.'
      );
      return;
    }

    if (editId && userForm.password && userForm.password.length < 6) {
      setUserMessage(
        'Password must be at least 6 characters.'
      );
      return;
    }

    const payload = {
      name: userForm.name.trim(),
      email,
      role: userForm.role,
      className: userForm.className.trim(),
      studentId: userForm.studentId.trim()
    };

    if (userForm.password) {
      payload.password = userForm.password;
    }

    setSavingUser(true);

    try {
      if (editId) {
        await api.updateUser(editId, payload);
      } else {
        await api.createUser(payload);
      }

      await Promise.all([loadUsers(), loadTeachers(), loadOverview()]);
      closeUserModal();
    } catch (err) {
      setUserMessage(err?.message || 'Unable to save user.');
    } finally {
      setSavingUser(false);
    }
  };

  const deleteUser = async id => {
    const user = users.find(u => u.id === id);

    if (!user) return;

    if (!window.confirm(`Delete ${user.name}? Their account will be removed.`)) {
      return;
    }

    try {
      await api.deleteUser(id);
      await Promise.all([loadUsers(), loadTeachers(), loadMappings(), loadOverview()]);
    } catch (err) {
      setPageError(err?.message || 'Unable to delete user.');
    }
  };

  const viewUser = async user => {
    let details = user;
    try {
      const data = await api.getUser(user.id);
      if (data?.user) {
        details = data.user;
      }
    } catch {
      // Fallback to already-loaded user details.
    }

    window.alert(
      `Name: ${details.name}\n` +
      `Email: ${details.email}\n` +
      `Role: ${details.role}\n` +
      `Class: ${details.className || '—'}\n` +
      `Student ID: ${details.studentId || '—'}`
    );
  };

  // Teacher mapping

  const handleMappingSubmit = async e => {
    e.preventDefault();
    setMappingMessage('');

    if (!mappingForm.teacherId) {
      setMappingMessage('Please select a teacher.');
      return;
    }

    setSavingMapping(true);

    try {
      await api.createAssignment({
        teacherId: mappingForm.teacherId,
        className: mappingForm.className.trim(),
        subject: mappingForm.subject.trim()
      });

      setMappingForm({
        teacherId: '',
        className: '',
        subject: ''
      });

      setMappingMessage('Assignment saved successfully.');
      await Promise.all([loadMappings(), loadOverview()]);
    } catch (err) {
      setMappingMessage(err?.message || 'Unable to save assignment.');
    } finally {
      setSavingMapping(false);
    }
  };

  const deleteMapping = async id => {
    setMappingMessage('');
    try {
      await api.deleteAssignment(id);
      await Promise.all([loadMappings(), loadOverview()]);
    } catch (err) {
      setMappingMessage(err?.message || 'Unable to remove assignment.');
    }
  };

  // Grading policy

  const updateGrade = (index, value) => {
    setSettings(prev => ({
      ...prev,
      grades: prev.grades.map((g, i) =>
        i === index ? { ...g, min: Number(value) } : g
      )
    }));
  };

  const saveSettings = async e => {
    e.preventDefault();
    setSettingsMessage('');

    const grades = [...settings.grades].sort(
      (a, b) => b.min - a.min
    );

    if (
      grades.some(
        (g, i) => i > 0 && g.min >= grades[i - 1].min
      )
    ) {
      setSettingsMessage(
        'Each grade threshold must be lower than the one above it.'
      );
      return;
    }

    setSavingSettings(true);

    try {
      const data = await api.updateSettings({
        passMark: Number(settings.passMark),
        grades
      });

      if (data?.gradingPolicy) {
        setSettings(data.gradingPolicy);
      } else {
        setSettings(prev => ({ ...prev, grades }));
      }

      setSettingsMessage('Grading policy saved successfully.');
    } catch (err) {
      setSettingsMessage(err?.message || 'Unable to save grading policy.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Logout

  const logout = async () => {
    await authLogout();
  };

  const emptyRow = (columns, message) => (
    <tr>
      <td colSpan={columns} className="empty">
        {message}
      </td>
    </tr>
  );

  // Admin authentication check

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="admin-access-denied">
        <h2>Admin Access Required</h2>
        <p>Please log in using an administrator account.</p>
      </div>
    );
  }

  return (
    <div className="admin-container">

      {/* Header */}

      <header className="topbar">

        <div className="brand">
          <span className="brand-icon">SR</span>

          <div>
            <strong>Student Report System</strong>
            <small>Admin Portal</small>
          </div>
        </div>

        <div className="top-actions">

          <button className="icon-btn" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <span className="user-chip">
            {currentUser.name}
          </span>

          <button className="danger-btn" onClick={logout}>
            Logout
          </button>

        </div>

      </header>

      <div className="app-shell">

        {/* Sidebar */}

        <aside className="sidebar">

          <div className="side-title">
            CONTROL CENTER
          </div>

          {[
            ['dashboard', '▦', 'Dashboard'],
            ['users', '♙', 'User Management'],
            ['mapping', '⌘', 'Class & Subject'],
            ['reports', '▤', 'Reports'],
            ['settings', '⚙', 'Grading Policy']
          ].map(([id, icon, label]) => (

            <button
              key={id}
              className={`nav-btn ${activeSection === id ? 'active' : ''}`}
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
                  <span className="eyebrow">OVERVIEW</span>

                  <h1>
                    Good to see you, {currentUser.name} 👋
                  </h1>

                  <p>
                    Monitor the academic system from one place.
                  </p>
                </div>
              </div>

              <div className="stats-grid">

                <div className="stat-card purple">
                  <span>Total Users</span>
                  <strong>{overview.totalUsers}</strong>
                  <small>All registered accounts</small>
                </div>

                <div className="stat-card cyan">
                  <span>Students</span>
                  <strong>{overview.students}</strong>
                  <small>Active student profiles</small>
                </div>

                <div className="stat-card orange">
                  <span>Teachers</span>
                  <strong>{overview.teachers}</strong>
                  <small>Teaching accounts</small>
                </div>

                <div className="stat-card green">
                  <span>Class Average</span>
                  <strong>{Number(overview.classAverage || 0).toFixed(1)}%</strong>
                  <small>Across all reports</small>
                </div>

              </div>

              <div className="panel-grid">

                <div className="panel">

                  <div className="panel-head">
                    <div>
                      <h2>Recent Reports</h2>
                      <p>Latest teacher submissions</p>
                    </div>
                  </div>

                  <div className="table-wrap">

                    <table>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Subject</th>
                          <th>Marks</th>
                          <th>Grade</th>
                        </tr>
                      </thead>

                      <tbody>

                        {(overview.recentReports || []).map((r, i) => (
                          <tr key={r.id || i}>
                            <td>{r.studentName}</td>
                            <td>{r.subject}</td>
                            <td><strong>{r.marks}</strong></td>
                            <td>
                              <span className="badge grade">
                                {r.grade}
                              </span>
                            </td>
                          </tr>
                        ))}

                        {(overview.recentReports || []).length === 0 &&
                          emptyRow(4, loading ? 'Loading reports...' : 'No reports submitted yet.')}

                      </tbody>
                    </table>

                  </div>

                </div>

                <div className="panel">

                  <div className="panel-head">
                    <div>
                      <h2>System Snapshot</h2>
                      <p>Live database data</p>
                    </div>
                  </div>

                  <div className="snapshot">

                    <div>
                      <span>Students</span>
                      <strong>{overview.students}</strong>
                    </div>

                    <div>
                      <span>Teachers</span>
                      <strong>{overview.teachers}</strong>
                    </div>

                    <div>
                      <span>Reports</span>
                      <strong>{overview.reports}</strong>
                    </div>

                    <div>
                      <span>Assignments</span>
                      <strong>{overview.assignments}</strong>
                    </div>

                  </div>

                </div>

              </div>

            </section>

          )}

          {/* User Management */}

          {activeSection === 'users' && (

            <section className="page-section">

              <div className="page-head">

                <div>
                  <span className="eyebrow">PEOPLE</span>
                  <h1>User Management</h1>

                  <p>
                    Create, edit, view and remove student or teacher profiles.
                  </p>
                </div>

                <button
                  className="primary-btn"
                  onClick={() => openUserModal()}
                >
                  ＋ Add User
                </button>

              </div>

              <div className="toolbar">

                <input
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />

                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                >
                  <option value="all">All roles</option>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                </select>

              </div>

              <div className="panel table-wrap">

                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Class / ID</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>

                    {users.map(u => (

                      <tr key={u.id}>

                        <td><strong>{u.name}</strong></td>
                        <td>{u.email}</td>

                        <td>
                          <span className={`badge ${u.role}`}>
                            {u.role}
                          </span>
                        </td>

                        <td>
                          {u.className || u.studentId || '—'}
                        </td>

                        <td className="actions">

                          <button
                            className="small-btn"
                            onClick={() => viewUser(u)}
                          >
                            View
                          </button>

                          <button
                            className="small-btn"
                            onClick={() => openUserModal(u)}
                          >
                            Edit
                          </button>

                          <button
                            className="small-btn danger"
                            onClick={() => deleteUser(u.id)}
                          >
                            Delete
                          </button>

                        </td>

                      </tr>

                    ))}

                    {users.length === 0 &&
                      emptyRow(5, 'No matching users.')}

                  </tbody>
                </table>

              </div>

            </section>

          )}

          {/* Class and Subject Mapping */}

          {activeSection === 'mapping' && (

            <section className="page-section">

              <div className="page-head">
                <div>
                  <span className="eyebrow">ACADEMICS</span>
                  <h1>Class & Subject Mapping</h1>
                  <p>Assign teachers to classes and subjects.</p>
                </div>
              </div>

              <div className="panel form-panel">

                <form
                  className="form-grid"
                  onSubmit={handleMappingSubmit}
                >

                  <label>
                    Teacher

                    <select
                      required
                      value={mappingForm.teacherId}
                      onChange={e =>
                        setMappingForm({
                          ...mappingForm,
                          teacherId: e.target.value
                        })
                      }
                    >

                      <option value="">Select teacher</option>

                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}

                    </select>

                  </label>

                  <label>
                    Class / Section

                    <input
                      required
                      placeholder="e.g. B.Tech CSE-A"
                      value={mappingForm.className}
                      onChange={e =>
                        setMappingForm({
                          ...mappingForm,
                          className: e.target.value
                        })
                      }
                    />

                  </label>

                  <label>
                    Subject

                    <input
                      required
                      placeholder="e.g. Data Structures"
                      value={mappingForm.subject}
                      onChange={e =>
                        setMappingForm({
                          ...mappingForm,
                          subject: e.target.value
                        })
                      }
                    />

                  </label>

                  <button className="primary-btn" type="submit" disabled={savingMapping}>
                    {savingMapping ? 'Saving...' : 'Save Assignment'}
                  </button>

                </form>

                {mappingMessage && (
                  <p className="message">{mappingMessage}</p>
                )}

              </div>

              <div className="panel table-wrap">

                <table>
                  <thead>
                    <tr>
                      <th>Teacher</th>
                      <th>Class</th>
                      <th>Subject</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>

                    {mappings.map(m => (

                      <tr key={m.id}>
                        <td>{m.teacherName}</td>
                        <td>{m.className}</td>
                        <td>{m.subject}</td>

                        <td>
                          <button
                            className="small-btn danger"
                            onClick={() => deleteMapping(m.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>

                    ))}

                    {mappings.length === 0 &&
                      emptyRow(4, 'No teacher assignments yet.')}

                  </tbody>
                </table>

              </div>

            </section>

          )}

          {/* Reports */}

          {activeSection === 'reports' && (

            <section className="page-section">

              <div className="page-head">
                <div>
                  <span className="eyebrow">ACADEMIC DATA</span>
                  <h1>Student Reports</h1>
                  <p>Review all submitted performance records.</p>
                </div>
              </div>

              <div className="toolbar">

                <input
                  placeholder="Search student or subject…"
                  value={reportSearch}
                  onChange={e => setReportSearch(e.target.value)}
                />

                <select
                  value={resultFilter}
                  onChange={e => setResultFilter(e.target.value)}
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
                      <th>Marks</th>
                      <th>Attendance</th>
                      <th>Grade</th>
                      <th>Result</th>
                      <th>Teacher</th>
                    </tr>
                  </thead>

                  <tbody>

                    {reports.map((r, i) => (

                      <tr key={r.id || i}>

                        <td>{r.studentName}</td>
                        <td>{r.subject}</td>
                        <td><strong>{r.marks}%</strong></td>
                        <td>{r.attendance}%</td>

                        <td>
                          <span className="badge grade">
                            {r.grade}
                          </span>
                        </td>

                        <td>
                          <span className={`badge ${(r.result || '').toLowerCase()}`}>
                            {r.result}
                          </span>
                        </td>

                        <td>
                          {r.teacherName || r.teacherEmail || '—'}
                        </td>

                      </tr>

                    ))}

                    {reports.length === 0 &&
                      emptyRow(7, 'No reports found.')}

                  </tbody>
                </table>

              </div>

            </section>

          )}

          {/* Grading Policy */}

          {activeSection === 'settings' && (

            <section className="page-section">

              <div className="page-head">
                <div>
                  <span className="eyebrow">CONFIGURATION</span>
                  <h1>Grading Policy</h1>
                  <p>
                    Set percentage thresholds used for automatic grade calculation.
                  </p>
                </div>
              </div>

              <div className="panel form-panel">

                <form onSubmit={saveSettings}>

                  <div className="form-grid">

                    <label>
                      Pass mark (%)

                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={settings.passMark}
                        onChange={e =>
                          setSettings({
                            ...settings,
                            passMark: Number(e.target.value)
                          })
                        }
                      />

                    </label>

                  </div>

                  <div className="grade-grid">

                    {settings.grades.map((g, index) => (

                      <label key={g.label}>
                        {g.label} minimum %

                        <input
                          type="number"
                          min="0"
                          max="100"
                          required
                          value={g.min}
                          onChange={e =>
                            updateGrade(index, e.target.value)
                          }
                        />

                      </label>

                    ))}

                  </div>

                  <button className="primary-btn" type="submit" disabled={savingSettings}>
                    {savingSettings ? 'Saving...' : 'Save Grading Policy'}
                  </button>

                  <p className="message">
                    {settingsMessage}
                  </p>

                </form>

              </div>

            </section>

          )}

        </main>

      </div>

      {/* Add / Edit User Modal */}

      {showModal && (

        <div className="modal">

          <div className="modal-card">

            <button
              className="modal-close"
              onClick={closeUserModal}
            >
              ×
            </button>

            <span className="eyebrow">PROFILE</span>

            <h2>{editId ? 'Edit User' : 'Add User'}</h2>

            <form onSubmit={handleUserSubmit}>

              <div className="form-grid">

                <label>
                  Full name

                  <input
                    required
                    value={userForm.name}
                    onChange={e =>
                      setUserForm({
                        ...userForm,
                        name: e.target.value
                      })
                    }
                  />

                </label>

                <label>
                  Email

                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={e =>
                      setUserForm({
                        ...userForm,
                        email: e.target.value
                      })
                    }
                  />

                </label>

                <label>
                  Password

                  <input
                    type="password"
                    required={!editId}
                    minLength="6"
                    placeholder={
                      editId
                        ? 'Leave blank to keep current password'
                        : 'Required for new users'
                    }
                    value={userForm.password}
                    onChange={e =>
                      setUserForm({
                        ...userForm,
                        password: e.target.value
                      })
                    }
                  />

                </label>

                <label>
                  Role

                  <select
                    value={userForm.role}
                    onChange={e =>
                      setUserForm({
                        ...userForm,
                        role: e.target.value
                      })
                    }
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>

                </label>

                <label>
                  Class / Section

                  <input
                    value={userForm.className}
                    onChange={e =>
                      setUserForm({
                        ...userForm,
                        className: e.target.value
                      })
                    }
                  />

                </label>

                <label>
                  Student ID

                  <input
                    value={userForm.studentId}
                    onChange={e =>
                      setUserForm({
                        ...userForm,
                        studentId: e.target.value
                      })
                    }
                  />

                </label>

              </div>

              <button className="primary-btn" type="submit" disabled={savingUser}>
                {savingUser ? 'Saving...' : 'Save User'}
              </button>

              <p className="message">{userMessage}</p>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default Admin;
