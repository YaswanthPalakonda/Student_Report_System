import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import Login from './components/Auth/Login';
import Admin from './components/Admin/Admin';
import Student from './components/Student/Student';
import Teacher from './components/Teacher/Teacher';

const ROLE_ROUTES = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/student'
};

// Protect pages based on authenticated user role
function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="empty"
        style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}
      >
        Restoring session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return <Navigate to={ROLE_ROUTES[user.role] || '/login'} replace />;
  }

  return children;
}

function AppRoutes() {
  return (
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
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
