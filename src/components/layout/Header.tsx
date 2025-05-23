
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
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
  const { toggleSidebar, isMobile, isSidebarOpen } = useSidebar();
  const navigate = useNavigate();
  
  const handleMenuClick = (e: React.MouseEvent) => {
    // Completely isolate this click
    e.preventDefault();
    e.stopPropagation();
    
    // Toggle the sidebar
    toggleSidebar();
  };
  
  return (
    <header className="h-16 border-b border-gray-200 bg-white sticky top-0 z-20 w-full">
      <Container className="h-full">
        <div className="flex justify-between items-center h-full">
          <div className="flex items-center">
            {/* Only show menu button on mobile */}
            {isMobile && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleMenuClick}
                className="mr-4"
                aria-label="Toggle menu"
                data-testid="mobile-menu-button"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            )}
          </div>
          
          <div className="flex items-center">
            {isAuthenticated && <LogoutButton />}
          </div>
        </div>
      </Container>
    </header>
  );
};

export default Header;
