import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-container fade-in">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
