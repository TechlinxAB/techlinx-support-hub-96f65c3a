
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { clearAuthState } from '@/integrations/supabase/client';

interface LogoutButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  // New property to control redirection behavior
  redirectAfterLogout?: boolean;
}

const LogoutButton = ({ 
  variant = 'ghost',
  size = 'default',
  className = '',
  // Default to true to maintain backward compatibility
  redirectAfterLogout = true
}: LogoutButtonProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent multiple clicks
    
    try {
      setIsLoggingOut(true);
      const toastId = toast.loading('Logging out...');
      
      try {
        // Use enhanced signOut method
        await signOut();
      } catch (error) {
        console.error("Primary signOut failed, trying fallback", error);
        // Fallback - manual cleanup
        await clearAuthState();
      }
      
      toast.success('Successfully logged out', { id: toastId });
      
      // Only navigate if redirectAfterLogout is true
      if (redirectAfterLogout) {
        // Navigate to auth page
        navigate('/auth', { replace: true });
      }
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error('Failed to log out. Please try again.');
      
      // Last resort - hard redirect, but only if redirectAfterLogout is true
      if (redirectAfterLogout) {
        window.location.href = '/auth';
      }
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
