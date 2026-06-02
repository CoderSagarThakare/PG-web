import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Requires any authenticated user
export const ProtectedRoute = () => {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

// Only for non-authenticated users (Login, Register)
export const GuestRoute = () => {
  const { user } = useAuth();
  if (user) {
    // Route each role to their landing page
    if (user.role === 'user')     return <Navigate to="/browse" replace />;
    if (user.role === 'employee') return <Navigate to="/my-expenses" replace />;
    return <Navigate to="/dashboard" replace />;  // owner / manager
  }
  return <Outlet />;
};

// Requires specific role(s)
export const RoleRoute = ({ roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  if (!roles.includes(user.role)) {
    // Redirect each role to their correct home
    if (user.role === 'user')     return <Navigate to="/browse" replace />;
    if (user.role === 'employee') return <Navigate to="/my-expenses" replace />;
    return <Navigate to="/dashboard" replace />;  // owner / manager
  }
  return <Outlet />;
};
