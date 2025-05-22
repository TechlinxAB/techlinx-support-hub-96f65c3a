import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { Link, useLocation } from 'react-router-dom';
import { Laptop, MessageCircle, Users, Settings, UserPlus, Building, X, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/context/SidebarContext';

const Sidebar = () => {
  const { currentUser } = useAppContext();
  const location = useLocation();
  const { closeSidebar, isMobile } = useSidebar();
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
      to: "/company-dashboard",
      label: "Company Dashboard",
      icon: <Building className="sidebar-icon" />,
      isActive: location.pathname.startsWith('/company-dashboard'),
      showOnlyForUser: true
    }
  ];

  const adminItems = [
    {
      to: "/users",
      label: "User Management",
      icon: <UserPlus className="sidebar-icon" />,
      isActive: location.pathname === '/users'
    },
    {
      to: "/settings",
      label: "Settings",
      icon: <Settings className="sidebar-icon" />,
      isActive: location.pathname === '/settings'
    }
  ];
  
  return (
    <aside className="h-screen bg-sidebar z-30 flex flex-col w-full">
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border bg-sidebar">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-white">
          <Laptop className="h-6 w-6" />
          <span>Techlinx Helpdesk</span>
        </Link>
        
        {/* Mobile close button */}
        {isMobile && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={closeSidebar}
            className="text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-sidebar">
        <div className="mb-6">
          <div className="mb-2 text-xs font-semibold uppercase text-sidebar-foreground/50">
            Main Menu
          </div>
          <nav>
            <ul className="space-y-1">
              {menuItems.map((item) => {
                // Check if item should be shown (based on user role)
                const shouldShow = 
                  (item.showOnlyForConsultant && isConsultant) || 
                  (item.showOnlyForUser && !isConsultant) || 
                  (!item.showOnlyForConsultant && !item.showOnlyForUser);
                
                return shouldShow && (
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
                );
              })}
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
      
      <div className="p-4 border-t border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-white">
            {currentUser?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
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
