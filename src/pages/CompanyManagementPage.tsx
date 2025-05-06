
import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Building, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Plus 
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

const CompanyManagementPage = () => {
  const { companies, currentUser, addCompany, updateCompany, deleteCompany } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  
  // Reset form state when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      // Use a timeout to ensure state resets after animations complete
      const timer = setTimeout(() => {
        setSelectedCompany(null);
        setName('');
        setLogo('');
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isDialogOpen]);

  // Reset delete state when delete dialog closes
  useEffect(() => {
    if (!isDeleteDialogOpen) {
      // Use a timeout to ensure state resets after animations complete
      const timer = setTimeout(() => {
        setCompanyToDelete(null);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isDeleteDialogOpen]);
  
  // Only consultants can access this page
  if (currentUser?.role !== 'consultant') {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-lg text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }
  
  const handleOpenDialog = (mode: 'create' | 'edit', companyId?: string) => {
    setDialogMode(mode);
    setSelectedCompany(companyId || null);
    
    if (mode === 'create') {
      // Reset form for new company
      setName('');
      setLogo('');
    } else if (mode === 'edit' && companyId) {
      // Pre-fill form for edit
      const company = companies.find(c => c.id === companyId);
      if (company) {
        setName(company.name);
        setLogo(company.logo || '');
      }
    }
    
    setIsDialogOpen(true);
  };

  const handleConfirmDelete = (companyId: string) => {
    setCompanyToDelete(companyId);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;
    
    setLoading(true);
    try {
      // Close dialog before operation
      setIsDeleteDialogOpen(false);
      
      await deleteCompany(companyToDelete);
      
      // First set the company to delete to null before showing toast
      const deletedCompanyId = companyToDelete;
      setCompanyToDelete(null);
      
      // Show toast after UI state is updated
      setTimeout(() => {
        toast({
          title: "Company Deleted",
          description: "The company has been successfully removed",
        });
      }, 300);
    } catch (error: any) {
      // Make sure we clean up state even on error
      setCompanyToDelete(null);
      
      toast({
        title: "Error",
        description: error.message || "Failed to delete company",
        variant: "destructive",
      });
      console.error('Error deleting company:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      if (dialogMode === 'create') {
        await addCompany({
          name,
          logo: logo || undefined
        });
        
        // Close the dialog before showing toast
        setIsDialogOpen(false);
        
        // Add a small delay before showing toast to ensure dialog is closed
        setTimeout(() => {
          toast({
            title: "Company Created",
            description: "New company has been successfully created",
          });
        }, 300);
      } else if (dialogMode === 'edit' && selectedCompany) {
        await updateCompany(selectedCompany, {
          name,
          logo: logo || undefined
        });
        
        // Close the dialog before showing toast
        setIsDialogOpen(false);
        
        // Add a small delay before showing toast to ensure dialog is closed
        setTimeout(() => {
          toast({
            title: "Company Updated",
            description: "Company information has been successfully updated",
          });
        }, 300);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
      console.error('Error submitting form:', error);
      
      // Don't close dialog on error so user can try again
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Company Management</h1>
        <Button onClick={() => handleOpenDialog('create')} disabled={loading}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Company
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map(company => (
          <Card key={company.id} className="relative overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  {company.logo ? (
                    <img src={company.logo} alt={company.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <Building className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <h2 className="text-lg font-semibold">{company.name}</h2>
              </div>
              
              <div className="flex justify-end mt-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={loading}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleOpenDialog('edit', company.id)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleConfirmDelete(company.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      <Dialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          // Only allow closing if not currently loading
          if (!loading || !open) {
            setIsDialogOpen(open);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'Add New Company' : 'Edit Company'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'create' 
                ? 'Add a new company to the platform.' 
                : 'Update company information.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input 
                  id="name" 
                  placeholder="Company name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL (Optional)</Label>
                <Input 
                  id="logo" 
                  placeholder="Logo image URL" 
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  if (!loading) setIsDialogOpen(false);
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (dialogMode === 'create' ? 'Creating...' : 'Updating...') : 
                  (dialogMode === 'create' ? 'Create Company' : 'Update Company')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={(open) => {
          // Only allow closing if not currently loading
          if (!loading || !open) {
            setIsDeleteDialogOpen(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the company
              and may affect users associated with this company.
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

export default CompanyManagementPage;
