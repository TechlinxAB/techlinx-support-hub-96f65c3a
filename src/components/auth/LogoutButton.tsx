
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import navigationService from '@/services/navigationService';

interface LogoutButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const LogoutButton = ({ 
  variant = 'ghost',
  size = 'default',
  className = ''
}: LogoutButtonProps) => {
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent multiple clicks
    
    try {
      setIsLoggingOut(true);
      const toastId = toast.loading('Logging out...');
      
      await signOut();
      
      toast.success('Successfully logged out', { id: toastId });
      
      // Hard redirect to ensure clean slate
      navigationService.hardRedirect('/auth?clean=true');
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error('Failed to log out. Please try again.');
      setIsLoggingOut(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      className={className}
      disabled={isLoggingOut}
    >
      <LogOut className="h-4 w-4 mr-2" />
      <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
    </Button>
  );
};

export default LogoutButton;
