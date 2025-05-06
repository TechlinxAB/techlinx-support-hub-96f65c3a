
import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Building, 
  MessageCircle, 
  Clock, 
  FileText, 
  LayoutDashboard, 
  Plus,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useModal, useLoadingOperation } from '@/components/ui/modal-provider';

const CompaniesPage = () => {
  const { companies, cases, currentUser, addCompany, deleteCompany } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setIsLoading, resetModalState } = useModal();
  const { withLoading } = useLoadingOperation();
  
  // State
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Reset form state when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      setCompanyName('');
      setCompanyLogo('');
    }
  }, [isDialogOpen]);

  // Reset delete state when delete dialog closes
  useEffect(() => {
    if (!isDeleteDialogOpen) {
      setCompanyToDelete(null);
    }
  }, [isDeleteDialogOpen]);
  
  // Confirm delete company
  const confirmDeleteCompany = useCallback((companyId: string) => {
    setCompanyToDelete(companyId);
    setIsDeleteDialogOpen(true);
  }, []);
  
  // Handle company deletion
  const handleDeleteCompany = useCallback(async () => {
    if (!companyToDelete) return;
    
    try {
      setLoading(true);
      setIsLoading(true);
      
      // First close the dialog
      setIsDeleteDialogOpen(false);
      
      // Store the ID before clearing it
      const deletedId = companyToDelete;
      setCompanyToDelete(null);
      
      // Then delete the company
      await deleteCompany(deletedId);
      
      // Show toast
      toast({
        title: "Success",
        description: "Company deleted successfully",
      });
      
      // Reset all modal state
      resetModalState();
    } catch (error: any) {
      console.error('Error deleting company:', error.message);
      toast({
        title: "Error",
        description: "Failed to delete company",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsLoading(false);
      resetModalState();
    }
  }, [companyToDelete, deleteCompany, toast, setIsLoading, resetModalState]);
  
  // Handle adding company
  const handleAddCompany = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyName.trim()) {
      toast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      setIsLoading(true);
      
      await addCompany({
        name: companyName,
        logo: companyLogo || undefined
      });
      
      // Close dialog
      setIsDialogOpen(false);
      
      // Show toast
      toast({
        title: "Success",
        description: "Company created successfully",
      });
      
      // Reset form
      setCompanyName('');
      setCompanyLogo('');
      
      // Reset all modal state
      resetModalState();
    } catch (error: any) {
      console.error('Error creating company:', error.message);
      toast({
        title: "Error",
        description: "Failed to create company",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsLoading(false);
      resetModalState();
    }
  }, [companyName, companyLogo, addCompany, toast, setIsLoading, resetModalState]);

  // Navigation and initialization effects
  useEffect(() => {
    if (isLoaded && currentUser) {
      if (currentUser.role !== 'consultant' && currentUser.companyId) {
        navigate('/company-dashboard');
      }
    }
    
    // Mark component as loaded after initial rendering
    if (!isLoaded) {
      setIsLoaded(true);
    }
  }, [currentUser, navigate, isLoaded]);
  
  // Early return with loading state
  if (!isLoaded || !currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }
  
  // Access check - this is fine after all hooks are used
  if (currentUser.role !== 'consultant' && !currentUser.companyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have access to any companies.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
        {currentUser.role === 'consultant' && (
          <Button 
            onClick={() => setIsDialogOpen(true)}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        )}
      </div>
      
      {/* Companies grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map(company => {
          // Find cases for this company
          const companyCases = cases.filter(c => c.companyId === company.id);
          const activeCases = companyCases.filter(c => c.status !== 'completed').length;
          
          return (
            <Card key={company.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      {company.logo ? (
                        <img src={company.logo} alt={company.name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <Building className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <h2 className="text-lg font-semibold">{company.name}</h2>
                  </div>
                  
                  {currentUser.role === 'consultant' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={loading}>
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => confirmDeleteCompany(company.id)}
                          className="text-red-600 cursor-pointer"
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Company
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Active Cases:</span>
                      <span>{activeCases}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Total Cases:</span>
                      <span>{companyCases.length}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex gap-1 items-center justify-center"
                      onClick={() => navigate(`/companies/${company.id}`)}
                      disabled={loading}
                    >
                      <FileText className="h-4 w-4" />
                      Documentation
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex gap-1 items-center justify-center"
                      onClick={() => navigate(`/company-dashboard-builder/${company.id}`)}
                      disabled={loading}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex gap-1 items-center justify-center"
                      onClick={() => navigate('/cases')}
                      disabled={loading}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Cases
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Add Company Dialog */}
      <Dialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Company</DialogTitle>
            <DialogDescription>
              Create a new company to manage users and cases.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCompany} className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input 
                  id="name" 
                  placeholder="Enter company name" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL (Optional)</Label>
                <Input 
                  id="logo" 
                  placeholder="Enter logo image URL" 
                  value={companyLogo}
                  onChange={(e) => setCompanyLogo(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Company'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Company Confirmation Dialog */}
      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the company
              and all associated data including users and cases.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCompany}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Deleting...' : 'Delete Company'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CompaniesPage;
