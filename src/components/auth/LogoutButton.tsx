
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // First try the context method
      await signOut();
      
      // As a backup, also call our enhanced force signout method
      const result = await forceSignOut();
      
      if (result.wasForced) {
        toast.info('Forced logout completed. Please refresh if you encounter any issues.');
      } else {
        toast.success('Successfully logged out');
      }
      
      // Force navigation to auth page with replace to prevent back button issues
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Even if there's an error, try force signout as a last resort
      try {
        await forceSignOut();
        toast.info('Forced logout completed due to error in normal logout flow.');
        window.location.href = '/auth';
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
