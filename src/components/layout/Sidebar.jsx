import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import { Logo, ConfirmModal } from '../common';
import {
  LayoutDashboard, Building2, FileText, MessageSquare,
  Users, Settings, LogOut, User, Home, Search, Sun, Moon, IndianRupee, X, Receipt
} from 'lucide-react';
import { cn } from '../../utils/cn';

const ownerNav = [
  { label: 'Overview', icon: <LayoutDashboard size={18} />, to: '/dashboard' },
  { section: 'PG Management' },
  { label: 'My PGs', icon: <Building2 size={18} />, to: '/pg' },
  { label: 'Vacancy Posts', icon: <FileText size={18} />, to: '/posts' },
  { label: 'Enquiries', icon: <MessageSquare size={18} />, to: '/enquiries' },
  { label: 'Rent Tracker', icon: <IndianRupee size={18} />, to: '/rent' },
  { label: 'Staff & Payroll', icon: <Users size={18} />, to: '/staff' },
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
  { label: 'Staff & Payroll', icon: <Users size={18} />, to: '/staff' },
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

const employeeNav = [
  { section: 'My Work' },
  { label: 'My Expenses', icon: <Receipt size={18} />, to: '/my-expenses' },
  { section: 'Account' },
  { label: 'Profile', icon: <User size={18} />, to: '/profile' },
];

const navByRole = { owner: ownerNav, manager: managerNav, employee: employeeNav, user: userNav };

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
    owner: '#ffa94d',
    manager: '#6c63ff',
    employee: '#00d4aa',
    user: '#51cf66',
  };

  return (
    <>
      <aside
        className={cn(
          'fixed top-0 left-0 w-[230px] h-screen',
          'bg-white dark:bg-[#1a1d2e]',
          'border-r border-gray-200 dark:border-[#2d3052]',
          'flex flex-col z-[100] overflow-y-auto overflow-x-hidden',
          'transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0'
        )}
      >
        {/* Logo / header */}
        <div className="p-6 border-b border-gray-200 dark:border-[#2d3052] flex items-center justify-between">
          <Logo size={36} subtitle="PG Management" />
          {/* Close button — only visible on mobile */}
          <button
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-[#a0a3b1] bg-gray-100 dark:bg-[#2d3052]/50 hover:bg-gray-200 dark:hover:bg-[#2d3052] cursor-pointer border-none"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-3">
          {navItems.map((item, i) => {
            if (item.section) {
              return (
                <div
                  key={i}
                  className="text-[10px] font-semibold text-gray-500 dark:text-[#6b6e82] uppercase tracking-[1.2px] px-2 py-1 mt-3 mb-1"
                >
                  {item.section}
                </div>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-lg',
                    'text-gray-600 dark:text-[#a0a3b1] text-sm font-medium',
                    'transition-all duration-200 mb-0.5',
                    'hover:bg-gray-100 dark:hover:bg-[#2d3052] hover:text-gray-900 dark:hover:text-[#f0f0f8]',
                    isActive && 'bg-[#6c63ff]/15 text-[#6c63ff]'
                  )
                }
                onClick={handleNavClick}
              >
                {item.icon}
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-[#2d3052]">
          <div className="flex flex-col gap-3 p-3 rounded-lg bg-gray-50 dark:bg-[#242740]">
            {/* User info row */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${roleColors[user?.role] || '#6c63ff'}, #00d4aa)`,
                }}
              >
                {initials}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <strong className="text-[13px] font-bold text-gray-900 dark:text-[#f0f0f8] whitespace-nowrap overflow-hidden text-ellipsis">
                  {user?.name || 'User'}
                </strong>
                <span
                  className="text-[11px] capitalize"
                  style={{ color: roleColors[user?.role] }}
                >
                  {user?.role}
                </span>
              </div>
            </div>

            {/* Quick actions row */}
            <div className="flex gap-2 justify-between items-center border-t border-gray-200 dark:border-[#2d3052] pt-2">
              <span className="text-[10.5px] text-gray-500 dark:text-[#6b6e82] font-medium">Quick Actions</span>
              <div className="flex gap-1">
                <button
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-500 dark:text-[#a0a3b1] bg-transparent border-none cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2d3052] hover:text-gray-900 dark:hover:text-[#f0f0f8] transition-colors p-[6px]"
                  onClick={toggleTheme}
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                </button>
                <button
                  className="flex items-center justify-center w-7 h-7 rounded-lg bg-transparent border-none cursor-pointer hover:bg-[#ff4d6d]/10 text-[#ff4d6d] transition-colors p-[6px]"
                  onClick={() => setIsLogoutModalOpen(true)}
                  title="Logout"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Confirm Logout"
        message="Are you sure you want to sign out of your account?"
        confirmText="Sign Out"
        confirmVariant="primary"
      />
    </>
  );
}
