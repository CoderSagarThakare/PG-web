import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Building2, MessageSquare, User, Search, IndianRupee } from 'lucide-react';

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
  { label: 'Enquiries', icon: MessageSquare, to: '/my-enquiries' },
  { label: 'My Rent', icon: IndianRupee, to: '/my-rent' },
  { label: 'Account', icon: User, to: '/profile' },
];

export default function BottomNav() {
  const { user } = useAuth();
  const items = user?.role === 'user' ? userItems : ownerManagerItems;

  return (
    <nav className="bottom-nav">
      {items.map(({ label, icon: Icon, to }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
