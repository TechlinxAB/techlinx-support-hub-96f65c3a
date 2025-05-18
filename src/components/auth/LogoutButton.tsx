
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent multiple clicks
    
    try {
      setIsLoggingOut(true);
      const toastId = toast.loading('Logging out...');
      
      await signOut();
      
      toast.success('Successfully logged out', { id: toastId });
      
      // Navigate to auth page
      navigate('/auth');
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error('Failed to log out. Please try again.');
    } finally {
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
