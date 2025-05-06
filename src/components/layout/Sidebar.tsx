
import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageCircle, Users, Search, Settings, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar = ({ isOpen }: SidebarProps) => {
  const { currentUser } = useAppContext();
  const location = useLocation();
  const isConsultant = currentUser?.role === 'consultant';
  
  const menuItems = [
    {
      to: "/",
      label: "Dashboard",
      icon: <LayoutDashboard className="sidebar-icon" />,
      isActive: location.pathname === '/'
    },
    {
      to: "/cases",
      label: "Cases",
      icon: <MessageCircle className="sidebar-icon" />,
      isActive: location.pathname.startsWith('/cases')
    },
    {
      to: "/companies",
      label: "Companies",
      icon: <Users className="sidebar-icon" />,
      isActive: location.pathname.startsWith('/companies'),
      showOnlyForConsultant: true
    },
    {
      to: "/search",
      label: "Search",
      icon: <Search className="sidebar-icon" />,
      isActive: location.pathname === '/search'
    }
  ];

  const adminItems = [
    {
      to: "/settings",
      label: "Settings",
      icon: <Settings className="sidebar-icon" />,
      isActive: location.pathname === '/settings'
    }
  ];
  
  return (
    <aside 
      className={cn(
        "fixed h-screen w-64 bg-sidebar z-30 flex flex-col transition-transform duration-300 md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-sidebar-foreground">
          <Clock className="h-6 w-6" />
          <span>Techlinx</span>
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          <div className="mb-2 text-xs font-semibold uppercase text-sidebar-foreground/50">
            Main Menu
          </div>
          <nav>
            <ul className="space-y-1">
              {menuItems.map((item) => (
                (!item.showOnlyForConsultant || (item.showOnlyForConsultant && isConsultant)) && (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "sidebar-menu-item",
                        item.isActive ? "active" : ""
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              ))}
            </ul>
          </nav>
        </div>
        
        {isConsultant && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-sidebar-foreground/50">
              Admin
            </div>
            <nav>
              <ul className="space-y-1">
                {adminItems.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "sidebar-menu-item",
                        item.isActive ? "active" : ""
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            {currentUser?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {currentUser?.name || 'User'}
            </p>
            <p className="text-xs text-sidebar-foreground/70 truncate">
              {currentUser?.email || 'user@example.com'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
