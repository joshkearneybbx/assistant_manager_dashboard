import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useFilters } from '../../hooks/useFilters';
import { Sidebar } from './Sidebar';

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const filtersApi = useFilters();

  return (
    <div className="flex min-h-screen bg-sand-100">
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-sand-300 bg-white px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded p-1.5 text-base-black hover:bg-sand-100"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <span className="text-sm font-semibold text-base-black">BlckBx Assistant Manager</span>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 md:static md:z-auto ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-200 md:translate-x-0`}
      >
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((prev) => !prev)}
          onNavigate={() => setMobileOpen(false)}
        />
      </div>

      <main className="flex-1 pt-14 md:pt-0">
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
          <Outlet context={filtersApi} />
        </div>
      </main>
    </div>
  );
}
