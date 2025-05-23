import React, { useState } from 'react';
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
  AlertCircle,
  FlaskConical
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TECHLINX_NAME } from '@/utils/techlinxTestCompany';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const CompanyManagementPage = () => {
  const { companies, currentUser, addCompany, updateCompany, deleteCompany } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
  
  // Sort companies: Techlinx Internal goes to the end, others are sorted alphabetically
  const sortedCompanies = [...companies].sort((a, b) => {
    // If a is Techlinx Internal, it should always come last
    if (a.name === TECHLINX_NAME) return 1;
    // If b is Techlinx Internal, it should always come last
    if (b.name === TECHLINX_NAME) return -1;
    // Otherwise, sort alphabetically
    return a.name.localeCompare(b.name);
  });
  
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
      // Call the database function to perform cascading delete
      const { error } = await supabase.rpc('handle_company_deletion', {
        company_id_param: companyToDelete
      });
      
      if (error) throw error;
      
      // Update local state using the context
      await deleteCompany(companyToDelete);
      
      toast.success("Company and all associated data deleted successfully");
      toast.info("Users have been detached from the deleted company");
    } catch (error: any) {
      console.error('Error deleting company:', error);
      let errorMsg = "Failed to delete company";
      
      // Extract more detailed error message if available
      if (error.message) {
        errorMsg += `: ${error.message}`;
      }
      
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      setIsDeleteDialogOpen(false);
      setCompanyToDelete(null);
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
        {sortedCompanies.map(company => {
          const isTechlinx = company.name === TECHLINX_NAME;
          return (
            <Card 
              key={company.id} 
              className={`relative overflow-hidden ${isTechlinx ? "border-purple-200 bg-gradient-to-r from-purple-50 to-white" : ""}`}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  {isTechlinx ? (
                    <Avatar className="bg-purple-100 border border-purple-200">
                      <AvatarFallback className="bg-purple-100 text-purple-700">
                        <FlaskConical className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  ) : company.logo ? (
                    <img src={company.logo} alt={company.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <Building className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <h2 className="text-lg font-semibold">{company.name}</h2>
                    {isTechlinx && (
                      <Badge variant="outline" className="bg-purple-100 text-purple-700 hover:bg-purple-200 self-start mt-1">
                        <FlaskConical className="h-3 w-3 mr-1" /> Test Zone
                      </Badge>
                    )}
                  </div>
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
                      {!isTechlinx && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleConfirmDelete(company.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          );
        })}
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
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the company and all associated data including news content and dashboard blocks.
              <br /><br />
              <strong>Note:</strong> Users will be detached from this company but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCompany}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Deleting...' : 'Delete Company & Associated Data'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CompanyManagementPage;
