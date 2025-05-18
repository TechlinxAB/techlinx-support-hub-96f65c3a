
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

  const handleLogout = async () => {
    try {
      // Show a toast to indicate logout is in progress
      const toastId = toast.loading('Logging out...');
      
      // Clear local storage directly to ensure clean state
      localStorage.removeItem('sb-uaoeabhtbynyfzyfzogp-auth-token');
      
      // First try the context method
      await signOut();
      
      // As a backup, also call our enhanced force signout method
      await forceSignOut();
      
      toast.success('Successfully logged out', { id: toastId });
      
      // Use a small timeout before redirecting to ensure state is cleared
      setTimeout(() => {
        // Navigate to auth page with replace and clear state
        window.location.replace('/auth');
      }, 300);
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Even if there's an error, try force signout as a last resort
      try {
        localStorage.removeItem('sb-uaoeabhtbynyfzyfzogp-auth-token');
        await forceSignOut();
        toast.info('Forced logout completed due to error in normal logout flow.');
        window.location.replace('/auth');
      } catch (secondError) {
        toast.error('Failed to log out. Please try refreshing the page.');
      }
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      className={className}
    >
      <LogOut className="h-4 w-4 mr-2" />
      <span>Log out</span>
    </Button>
  );
};

export default LogoutButton;
