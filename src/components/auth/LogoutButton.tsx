
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { forceSignOut } from '@/integrations/supabase/client';

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
      
      // First clear the Supabase token directly from localStorage
      localStorage.removeItem('sb-uaoeabhtbynyfzyfzogp-auth-token');
      
      // Use a Promise.allSettled to ensure we try all logout methods
      // even if some fail - this is more reliable than sequential try/catch
      await Promise.allSettled([
        signOut(),  // AuthContext method
        forceSignOut() // Direct client method
      ]);
      
      toast.success('Successfully logged out', { id: toastId });
      
      // Hard redirect to auth page with a clean slate
      window.location.href = '/auth?clean=true';
      
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error('Failed to log out. Trying force logout...');
      
      try {
        // Last resort: clear storage and force redirect
        localStorage.removeItem('sb-uaoeabhtbynyfzyfzogp-auth-token');
        await forceSignOut();
        window.location.href = '/auth?forced=true';
      } catch (secondError) {
        console.error('Critical error during forced logout:', secondError);
        toast.error('Failed to log out. Please try refreshing the page.');
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
