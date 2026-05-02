import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { Logo, ConfirmModal } from '../common';
import {
  LayoutDashboard, Building2, FileText, MessageSquare,
  Users, Settings, LogOut, User, Home, Search, Sun, Moon
} from 'lucide-react';

const ownerNav = [
  { label: 'Overview', icon: <LayoutDashboard size={18} />, to: '/dashboard' },
  { section: 'PG Management' },
  { label: 'My PGs', icon: <Building2 size={18} />, to: '/pg' },
  { label: 'Vacancy Posts', icon: <FileText size={18} />, to: '/posts' },
  { label: 'Enquiries', icon: <MessageSquare size={18} />, to: '/enquiries' },
  { section: 'Account' },
  { label: 'Profile', icon: <User size={18} />, to: '/profile' },
];

const managerNav = [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} />, to: '/dashboard' },
  { section: 'Management' },
  { label: 'My PGs', icon: <Building2 size={18} />, to: '/pg' },
  { label: 'Posts', icon: <FileText size={18} />, to: '/posts' },
  { label: 'Enquiries', icon: <MessageSquare size={18} />, to: '/enquiries' },
  { section: 'Account' },
  { label: 'Profile', icon: <User size={18} />, to: '/profile' },
];

const userNav = [
  { label: 'Browse PGs', icon: <Search size={18} />, to: '/browse' },
  { label: 'My Enquiries', icon: <MessageSquare size={18} />, to: '/my-enquiries' },
  { section: 'Account' },
  { label: 'Profile', icon: <User size={18} />, to: '/profile' },
];

const navByRole = { owner: ownerNav, manager: managerNav, employee: managerNav, user: userNav };

export default function Sidebar() {
  const { user, logout, isOwner } = useAuth();
  const navigate = useNavigate();
  const navItems = navByRole[user?.role] || userNav;
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const roleColors = {
    owner: 'var(--warning)',
    manager: 'var(--primary)',
    employee: 'var(--accent)',
    user: 'var(--success)',
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Logo size={36} subtitle="PG Management" />
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          if (item.section) {
            return <div key={i} className="sidebar-section-label">{item.section}</div>;
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar" style={{ background: `linear-gradient(135deg, ${roleColors[user?.role] || 'var(--primary)'}, var(--accent))` }}>
            {initials}
          </div>
          <div className="sidebar-user-info">
            <strong>{user?.name || 'User'}</strong>
            <span style={{ color: roleColors[user?.role] }}>{user?.role}</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle Theme"
              style={{ padding: '6px' }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => setIsLogoutModalOpen(true)}
              title="Logout"
              style={{ padding: '6px' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Confirm Logout"
        message="Are you sure you want to sign out of your account?"
      />
    </aside>
  );
}
