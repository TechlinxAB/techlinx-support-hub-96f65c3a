
import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Search, MessageCircle, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
}

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const SidebarItem = ({ to, icon, label, isActive }: SidebarItemProps) => (
  <li>
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  </li>
);

const Sidebar = ({ isOpen }: SidebarProps) => {
  const { currentUser } = useAppContext();
  const location = useLocation();
  const isConsultant = currentUser?.role === 'consultant';
  
  return (
    <aside 
      className={cn(
        "fixed top-16 left-0 z-30 h-[calc(100vh-64px)] w-64 bg-sidebar transition-transform duration-300 md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="p-4">
        <div className="mb-6">
          <div className="mb-2 text-xs font-semibold text-sidebar-foreground/50 uppercase">
            Main Menu
          </div>
          <nav>
            <ul className="space-y-1">
              <SidebarItem 
                to="/" 
                icon={<LayoutDashboard className="h-4 w-4" />} 
                label="Dashboard" 
                isActive={location.pathname === '/'} 
              />
              <SidebarItem 
                to="/cases" 
                icon={<MessageCircle className="h-4 w-4" />} 
                label="Cases" 
                isActive={location.pathname.startsWith('/cases')} 
              />
              {isConsultant && (
                <SidebarItem 
                  to="/companies" 
                  icon={<Users className="h-4 w-4" />} 
                  label="Companies" 
                  isActive={location.pathname.startsWith('/companies')} 
                />
              )}
              <SidebarItem 
                to="/search" 
                icon={<Search className="h-4 w-4" />} 
                label="Search" 
                isActive={location.pathname === '/search'} 
              />
            </ul>
          </nav>
        </div>
        
        {isConsultant && (
          <div>
            <div className="mb-2 text-xs font-semibold text-sidebar-foreground/50 uppercase">
              Admin
            </div>
            <nav>
              <ul className="space-y-1">
                <SidebarItem 
                  to="/settings" 
                  icon={<Settings className="h-4 w-4" />} 
                  label="Settings" 
                  isActive={location.pathname === '/settings'} 
                />
              </ul>
            </nav>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
