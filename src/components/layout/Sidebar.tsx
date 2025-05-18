
import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageCircle, Users, Settings, Clock, UserPlus, Building } from 'lucide-react';
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
    <aside 
      className={cn(
        "h-screen bg-sidebar z-30 flex flex-col transition-all duration-300",
        isOpen ? "w-64" : "w-0 md:w-16",
        "md:relative fixed left-0 top-0 bottom-0"
      )}
    >
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border bg-sidebar">
        <Link to="/" className={cn("flex items-center gap-2 font-bold text-xl text-white", !isOpen && "md:justify-center")}>
          <Clock className="h-6 w-6" />
          {isOpen && <span>Techlinx</span>}
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-sidebar">
        {isOpen && (
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
        )}
        
        {isOpen && isConsultant && (
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
        
        {!isOpen && (
          <div className="flex flex-col items-center space-y-4 pt-2">
            {menuItems.map((item) => {
              // Check if item should be shown (based on user role)
              const shouldShow = 
                (item.showOnlyForConsultant && isConsultant) || 
                (item.showOnlyForUser && !isConsultant) || 
                (!item.showOnlyForConsultant && !item.showOnlyForUser);
              
              return shouldShow && (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-md",
                    item.isActive 
                      ? "bg-sidebar-accent text-white" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
                  )}
                  title={item.label}
                >
                  {item.icon}
                </Link>
              );
            })}
            
            {isConsultant && adminItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-md",
                  item.isActive 
                    ? "bg-sidebar-accent text-white" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
                )}
                title={item.label}
              >
                {item.icon}
              </Link>
            ))}
          </div>
        )}
      </div>
      
      {isOpen && (
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
      )}
    </aside>
  );
};

export default Sidebar;
