import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, RoleRoute, GuestRoute } from './routes/guards';
import { Toaster } from 'react-hot-toast';
import { Spinner } from './components/common';

import AppLayout from './components/layout/AppLayout';

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Dashboard = lazy(() => import('./pages/shared/Dashboard'));
const Profile = lazy(() => import('./pages/shared/Profile'));
const Enquiries = lazy(() => import('./pages/shared/Enquiries'));
const ManagePGs = lazy(() => import('./pages/owner/ManagePGs'));
const PGDetails = lazy(() => import('./pages/owner/PGDetails'));
const ManageRooms = lazy(() => import('./pages/owner/ManageRooms'));
const ManagePosts = lazy(() => import('./pages/owner/ManagePosts'));
const BrowsePosts = lazy(() => import('./pages/user/BrowsePosts'));
const BrowsePGs = lazy(() => import('./pages/user/BrowsePGs'));

function AppRoutes() {
  return (
    <Suspense fallback={<Spinner center />}>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/enquiries" element={<Enquiries />} />
            
            {/* Staff Routes */}
            <Route element={<RoleRoute roles={['owner', 'manager']} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/posts" element={<ManagePosts />} />
            </Route>
            
            {/* Owner & Manager */}
            <Route element={<RoleRoute roles={['owner', 'manager']} />}>
              <Route path="/pg" element={<ManagePGs />} />
              <Route path="/pg/:pgId" element={<PGDetails />} />
              <Route path="/pg/:pgId/inventory" element={<ManageRooms />} />
            </Route>
            
            {/* User Only */}
            <Route element={<RoleRoute roles={['user']} />}>
              <Route path="/browse" element={<BrowsePosts />} />
              <Route path="/browse-pgs" element={<BrowsePGs />} />
              <Route path="/my-enquiries" element={<Enquiries />} />
            </Route>
  
            {/* Fallback */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
        }} />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
