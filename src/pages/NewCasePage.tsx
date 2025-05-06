
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ArrowLeft, Send, Save } from 'lucide-react';

const NewCasePage = () => {
  const navigate = useNavigate();
  const { 
    addCase, 
    categories, 
    users, 
    companies, 
    currentUser 
  } = useAppContext();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [userId, setUserId] = useState(currentUser?.id || '');
  const [companyId, setCompanyId] = useState(currentUser?.companyId || '');
  const [language, setLanguage] = useState('en');
  const [files, setFiles] = useState<FileList | null>(null);
  
  const handleSubmit = (e: React.FormEvent, isDraft: boolean = false) => {
    e.preventDefault();
    
    if (!title || !description || !categoryId || !priority || !userId || !companyId) {
      return;
    }
    
    addCase({
      title,
      description,
      status: isDraft ? 'draft' : 'new',
      priority: priority as any,
      userId,
      companyId,
      categoryId,
    });
    
    navigate('/cases');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(e.target.files);
    }
  };
  
  const isConsultant = currentUser?.role === 'consultant';
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cases')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cases
        </Button>
      </div>
      
      <Card>
        <form onSubmit={(e) => handleSubmit(e, false)}>
          <CardHeader>
            <h1 className="text-xl font-bold">Create New Case</h1>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {isConsultant && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">User</label>
                  <Select 
                    value={userId} 
                    onValueChange={setUserId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select User" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company</label>
                  <Select 
                    value={companyId} 
                    onValueChange={setCompanyId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map(company => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Brief summary of the issue"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select 
                  value={categoryId} 
                  onValueChange={setCategoryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select 
                  value={priority} 
                  onValueChange={setPriority}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Language</label>
                <Select 
                  value={language} 
                  onValueChange={setLanguage}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="sv">Swedish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Detailed description of the issue..."
                rows={8}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Attachments</label>
              <Input 
                type="file" 
                onChange={handleFileChange}
                multiple
              />
              <p className="text-xs text-muted-foreground">
                You can upload multiple files (max 5MB each)
              </p>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => navigate('/cases')}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={(e) => handleSubmit(e, true)}
              disabled={!title || !categoryId || !priority}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button 
              type="submit"
              disabled={!title || !description || !categoryId || !priority}
            >
              <Send className="h-4 w-4 mr-2" />
              Submit Case
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default NewCasePage;
