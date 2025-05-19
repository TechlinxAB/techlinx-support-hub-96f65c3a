
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LogoutButton from '@/components/auth/LogoutButton';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import NavigationService from '@/services/navigationService';
import { useSidebar } from '@/context/SidebarContext';
import Container from './Container';

const Header: React.FC = () => {
  const { currentUser } = useAppContext();
  const { isAuthenticated } = useAuth();
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  
  return (
    <header className="h-16 border-b border-gray-200 bg-white sticky top-0 z-10 w-full">
      <Container className="h-full">
        <div className="flex justify-between items-center h-full">
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
            
            {/* Removed the name display that was here */}
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Removed search icon button that was here */}
            
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
      </Container>
    </header>
  );
};

export default Header;
