import { BarChart3, Clock3, Gauge, HeartPulse, Home, PanelLeftClose, PanelLeftOpen, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/performance', label: 'Team', icon: Users },
  { to: '/capacity', label: 'Capacity', icon: Gauge },
  { to: '/clients', label: 'Clients', icon: HeartPulse },
  { to: '/stuck-tasks', label: 'Stuck', icon: Clock3 }
];

export function Sidebar({ collapsed, onToggle, onNavigate }: SidebarProps) {
  return (
    <aside className={`flex h-full min-h-screen flex-col border-r border-[#2a2928] bg-base-black ${collapsed ? 'w-20' : 'w-64'} transition-[width] duration-200`}>
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed ? (
          <div className="flex items-center gap-2 text-white">
            <BarChart3 size={18} />
            <div className="text-sm font-semibold leading-tight">BlckBx Assistant Manager</div>
          </div>
        ) : (
          <BarChart3 size={18} className="text-white" />
        )}
        <button
          type="button"
          onClick={onToggle}
          className="hidden rounded border border-[#4b4a49] p-1 text-white/80 hover:bg-white/10 md:block"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className="flex-1 px-3 pb-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `mb-1 flex items-center gap-2 rounded px-3 py-2 text-sm transition-colors duration-150 ${
                isActive
                  ? 'bg-white/10 text-white ring-1 ring-white/15'
                  : 'text-white/90 hover:bg-white/10 hover:text-white'
              }`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={16} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
