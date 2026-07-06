import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Building2, MessageSquare, User, Search, IndianRupee, Receipt, Home } from 'lucide-react';
import { cn } from '../../utils/cn';

const ownerManagerItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Properties', icon: Building2, to: '/pg' },
  { label: 'Enquiries', icon: MessageSquare, to: '/enquiries' },
  { label: 'Rent', icon: IndianRupee, to: '/rent' },
  { label: 'Account', icon: User, to: '/profile' },
];

const userItems = [
  { label: 'Discover', icon: Search, to: '/browse' },
  { label: 'Browse', icon: Building2, to: '/browse-pgs' },
  { label: 'My PG', icon: Home, to: '/my-pg' },
  { label: 'My Rent', icon: IndianRupee, to: '/my-rent' },
  { label: 'Account', icon: User, to: '/profile' },
];

const employeeItems = [
  { label: 'Discover', icon: Search, to: '/browse' },
  { label: 'Browse', icon: Building2, to: '/browse-pgs' },
  { label: 'Expenses', icon: Receipt, to: '/my-expenses' },
  { label: 'Account', icon: User, to: '/profile' },
];

export default function BottomNav() {
  const { user } = useAuth();
  
  let items = ownerManagerItems;
  if (user?.role === 'user') {
    items = userItems;
  } else if (user?.role === 'employee') {
    items = employeeItems;
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 h-[62px] bg-white dark:bg-[#1a1d2e] border-t border-gray-200 dark:border-[#2d3052] z-[200] flex md:hidden items-stretch justify-around shadow-[0_-4px_24px_rgba(0,0,0,0.35)] px-1">
      {items.map(({ label, icon: Icon, to }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-1 flex-1 py-2 px-1',
              'text-[9.5px] font-bold uppercase tracking-[0.3px]',
              'transition-colors duration-200 relative',
              isActive ? 'text-[#6c63ff]' : 'text-gray-500 dark:text-[#6b6e82]'
            )
          }
        >
          {({ isActive }) => (
            <>
              {/* Active top indicator */}
              {isActive && (
                <span className="absolute top-0 inset-x-0 h-[2px] bg-[#6c63ff] rounded-b" />
              )}
              <Icon size={20} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
