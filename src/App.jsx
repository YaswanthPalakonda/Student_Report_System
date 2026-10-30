import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './components/Auth/Login';
import Admin from './components/Admin/Admin';
import Student from './components/Student/Student';
import Teacher from './components/Teacher/Teacher';

// Protect pages based on user role
function ProtectedRoute({ role, children }) {
  const currentUser = JSON.parse(
    localStorage.getItem('currentUser') || 'null'
  );

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role !== role) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;