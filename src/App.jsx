import { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, RoleRoute, GuestRoute } from './routes/guards';
import { Toaster } from 'react-hot-toast';
import { Spinner } from './components/common';

import AppLayout from './components/layout/AppLayout';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const Login        = lazy(() => import('./pages/auth/Login'));
const Register     = lazy(() => import('./pages/auth/Register'));
const Dashboard    = lazy(() => import('./pages/shared/Dashboard'));
const Profile      = lazy(() => import('./pages/shared/Profile'));
const Enquiries    = lazy(() => import('./pages/shared/Enquiries'));
const ManagePGs    = lazy(() => import('./pages/owner/ManagePGs'));
const PGDetails    = lazy(() => import('./pages/owner/PGDetails'));
const ManageRooms  = lazy(() => import('./pages/owner/ManageRooms'));
const ManagePosts  = lazy(() => import('./pages/owner/ManagePosts'));
const BrowsePosts  = lazy(() => import('./pages/user/BrowsePosts'));
const BrowsePGs    = lazy(() => import('./pages/user/BrowsePGs'));
const RentTracker  = lazy(() => import('./pages/owner/RentTracker'));
const MyRent       = lazy(() => import('./pages/user/MyRent'));

// ── Root layout: wraps the whole app with providers + toast ───────────────────
// Must live INSIDE the data router so that useBlocker works in any descendant.
function RootLayout() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-color)',
            border: '1px solid var(--toast-border)',
          },
        }}
      />
      <Suspense fallback={<Spinner center />}>
        <Outlet />
      </Suspense>
    </AuthProvider>
  );
}

// ── Route tree ────────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Guest-only routes (redirect to app if already logged in)
      {
        element: <GuestRoute />,
        children: [
          { path: '/login',    element: <Login /> },
          { path: '/register', element: <Register /> },
        ],
      },

      // Protected routes (redirect to login if not authenticated)
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              // Shared (all authenticated roles)
              { path: '/profile',    element: <Profile /> },
              { path: '/enquiries',  element: <Enquiries /> },

              // Staff only (owner + manager)
              {
                element: <RoleRoute roles={['owner', 'manager']} />,
                children: [
                  { path: '/dashboard', element: <Dashboard /> },
                  { path: '/posts',     element: <ManagePosts /> },
                  { path: '/pg',                      element: <ManagePGs /> },
                  { path: '/pg/:pgId',                element: <PGDetails /> },
                  { path: '/pg/:pgId/inventory',      element: <ManageRooms /> },
                  { path: '/rent',                    element: <RentTracker /> },
                ],
              },

              // Tenant only
              {
                element: <RoleRoute roles={['user']} />,
                children: [
                  { path: '/browse',        element: <BrowsePosts /> },
                  { path: '/browse-pgs',    element: <BrowsePGs /> },
                  { path: '/my-enquiries',  element: <Enquiries /> },
                  { path: '/my-rent',       element: <MyRent /> },
                ],
              },

              // Fallbacks
              { path: '/',  element: <Navigate to="/login" replace /> },
              { path: '*',  element: <Navigate to="/login" replace /> },
            ],
          },
        ],
      },
    ],
  },
]);

// ── App entry ─────────────────────────────────────────────────────────────────
export default function App() {
  return <RouterProvider router={router} />;
}
