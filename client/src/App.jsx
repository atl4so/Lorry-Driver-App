import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import DriverDashboard from './pages/DriverDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';

function App() {
  const { user, logout } = useAuth();

  const defaultRoute = () => {
    if (!user) {
      return '/login';
    }
    return user.role === 'admin' ? '/admin' : '/driver';
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Lorry Driver Tracking</h1>
          <p className="tagline">Real-time trip tracking, delivery management and history.</p>
        </div>
        {user && (
          <div className="user-summary">
            <span>
              Signed in as <strong>{user.name}</strong> ({user.role})
            </span>
            <button type="button" className="secondary" onClick={logout}>
              Log out
            </button>
          </div>
        )}
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to={defaultRoute()} replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/driver"
            element={
              <ProtectedRoute role="driver">
                <DriverDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to={defaultRoute()} replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
