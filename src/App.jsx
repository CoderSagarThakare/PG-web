import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, RoleRoute } from './routes/guards';
import { Toaster } from 'react-hot-toast';

import AppLayout from './components/layout/AppLayout';
import Login from './pages/auth/Login';
import Dashboard from './pages/shared/Dashboard';
import Profile from './pages/shared/Profile';
import Enquiries from './pages/shared/Enquiries';
import ManagePGs from './pages/owner/ManagePGs';
import ManagePosts from './pages/owner/ManagePosts';
import BrowsePosts from './pages/user/BrowsePosts';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
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
          </Route>
          
          {/* User Only */}
          <Route element={<RoleRoute roles={['user']} />}>
            <Route path="/browse" element={<BrowsePosts />} />
            <Route path="/my-enquiries" element={<Enquiries />} />
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Route>
      </Route>
    </Routes>
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
