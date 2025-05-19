
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LogoutButton from '@/components/auth/LogoutButton';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import NavigationService from '@/services/navigationService';
import { useSidebar } from '@/context/SidebarContext';

const Header: React.FC = () => {
  const { currentUser } = useAppContext();
  const { isAuthenticated } = useAuth();
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  
  const handleSearchClick = () => {
    NavigationService.navigate('/search');
  };
  
  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center px-4 sticky top-0 z-10">
      <div className="w-full max-w-screen-xl mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={toggleSidebar}
            className="mr-4"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          
          <h1 className="text-xl font-bold text-gray-800 hidden md:block">
            {currentUser?.name || "Techlinx Dashboard"}
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleSearchClick}
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </Button>
          
          {isAuthenticated && <LogoutButton />}
        </div>
      </div>
    </header>
  );
};

export default Header;
