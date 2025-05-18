
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Bell, Menu, LogOut, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
  const { language, setLanguage } = useAppContext();
  const { signOut, user, profile, status } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSigningOut, setIsSigningOut] = useState(false);
  const navigate = useNavigate();
  
  // Update time every minute
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Enhanced sign out with better UI feedback and error handling
  const handleSignOut = async () => {
    try {
      if (isSigningOut) return; // Prevent multiple clicks
      
      setIsSigningOut(true);
      
      // Update UI state to show signout in progress
      toast.loading("Signing out...");
      
      // Execute sign out process from auth context
      await signOut();
      
      // Force a redirect to auth page - this happens regardless of signout success
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 300);
      
    } catch (error) {
      console.error("Error during sign out:", error);
      toast.error("Error signing out. Please try again.");
    } finally {
      setIsSigningOut(false);
      toast.dismiss(); // Clear any loading toasts
    }
  };
  
  return (
    <header className="bg-white dark:bg-card border-b border-border h-16 px-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="text-sm text-muted-foreground">
        {format(currentTime, 'EEEE, MMMM d, yyyy')}
        <span className="ml-2 text-xs">
          {format(currentTime, 'HH:mm')}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
            2
          </span>
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={() => setLanguage(language === 'en' ? 'sv' : 'en')}
          className="text-sm"
        >
          {language === 'en' ? 'SV' : 'EN'}
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 bg-muted">
              <span className="font-medium text-xs">{profile?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              My Account
              <div className="text-xs text-muted-foreground">{profile?.email || user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleSignOut} 
              disabled={isSigningOut || status === 'LOADING'}
              className={isSigningOut ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {isSigningOut ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
