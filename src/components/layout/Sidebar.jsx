import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import { Logo, ConfirmModal } from '../common';
import {
  LayoutDashboard, Building2, FileText, MessageSquare,
  Users, Settings, LogOut, User, Home, Search, Sun, Moon, IndianRupee, X
} from 'lucide-react';

const ownerNav = [
  { label: 'Overview', icon: <LayoutDashboard size={18} />, to: '/dashboard' },
  { section: 'PG Management' },
  { label: 'My PGs', icon: <Building2 size={18} />, to: '/pg' },
  { label: 'Vacancy Posts', icon: <FileText size={18} />, to: '/posts' },
  { label: 'Enquiries', icon: <MessageSquare size={18} />, to: '/enquiries' },
  { label: 'Rent Tracker', icon: <IndianRupee size={18} />, to: '/rent' },
  { section: 'Account' },
  { label: 'Profile', icon: <User size={18} />, to: '/profile' },
];

const managerNav = [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} />, to: '/dashboard' },
  { section: 'Management' },
  { label: 'My PGs', icon: <Building2 size={18} />, to: '/pg' },
  { label: 'Posts', icon: <FileText size={18} />, to: '/posts' },
  { label: 'Enquiries', icon: <MessageSquare size={18} />, to: '/enquiries' },
  { label: 'Rent Tracker', icon: <IndianRupee size={18} />, to: '/rent' },
  { section: 'Account' },
  { label: 'Profile', icon: <User size={18} />, to: '/profile' },
];

const userNav = [
  { label: 'Discover Stays', icon: <Search size={18} />, to: '/browse' },
  { label: 'Browse PGs', icon: <Building2 size={18} />, to: '/browse-pgs' },
  { label: 'My Enquiries', icon: <MessageSquare size={18} />, to: '/my-enquiries' },
  { label: 'My Rent', icon: <IndianRupee size={18} />, to: '/my-rent' },
  { section: 'Account' },
  { label: 'Profile', icon: <User size={18} />, to: '/profile' },
];

const navByRole = { owner: ownerNav, manager: managerNav, employee: managerNav, user: userNav };

export default function Sidebar({ isOpen, onClose, onThemeChange, currentTheme }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = navByRole[user?.role] || userNav;
  const [theme, setTheme] = useState(currentTheme || localStorage.getItem('theme') || 'dark');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    if (onThemeChange) onThemeChange(newTheme);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    // Close sidebar on mobile when a link is clicked
    if (window.innerWidth <= 768 && onClose) onClose();
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
    <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo size={36} subtitle="PG Management" />
        {/* Close button — only visible on mobile */}
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
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
              onClick={handleNavClick}
            >
              {item.icon}
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12, padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="sidebar-avatar" style={{ background: `linear-gradient(135deg, ${roleColors[user?.role] || 'var(--primary)'}, var(--accent))` }}>
              {initials}
            </div>
            <div className="sidebar-user-info" style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'User'}</strong>
              <span style={{ color: roleColors[user?.role], fontSize: 11, textTransform: 'capitalize' }}>{user?.role}</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>Quick Actions</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={toggleTheme}
                title="Toggle Theme"
                style={{ padding: '6px' }}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setIsLogoutModalOpen(true)}
                title="Logout"
                style={{ padding: '6px', color: 'var(--danger)' }}
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Confirm Logout"
        message="Are you sure you want to sign out of your account?"
        confirmText="Sign Out"
        confirmVariant="primary"
      />
    </aside>
  );
}
