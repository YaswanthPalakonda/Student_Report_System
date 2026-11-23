import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './components/Auth/Login';
import Admin from './components/Admin/Admin';
import Student from './components/Student/Student';
import Teacher from './components/Teacher/Teacher';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/auth';

// Protect pages based on user role
function ProtectedRoute({ role, children }) {
  const { user: currentUser, loading, error, restore } = useAuth();
  if (loading) return <p role="status">Restoring your session…</p>;
  if (error && !currentUser) return <div role="alert"><p>{error}</p><button onClick={restore}>Retry connection</button></div>;

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role !== role) {
    return <Navigate to="/login" replace />;
  }

  return <>{error && <p role="alert">{error}</p>}{children}</>;
}

function App() {
  return (
    <AuthProvider><BrowserRouter>
      <Routes>
        {/* Login Page */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* Admin Page */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* Student Page */}
        <Route
          path="/student"
          element={
            <ProtectedRoute role="student">
              <Student />
            </ProtectedRoute>
          }
        />

        {/* Teacher Page */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute role="teacher">
              <Teacher />
            </ProtectedRoute>
          }
        />

        {/* Invalid URL */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter></AuthProvider>
  );
}

export default App;
