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
    const target = user.role === 'user' ? '/browse' : '/dashboard';
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
};

// Requires specific role(s)
export const RoleRoute = ({ roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const target = user.role === 'user' ? '/browse' : '/dashboard';
  if (!roles.includes(user.role)) return <Navigate to={target} replace />;
  return <Outlet />;
};
