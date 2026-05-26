import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState, useEffect } from 'react';
import { Menu, Sun, Moon, X } from 'lucide-react';
import { Logo } from '../common';
import { cn } from '../../utils/cn';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Close sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#0f1117]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onThemeChange={setTheme} currentTheme={theme} />

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] animate-[fadeIn_0.2s_ease]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-h-screen md:ml-[230px] min-w-0 transition-[margin] duration-300">
        {/* Mobile Topbar — only shown on small screens */}
        <div className="flex md:hidden items-center justify-between h-14 px-4 bg-white dark:bg-[#1a1d2e] border-b border-gray-200 dark:border-[#2d3052] sticky top-0 z-[90] gap-3">
          <button
            className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-900 dark:text-[#f0f0f8] bg-transparent border border-gray-200 dark:border-[#2d3052] cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-[#2d3052] hover:border-[#6c63ff] hover:text-[#6c63ff] flex-shrink-0"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <Logo size={28} subtitle={null} />
          <button
            className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-900 dark:text-[#f0f0f8] bg-transparent border border-gray-200 dark:border-[#2d3052] cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-[#2d3052] hover:border-[#6c63ff] hover:text-[#6c63ff] flex-shrink-0"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className="flex-1 p-4 md:p-6 pb-20 md:pb-6 max-w-[1400px] w-full min-w-0 overflow-x-hidden fade-in">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
