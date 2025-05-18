
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { UserRound, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';

const ImpersonationBanner = () => {
  const { isImpersonating, impersonatedProfile, endImpersonation } = useAuth();

  if (!isImpersonating) {
    return null;
  }

  const handleEndImpersonation = async () => {
    try {
      await endImpersonation();
      toast.success("You've returned to your account");
    } catch (error: any) {
      toast.error("Error ending impersonation", {
        description: error.message || "Please try again later",
      });
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-yellow-900 py-2 px-4 z-50 shadow-lg flex justify-between items-center">
      <div className="flex items-center gap-2">
        <UserRound className="h-5 w-5" />
        <span className="font-medium">
          Viewing as: {impersonatedProfile?.name || impersonatedProfile?.email || 'User'}
        </span>
        <ArrowLeftRight className="h-4 w-4" />
      </div>
      <Button 
        variant="destructive" 
        size="sm" 
        className="bg-yellow-600 hover:bg-yellow-700 text-white"
        onClick={handleEndImpersonation}
      >
        End Impersonation
      </Button>
    </div>
  );
};

export default ImpersonationBanner;
