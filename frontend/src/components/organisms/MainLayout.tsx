import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/operator', label: 'Operator' },
  { path: '/org', label: 'Organization' },
  { path: '/automation', label: 'Automation' },
  { path: '/report', label: 'Report' },
  { path: '/settings', label: 'Settings' },
];

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white">
        <div className="p-4">
          <h1 className="text-xl font-bold">Tank Email System</h1>
        </div>
        <nav className="mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `block px-4 py-3 hover:bg-gray-700 transition-colors ${
                  isActive ? 'bg-gray-700 border-l-4 border-blue-500 text-white' : 'text-gray-300'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm">{user?.userName}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-100">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
