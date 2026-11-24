import React, { useState, useEffect } from 'react';
import './Admin.css';

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

function Admin() {
  const currentUser = read(K.current, null);

  const [activeSection, setActiveSection] = useState('dashboard');
  const [theme, setTheme] = useState(
    localStorage.getItem(K.theme) || 'light'
  );

  const [users, setUsers] = useState(() => read(K.users));
  const [reports, setReports] = useState(() => read(K.reports));
  const [mappings, setMappings] = useState(() => read(K.maps));

  const [settings, setSettings] = useState(() =>
    read(K.settings, defaultSettings)
  );

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [reportSearch, setReportSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('all');

  const [userMessage, setUserMessage] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    className: '',
    studentId: ''
  });

  const [mappingForm, setMappingForm] = useState({
    teacherEmail: '',
    className: '',
    subject: ''
  });

  // Save data to Local Storage

  useEffect(() => {
    write(K.users, users);
  }, [users]);

  useEffect(() => {
    write(K.reports, reports);
  }, [reports]);

  useEffect(() => {
    write(K.maps, mappings);
  }, [mappings]);

  useEffect(() => {
    write(K.settings, settings);
  }, [settings]);

  // Theme

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(K.theme, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Dashboard calculations

  const students = users.filter(u => u.role === 'student');
  const teachers = users.filter(u => u.role === 'teacher');

  const average = reports.length
    ? reports.reduce((sum, r) => sum + Number(r.marks || 0), 0) /
      reports.length
    : 0;

  // Navigation

  const showSection = section => {
    setActiveSection(section);
    setSettingsMessage('');
    setUserMessage('');
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

  const handleUserSubmit = e => {
    e.preventDefault();

    const email = userForm.email.trim().toLowerCase();

    const duplicate = users.some(
      u => u.email.toLowerCase() === email && u.id !== editId
    );

    if (duplicate) {
      setUserMessage('Email already exists.');
      return;
    }

    if (!editId && userForm.password.length < 6) {
      setUserMessage(
        'New users need a password of at least 6 characters.'
      );
      return;
    }

    if (editId) {
      setUsers(prev =>
        prev.map(u =>
          u.id === editId
            ? {
                ...u,
                name: userForm.name.trim(),
                email,
                role: userForm.role,
                className: userForm.className.trim(),
                studentId: userForm.studentId.trim(),
                ...(userForm.password
                  ? { password: userForm.password }
                  : {})
              }
            : u
        )
      );
    } else {
      setUsers(prev => [
        ...prev,
        {
          id: `${userForm.role}-${Date.now()}`,
          name: userForm.name.trim(),
          email,
          password: userForm.password,
          role: userForm.role,
          className: userForm.className.trim(),
          studentId: userForm.studentId.trim()
        }
      ]);
    }

    closeUserModal();
  };

  const deleteUser = id => {
    const user = users.find(u => u.id === id);

    if (!user) return;

    if (!window.confirm(`Delete ${user.name}? Their account will be removed.`)) {
      return;
    }

    setUsers(prev => prev.filter(u => u.id !== id));

    setMappings(prev =>
      prev.filter(m => m.teacherEmail !== user.email)
    );
  };

  const viewUser = user => {
    window.alert(
      `Name: ${user.name}\n` +
      `Email: ${user.email}\n` +
      `Role: ${user.role}\n` +
      `Class: ${user.className || '—'}\n` +
      `Student ID: ${user.studentId || '—'}`
    );
  };

  const filteredUsers = users
    .filter(u => u.role !== 'admin')
    .filter(
      u =>
        (roleFilter === 'all' || u.role === roleFilter) &&
        `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
    );

  // Teacher mapping

  const handleMappingSubmit = e => {
    e.preventDefault();

    const teacher = users.find(
      u => u.email === mappingForm.teacherEmail
    );

    if (!teacher) return;

    setMappings(prev => [
      ...prev,
      {
        id: Date.now(),
        teacherEmail: teacher.email,
        teacherName: teacher.name,
        className: mappingForm.className.trim(),
        subject: mappingForm.subject.trim()
      }
    ]);

    setMappingForm({
      teacherEmail: '',
      className: '',
      subject: ''
    });
  };

  const deleteMapping = id => {
    setMappings(prev => prev.filter(m => m.id !== id));
  };

  // Reports

  const filteredReports = reports
    .filter(r =>
      `${r.studentName} ${r.subject}`
        .toLowerCase()
        .includes(reportSearch.toLowerCase())
    )
    .filter(
      r => resultFilter === 'all' || r.result === resultFilter
    )
    .slice()
    .reverse();

  // Grading policy

  const updateGrade = (index, value) => {
    setSettings(prev => ({
      ...prev,
      grades: prev.grades.map((g, i) =>
        i === index ? { ...g, min: Number(value) } : g
      )
    }));
  };

  const saveSettings = e => {
    e.preventDefault();

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

    setSettings(prev => ({ ...prev, grades }));

    setSettingsMessage('Grading policy saved successfully.');
  };

  // Logout

  const logout = () => {
    localStorage.removeItem(K.current);
    window.location.href = '/login';
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
                  <strong>{users.length}</strong>
                  <small>All registered accounts</small>
                </div>

                <div className="stat-card cyan">
                  <span>Students</span>
                  <strong>{students.length}</strong>
                  <small>Active student profiles</small>
                </div>

                <div className="stat-card orange">
                  <span>Teachers</span>
                  <strong>{teachers.length}</strong>
                  <small>Teaching accounts</small>
                </div>

                <div className="stat-card green">
                  <span>Class Average</span>
                  <strong>{average.toFixed(1)}%</strong>
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

                        {reports.slice(-5).reverse().map((r, i) => (
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

                        {reports.length === 0 &&
                          emptyRow(4, 'No reports submitted yet.')}

                      </tbody>
                    </table>

                  </div>

                </div>

                <div className="panel">

                  <div className="panel-head">
                    <div>
                      <h2>System Snapshot</h2>
                      <p>Live localStorage data</p>
                    </div>
                  </div>

                  <div className="snapshot">

                    <div>
                      <span>Students</span>
                      <strong>{students.length}</strong>
                    </div>

                    <div>
                      <span>Teachers</span>
                      <strong>{teachers.length}</strong>
                    </div>

                    <div>
                      <span>Reports</span>
                      <strong>{reports.length}</strong>
                    </div>

                    <div>
                      <span>Assignments</span>
                      <strong>{mappings.length}</strong>
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

                    {filteredUsers.map(u => (

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

                    {filteredUsers.length === 0 &&
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
                      value={mappingForm.teacherEmail}
                      onChange={e =>
                        setMappingForm({
                          ...mappingForm,
                          teacherEmail: e.target.value
                        })
                      }
                    >

                      <option value="">Select teacher</option>

                      {teachers.map(t => (
                        <option key={t.id} value={t.email}>
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

                  <button className="primary-btn" type="submit">
                    Save Assignment
                  </button>

                </form>

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

                    {filteredReports.map((r, i) => (

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
                          {users.find(u => u.email === r.teacherEmail)?.name ||
                            r.teacherEmail || '—'}
                        </td>

                      </tr>

                    ))}

                    {filteredReports.length === 0 &&
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

                  <button className="primary-btn" type="submit">
                    Save Grading Policy
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

              <button className="primary-btn" type="submit">
                Save User
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