import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  BarChart3,
  Radio,
  AlertOctagon,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMapContext } from '@/contexts/MapContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Live Detection', path: '/admin/detection', icon: Video },
  { label: 'Lane Analytics', path: '/admin/analytics', icon: BarChart3 },
  { label: 'Signal Control', path: '/admin/signals', icon: Radio },
  { label: 'Traffic Violation', path: '/admin/violations', icon: AlertOctagon },
  { label: 'Reports', path: '/admin/reports', icon: FileText },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
  { label: 'User Management', path: '/admin/users', icon: UserRound },
];

export const AdminSidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user } = useAuth();
  const { resetMap } = useMapContext();
  const location = useLocation();

  return (
    <aside
      className={cn(
        'sticky top-0 h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link to="/admin" className="flex items-center gap-2">
            <div className="gradient-bg p-2 rounded-lg">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">Admin</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn('shrink-0', collapsed && 'mx-auto')}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map(({ label, path, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className={cn('w-5 h-5 shrink-0', collapsed && 'mx-auto')} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm">
              <UserRound className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        )}
        <div className={cn('flex items-center gap-2', collapsed ? 'flex-col' : 'justify-between px-3')}>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              resetMap();
              logout();
            }}
            className="text-muted-foreground hover:text-destructive"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
};
