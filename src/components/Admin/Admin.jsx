import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth';
import { usePortal } from '../../hooks/usePortal';
import PortalStatus from '../PortalStatus';
import CatalogManager from './CatalogManager';
import './Admin.css';

function Admin() {
  const { user: currentUser, logout } = useAuth();
  const portal = usePortal('admin');
  const { users, reports, mappings, classes, subjects, stats, mutate, busy } = portal;
  const [activeSection, setActiveSection] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [settingsDraft, setSettingsDraft] = useState(null);
  const settings = settingsDraft || portal.settings;
  const setSettings = value => setSettingsDraft(typeof value === 'function' ? value(settings) : value);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [reportSearch, setReportSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [userMessage, setUserMessage] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'student', classId: '', studentId: '', active: true, revision: 0 });
  const [mappingForm, setMappingForm] = useState({ teacherId: '', classId: '', subjectId: '' });
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('theme', theme); }, [theme]);
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const students = users.filter(u => u.role === 'student' && u.active);
  const teachers = users.filter(u => u.role === 'teacher' && u.active);
  const average = stats?.average || 0;
  const showSection = section => { setActiveSection(section); setSettingsMessage(''); setUserMessage(''); };
  const openUserModal = user => {
    setEditId(user?.id || '');
    setUserForm({ name: user?.name || '', email: user?.email || '', password: '', role: user?.role || 'student', classId: user?.classId || '', studentId: user?.studentId || '', active: user?.active ?? true, revision: user?.revision ?? 0 });
    setUserMessage(''); setShowModal(true);
  };
  const closeUserModal = () => { setShowModal(false); setEditId(''); setUserMessage(''); setUserForm(previous => ({ ...previous, password: '' })); };
  const handleUserSubmit = async event => {
    event.preventDefault();
    const body = { name: userForm.name, email: userForm.email, role: userForm.role, classId: userForm.role === 'student' ? userForm.classId || null : null, studentId: userForm.role === 'student' ? userForm.studentId : '' };
    if (userForm.password) body.password = userForm.password;
    if (editId) { body.revision = userForm.revision; body.active = userForm.active; }
    const result = await mutate(editId ? `/users/${editId}` : '/users', editId ? 'PATCH' : 'POST', body);
    if (result) closeUserModal();
  };
  const deleteUser = async id => {
    const user = users.find(u => u.id === id);
    if (window.confirm(`Deactivate ${user.name}? Login access will be revoked; academic history is retained.`)) await mutate(`/users/${id}`, 'DELETE');
  };
  const viewUser = user => window.alert(`Name: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}\nClass: ${user.className || '—'}\nStudent ID: ${user.studentId || '—'}\nStatus: ${user.active ? 'Active' : 'Inactive'}`);
  const filteredUsers = users.filter(u => u.role !== 'admin').filter(u => (roleFilter === 'all' || u.role === roleFilter) && `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase()));
  const handleMappingSubmit = async event => {
    event.preventDefault();
    if (await mutate('/assignments', 'POST', mappingForm)) setMappingForm({ teacherId: '', classId: '', subjectId: '' });
  };
  const deleteMapping = id => { if (window.confirm('Remove this teaching assignment?')) mutate(`/assignments/${id}`, 'DELETE'); };
  const deleteReport = id => { if (window.confirm('Permanently delete this academic report?')) mutate(`/reports/${id}`, 'DELETE'); };
  const filteredReports = reports.filter(r => `${r.studentName} ${r.subject}`.toLowerCase().includes(reportSearch.toLowerCase())).filter(r => resultFilter === 'all' || r.result === resultFilter).slice().reverse();
  const updateGrade = (index, value) => setSettings(prev => ({ ...prev, grades: prev.grades.map((g, i) => i === index ? { ...g, min: Number(value) } : g) }));
  const saveSettings = async event => {
    event.preventDefault();
    if (await mutate('/grading-settings', 'PUT', settings)) { setSettingsDraft(null); setSettingsMessage('Grading policy saved successfully.'); }
  };
  const emptyRow = (columns, message) => <tr><td colSpan={columns} className="empty">{message}</td></tr>;
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
          <PortalStatus {...portal} />

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
                  <strong>{stats?.totalUsers ?? 0}</strong>
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
                      <p>Shared database records</p>
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
                            {u.role}{!u.active ? ' · Inactive' : ''}
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
                            disabled={busy || !u.active}
                            onClick={() => deleteUser(u.id)}
                          >
                            Deactivate
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

              <div className="panel-grid">
                <CatalogManager title="Classes" path="/classes" items={classes} mutate={mutate} busy={busy} />
                <CatalogManager title="Subjects" path="/subjects" items={subjects} mutate={mutate} busy={busy} />
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
                      aria-label="Teacher"
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

                    <select aria-label="Class / Section" required value={mappingForm.classId} onChange={e => setMappingForm({ ...mappingForm, classId: e.target.value })}>
                      <option value="">Select class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                  </label>

                  <label>
                    Subject

                    <select aria-label="Subject" required value={mappingForm.subjectId} onChange={e => setMappingForm({ ...mappingForm, subjectId: e.target.value })}>
                      <option value="">Select subject</option>
                      {subjects.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                  </label>

                  <button className="primary-btn" type="submit" disabled={busy || portal.loading}>
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
                      <th>Actions</th>
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
                        <td><button className="small-btn danger" disabled={busy} onClick={() => deleteReport(r.id)}>Delete</button></td>

                      </tr>

                    ))}

                    {filteredReports.length === 0 &&
                      emptyRow(8, 'No reports found.')}

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

                  <button className="primary-btn" type="submit" disabled={busy || portal.loading}>
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
                    minLength="8"
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
                    aria-label="Role"
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

                  <select aria-label="Class / Section" disabled={userForm.role !== 'student'} value={userForm.classId} onChange={e => setUserForm({ ...userForm, classId: e.target.value })}>
                    <option value="">Unassigned</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>

                </label>

                <label>
                  Student ID

                  <input
                    disabled={userForm.role !== 'student'}
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

              {editId && <label><input type="checkbox" checked={userForm.active} onChange={e => setUserForm({ ...userForm, active: e.target.checked })} /> Account active</label>}
              <button className="primary-btn" type="submit" disabled={busy}>
                Save User
              </button>

              <p className="message" role="alert">{userMessage || portal.error}</p>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default Admin;
