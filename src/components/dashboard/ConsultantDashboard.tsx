import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Star, 
  StarOff,
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  FilePlus, 
  Users,
  ArrowRight,
  Beaker,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import TechlinxTestZone from './TechlinxTestZone';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { ensureTechlinxCompanyExists, assignConsultantToTechlinx, createTechlinxSampleContent } from '@/utils/techlinxTestCompany';
import { useStarredCases } from '@/hooks/useStarredCases';
import { Switch } from '@/components/ui/switch';

const ConsultantDashboard = () => {
  const navigate = useNavigate();
  const { cases, currentUser, users, companies, refetchCompanies } = useAppContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const { starredCases, toggleStar } = useStarredCases();
  const [isSettingUpTechlinx, setIsSettingUpTechlinx] = useState(false);
  
  // State for toggling the test zone visibility
  const [showTestZone, setShowTestZone] = useState(() => {
    // Get the stored preference or default to true (visible)
    const stored = localStorage.getItem('showTechlinxTestZone');
    return stored === null ? true : stored === 'true';
  });
  
  // Store preference in localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('showTechlinxTestZone', String(showTestZone));
  }, [showTestZone]);
  
  // Ensure Techlinx company exists on component mount
  useEffect(() => {
    const setupTechlinx = async () => {
      if (currentUser?.role !== 'consultant' || isSettingUpTechlinx) return;
      
      setIsSettingUpTechlinx(true);
      try {
        // Check if Techlinx already exists
        const techlinxCompany = await ensureTechlinxCompanyExists();
        
        if (techlinxCompany && user) {
          // Ensure current consultant is assigned to Techlinx
          if (!currentUser.companyId) {
            await assignConsultantToTechlinx(currentUser.id, techlinxCompany.id);
          }
          
          // Create sample content for Techlinx
          await createTechlinxSampleContent(techlinxCompany.id, user.id);
          
          // Refresh companies list
          await refetchCompanies();
        }
      } catch (error) {
        console.error("Error setting up Techlinx:", error);
        toast({
          title: "Error Setting Up Test Zone",
          description: "There was an error setting up the Techlinx test zone. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsSettingUpTechlinx(false);
      }
    };
    
    setupTechlinx();
  }, [currentUser, user, refetchCompanies, toast, isSettingUpTechlinx]);
  
  // Get user details by ID
  const getUserById = (id: string) => {
    return users.find(user => user.id === id)?.name || 'Unknown User';
  };
  
  // Get company name by ID
  const getCompanyById = (id: string) => {
    return companies.find(company => company.id === id)?.name || 'Unknown Company';
  };
  
  // Calculate days since last update
  const getDaysSinceUpdate = (updatedAt: Date | string) => {
    const now = new Date();
    const updateDate = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
    const diffTime = Math.abs(now.getTime() - updateDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  // Filter for New Cases (3 most recent with 'new' status)
  const newCases = cases
    .filter(c => c.status === 'new')
    .sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 3);
  
  // Filter for Ongoing Cases (3 cases where last update wasn't by consultant)
  const ongoingCases = cases
    .filter(c => c.status === 'ongoing')
    // We'd need reply data to know who last updated, but for now we'll just use all ongoing cases
    .sort((a, b) => {
      const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
      const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 3);
  
  // Filter for Awaiting Confirmation Cases (3 most recent 'resolved' status)
  const awaitingConfirmationCases = cases
    .filter(c => c.status === 'resolved')
    .sort((a, b) => {
      const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
      const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 3);
  
  // Filter for Overdue Cases (over 30 days since last update, status is 'new' or 'ongoing')
  const overdueCases = cases
    .filter(c => 
      (c.status === 'new' || c.status === 'ongoing') && 
      getDaysSinceUpdate(c.updatedAt) > 30
    )
    .sort((a, b) => {
      const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
      const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 3);
  
  // Recent Activity Feed (user actions only)
  // In a real implementation, we'd have a separate table for activities
  // For now, we'll simulate with recent cases as a placeholder
  const recentActivities = cases
    .sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5)
    .map(c => ({
      timestamp: c.createdAt,
      description: `${getUserById(c.userId)} submitted: '${c.title}'`,
      caseId: c.id,
      companyId: c.companyId
    }));
  
  // Filter cases that are starred
  const watchlistCases = cases.filter(c => starredCases.includes(c.id));
  
  // Navigate to case detail
  const viewCase = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };

  // Handle star toggle with stopPropagation to prevent row click
  const handleStarToggle = (e: React.MouseEvent, caseId: string) => {
    e.stopPropagation();
    toggleStar(caseId);
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Consultant Dashboard</h1>
      
      {/* Techlinx Test Zone - conditionally rendered based on toggle */}
      {showTestZone && <TechlinxTestZone />}
      
      {/* Case Overview Panels - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* New Cases Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Badge variant="default" className="bg-green-500">New</Badge>
              New Cases
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            {newCases.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case</TableHead>
                    <TableHead>User/Company</TableHead>
                    <TableHead className="w-[50px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newCases.map(caseItem => (
                    <TableRow 
                      key={caseItem.id} 
                      onClick={() => viewCase(caseItem.id)}
                      className="cursor-pointer hover:bg-muted"
                    >
                      <TableCell className="font-medium">{caseItem.title}</TableCell>
                      <TableCell>
                        {getUserById(caseItem.userId)} • {getCompanyById(caseItem.companyId)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => handleStarToggle(e, caseItem.id)}
                        >
                          {starredCases.includes(caseItem.id) ? 
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : 
                            <Star className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-6">No new cases</p>
            )}
          </CardContent>
        </Card>
        
        {/* Ongoing Cases Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Badge variant="default" className="bg-blue-500">Active</Badge>
              Ongoing Cases
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            {ongoingCases.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case</TableHead>
                    <TableHead>User/Company</TableHead>
                    <TableHead className="w-[50px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ongoingCases.map(caseItem => (
                    <TableRow 
                      key={caseItem.id} 
                      onClick={() => viewCase(caseItem.id)}
                      className="cursor-pointer hover:bg-muted"
                    >
                      <TableCell className="font-medium">{caseItem.title}</TableCell>
                      <TableCell>
                        {getUserById(caseItem.userId)} • {getCompanyById(caseItem.companyId)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => handleStarToggle(e, caseItem.id)}
                        >
                          {starredCases.includes(caseItem.id) ? 
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : 
                            <Star className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-6">No ongoing cases</p>
            )}
          </CardContent>
        </Card>
        
        {/* Awaiting Confirmation Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Badge variant="default" className="bg-yellow-500">Pending</Badge>
              Awaiting Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            {awaitingConfirmationCases.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case</TableHead>
                    <TableHead>User/Company</TableHead>
                    <TableHead className="w-[50px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awaitingConfirmationCases.map(caseItem => (
                    <TableRow 
                      key={caseItem.id} 
                      onClick={() => viewCase(caseItem.id)}
                      className="cursor-pointer hover:bg-muted"
                    >
                      <TableCell className="font-medium">{caseItem.title}</TableCell>
                      <TableCell>
                        {getUserById(caseItem.userId)} • {getCompanyById(caseItem.companyId)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => handleStarToggle(e, caseItem.id)}
                        >
                          {starredCases.includes(caseItem.id) ? 
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : 
                            <Star className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-6">No cases awaiting confirmation</p>
            )}
          </CardContent>
        </Card>
        
        {/* Overdue Cases Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Badge variant="destructive">Overdue</Badge>
              Overdue Cases
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            {overdueCases.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case</TableHead>
                    <TableHead>User/Company</TableHead>
                    <TableHead className="w-[50px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueCases.map(caseItem => (
                    <TableRow 
                      key={caseItem.id} 
                      onClick={() => viewCase(caseItem.id)}
                      className="cursor-pointer hover:bg-muted"
                    >
                      <TableCell className="font-medium">
                        <div>
                          {caseItem.title}
                          <div className="text-xs text-red-500 mt-1">
                            {`${getDaysSinceUpdate(caseItem.updatedAt)} days since last update`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getUserById(caseItem.userId)} • {getCompanyById(caseItem.companyId)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => handleStarToggle(e, caseItem.id)}
                        >
                          {starredCases.includes(caseItem.id) ? 
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : 
                            <Star className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-6">No overdue cases</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.map((activity, index) => (
                  <TableRow 
                    key={index}
                    onClick={() => viewCase(activity.caseId)}
                    className="cursor-pointer hover:bg-muted"
                  >
                    <TableCell className="font-medium">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </TableCell>
                    <TableCell>{activity.description}</TableCell>
                    <TableCell>{getCompanyById(activity.companyId)}</TableCell>
                    <TableCell className="text-right">
                      <ArrowRight className="h-4 w-4 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
                {recentActivities.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6">No recent activity</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Right Column: Watchlist and Quick Actions */}
        <div className="space-y-6">
          {/* Case Watchlist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-medium">Watchlist</CardTitle>
            </CardHeader>
            <CardContent>
              {watchlistCases.length > 0 ? (
                <Table>
                  <TableBody>
                    {watchlistCases.map(caseItem => (
                      <TableRow 
                        key={caseItem.id} 
                        onClick={() => viewCase(caseItem.id)}
                        className="cursor-pointer hover:bg-muted"
                      >
                        <TableCell>
                          <div className="font-medium">{caseItem.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {getUserById(caseItem.userId)} • {getCompanyById(caseItem.companyId)}
                          </div>
                        </TableCell>
                        <TableCell className="w-[50px] text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => handleStarToggle(e, caseItem.id)}
                            title="Remove from watchlist"
                          >
                            <StarOff className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 space-y-2">
                  <p className="text-muted-foreground">No cases in your watchlist</p>
                  <p className="text-sm text-muted-foreground">Star cases to add them here</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Quick Actions Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full justify-start" onClick={() => navigate('/cases/new')}>
                <FilePlus className="mr-2 h-4 w-4" />
                Create New Case
              </Button>
              <Button className="w-full justify-start" onClick={() => navigate('/users')}>
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Techlinx Test Zone Toggle at bottom */}
      <Card className="mt-6">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-purple-500" />
            <span className="text-sm font-medium">Techlinx Test Zone</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {showTestZone ? 'Visible' : 'Hidden'}
            </span>
            <Switch
              checked={showTestZone}
              onCheckedChange={setShowTestZone}
              aria-label="Toggle Techlinx test zone visibility"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsultantDashboard;
