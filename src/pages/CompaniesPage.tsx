
import React, { useState } from 'react';
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
  Settings,
  Edit,
  Eye,
  Search,
  Beaker
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
import { useToast } from '@/components/ui/use-toast';
import { TECHLINX_NAME } from '@/utils/techlinxTestCompany';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const CompaniesPage = () => {
  const { companies, cases, currentUser, addCompany, deleteCompany } = useAppContext();
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();
  
  // Company management state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // If user is not a consultant, redirect them to the company dashboard
  if (currentUser?.role !== 'consultant' && currentUser?.companyId) {
    navigate('/company-dashboard');
    return null;
  }

  // Force direct URL navigation for dashboard builder
  const handleDashboardNavigation = (companyId: string) => {
    const path = `/company-dashboard-builder/${companyId}`;
    console.log(`Direct navigation to: ${path}`);
    // Force direct URL navigation to avoid routing issues
    toast.info("Opening dashboard builder...");
    window.location.href = path;
  };
  
  // Regular navigation for other links
  const handleNavigation = (path: string) => {
    try {
      navigate(path);
    } catch (error) {
      console.error(`Navigation error to ${path}:`, error);
      window.location.href = path;
    }
  };
  
  // Functions for managing companies
  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      uiToast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      await addCompany({
        name: companyName,
        logo: companyLogo || undefined
      });
      
      setIsDialogOpen(false);
      setCompanyName('');
      setCompanyLogo('');
      uiToast({
        title: "Success",
        description: "Company created successfully",
      });
    } catch (error) {
      console.error('Error creating company:', error);
      uiToast({
        title: "Error",
        description: "Failed to create company",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;
    
    setLoading(true);
    try {
      await deleteCompany(companyToDelete);
      setIsDeleteDialogOpen(false);
      setCompanyToDelete(null);
      uiToast({
        title: "Success",
        description: "Company deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting company:', error);
      uiToast({
        title: "Error",
        description: "Failed to delete company",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const confirmDeleteCompany = (companyId: string) => {
    setCompanyToDelete(companyId);
    setIsDeleteDialogOpen(true);
  };

  // Filter companies based on search query
  const filteredCompanies = companies.filter(company => 
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
        {currentUser?.role === 'consultant' && (
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        )}
      </div>
      
      {/* Search bar */}
      <div className="relative w-full">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search companies..."
          className="w-full pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {filteredCompanies.map(company => {
          // Find cases for this company
          const companyCases = cases.filter(c => c.companyId === company.id);
          const activeCases = companyCases.filter(c => c.status !== 'completed').length;
          
          // Check if this is the Techlinx test company
          const isTechlinx = company.name === TECHLINX_NAME;
          
          return (
            <Card 
              key={company.id} 
              className={isTechlinx ? 
                "border-purple-200 bg-gradient-to-r from-purple-50 to-white" : ""}
            >
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
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">{company.name}</h2>
                      {isTechlinx && (
                        <Badge variant="outline" className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                          <Beaker className="h-3 w-3 mr-1" /> Test Zone
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {currentUser?.role === 'consultant' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-vertical">
                            <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleNavigation(`/company/${company.id}/settings`)}
                          className="cursor-pointer"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Company Settings
                        </DropdownMenuItem>
                        {!isTechlinx && (
                          <DropdownMenuItem
                            onClick={() => confirmDeleteCompany(company.id)}
                            className="text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Company
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
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
                  
                  {/* Main buttons row - Documentation, Dashboard, Cases */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant="outline" 
                      className="flex gap-1 items-center justify-center h-11"
                      onClick={() => handleNavigation(`/companies/${company.id}`)}
                    >
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">Documentation</span>
                      <span className="sm:hidden">Docs</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="flex gap-1 items-center justify-center h-11"
                      onClick={() => handleDashboardNavigation(company.id)}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="flex gap-1 items-center justify-center h-11"
                      onClick={() => {
                        handleNavigation('/cases');
                        // Here we would implement filtering by company
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Cases
                    </Button>
                  </div>

                  {/* News buttons row */}
                  <div className="grid grid-cols-2 gap-2">
                    {currentUser?.role === 'consultant' && (
                      <Button 
                        variant="outline" 
                        className="flex gap-1 items-center justify-center h-11"
                        onClick={() => handleNavigation(`/company-news-builder/${company.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                        Edit News
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      className={`flex gap-1 items-center justify-center h-11 ${currentUser?.role !== 'consultant' ? 'col-span-2' : ''}`}
                      onClick={() => handleNavigation(`/company-news/${company.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                      View News
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredCompanies.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No companies found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
      
      {/* Add Company Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Company'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Company Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the company
              and all associated data including users and cases.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
