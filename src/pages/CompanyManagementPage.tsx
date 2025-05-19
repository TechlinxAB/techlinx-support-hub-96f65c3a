
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
  Plus,
  Settings,
  AlertCircle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CompanyManagementPage = () => {
  const { companies, currentUser, addCompany, updateCompany, deleteCompany } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasRelatedData, setHasRelatedData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  // Form state
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  
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

  const checkCompanyDependencies = async (companyId: string) => {
    try {
      // Check for news blocks
      const { data: newsBlocks, error: newsError } = await supabase
        .from('company_news_blocks')
        .select('id')
        .eq('company_id', companyId)
        .limit(1);
      
      if (newsError) throw newsError;
      
      // Check for users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_id', companyId)
        .limit(1);
      
      if (usersError) throw usersError;
      
      // Check for cases
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select('id')
        .eq('company_id', companyId)
        .limit(1);
      
      if (casesError) throw casesError;
      
      // Check for other dependencies here...
      
      // If any dependencies exist, set the flag and error message
      const hasNewsBlocks = newsBlocks && newsBlocks.length > 0;
      const hasUsers = users && users.length > 0;
      const hasCases = cases && cases.length > 0;
      
      const hasDependencies = hasNewsBlocks || hasUsers || hasCases;
      setHasRelatedData(hasDependencies);
      
      if (hasDependencies) {
        let message = "Cannot delete company because it has:";
        if (hasNewsBlocks) message += " news content,";
        if (hasUsers) message += " associated users,";
        if (hasCases) message += " active cases,";
        
        // Remove the trailing comma and add period
        message = message.slice(0, -1) + ".";
        message += " Please remove these dependencies first or contact support.";
        
        setErrorMessage(message);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error checking company dependencies:", error);
      setErrorMessage("An error occurred while checking company dependencies. Please try again later.");
      return true;
    }
  };

  const handleConfirmDelete = async (companyId: string) => {
    setCompanyToDelete(companyId);
    setLoading(true);
    setErrorMessage(null);
    
    try {
      const hasDependencies = await checkCompanyDependencies(companyId);
      
      if (!hasDependencies) {
        setErrorMessage(null);
      }
    } catch (error) {
      console.error("Error in delete confirmation:", error);
      setErrorMessage("Failed to check company dependencies. Please try again.");
    } finally {
      setLoading(false);
      setIsDeleteDialogOpen(true);
    }
  };
  
  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;
    
    setLoading(true);
    try {
      // If there are no dependencies, proceed with deletion
      if (!hasRelatedData) {
        await deleteCompany(companyToDelete);
        toast.success("Company deleted successfully");
      } else {
        toast.error(errorMessage || "Cannot delete company with dependencies");
      }
    } catch (error: any) {
      console.error('Error deleting company:', error);
      let errorMsg = "Failed to delete company";
      
      // Extract more detailed error message if available
      if (error.message) {
        errorMsg += `: ${error.message}`;
      }
      
      if (error.details) {
        setErrorMessage(error.details);
      }
      
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      setIsDeleteDialogOpen(false);
      setCompanyToDelete(null);
      setHasRelatedData(false);
      setErrorMessage(null);
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
        toast.success("Company created successfully");
      } else if (dialogMode === 'edit' && selectedCompany) {
        await updateCompany(selectedCompany, {
          name,
          logo: logo || undefined
        });
        toast.success("Company updated successfully");
      }
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error("Error saving company information");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToSettings = (companyId: string) => {
    navigate(`/company/${companyId}/settings`);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Company Management</h1>
        <Button onClick={() => handleOpenDialog('create')}>
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
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleGoToSettings(company.id)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
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
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hasRelatedData ? (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Cannot Delete Company
                </div>
              ) : "Are you absolutely sure?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hasRelatedData ? (
                <div className="text-red-600">
                  {errorMessage || "This company has related data that prevents deletion."}
                </div>
              ) : (
                "This action cannot be undone. This will permanently delete the company and may affect users associated with this company."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!hasRelatedData && (
              <AlertDialogAction 
                onClick={handleDeleteCompany}
                disabled={loading || hasRelatedData}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading ? 'Deleting...' : 'Delete Company'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CompanyManagementPage;
