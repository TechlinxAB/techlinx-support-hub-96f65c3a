
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
      
      // ENHANCED: Local-first approach - guarantee client-side state is cleared first
      await clearAuthState();
      
      // Then try the context's signOut method (which might also interact with the server)
      // But if it fails, we've already cleared local state, which is what matters most
      try {
        await signOut();
      } catch (contextError) {
        // This is not critical since we've already cleared local state
        console.log('Context signOut returned error (not critical):', contextError);
      }
      
      toast.success('Successfully logged out', { id: toastId });
      
      // Only navigate if redirectAfterLogout is true
      if (redirectAfterLogout) {
        // Navigate to auth page
        navigate('/auth', { replace: true });
      }
    } catch (error) {
      console.error('Error during logout process:', error);
      toast.error('Error during logout, but session has been cleared');
      
      // Even on error, try one more time to clear client state
      await clearAuthState();
      
      // Force navigation to auth page as a last resort if redirectAfterLogout is true
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
