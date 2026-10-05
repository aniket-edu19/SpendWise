import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, PieChart, User, Bell, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Users, label: 'Groups', path: '/groups' },
    { icon: PieChart, label: 'Analytics', path: '/analytics' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  const isHideNav = ['/add-expense', '/groups/create'].includes(location.pathname);
  const isGroupDetails = location.pathname.startsWith('/groups/') && !['/groups', '/groups/create'].includes(location.pathname);
  const shouldHideFAB = isHideNav || isGroupDetails;

  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 glass border-b border-white/20 flex justify-between items-center px-5 py-3 w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/20 bg-primary-fixed">
            {user?.photoURL && (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            )}
          </div>
          <span className="font-bold text-xl text-primary tracking-tight">SpendWise</span>
        </div>
        <button className="text-primary hover:bg-white/40 p-2 rounded-full transition-all">
          <Bell className="w-6 h-6" />
        </button>
      </header>
 
      {/* Main Content */}
      <main className="flex-1 w-full max-w-lg mx-auto pb-32">
        <Outlet />
      </main>
 
      {/* FAB - Only show on home/groups/analytics */}
      {!shouldHideFAB && (
        <button 
          onClick={() => navigate('/add-expense')}
          className="fixed bottom-28 right-6 w-14 h-14 bg-primary-container text-on-primary rounded-full shadow-2xl flex items-center justify-center z-50 active:scale-95 transition-transform"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* Bottom Nav */}
      {!isHideNav && (
        <nav className="fixed bottom-0 left-0 w-full z-50 bg-white/60 backdrop-blur-3xl border-t border-white/20 rounded-t-3xl pt-3 pb-8 px-4 flex justify-around items-center shadow-[0px_-10px_40px_rgba(67,56,202,0.05)]">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                location.pathname === item.path ? "text-primary font-bold" : "text-outline"
              )}
            >
              <item.icon className={cn("w-6 h-6", location.pathname === item.path && "fill-primary/20")} />
              <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
