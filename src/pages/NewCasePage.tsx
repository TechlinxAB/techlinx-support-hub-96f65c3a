import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { notificationService } from '@/services/notificationService';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Form schema for creating a new case
const newCaseSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters long' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters long' }),
  categoryId: z.string({ required_error: 'Please select a category' }),
  priority: z.enum(['low', 'medium', 'high'], { required_error: 'Please select a priority' }),
  userId: z.string().optional(), // Optional for consultants to select user
});

// Form values type
type NewCaseFormValues = z.infer<typeof newCaseSchema>;

interface User {
  id: string;
  name: string;
  email: string;
  company_id: string;
  company_name: string;
}

interface SupabaseUserResult {
  id: string;
  name: string;
  email: string;
  company_id: string;
  companies: {
    name: string;
  };
}

const NewCasePage = () => {
  const { categories, addCase } = useAppContext();
  const { profile: currentUser } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const isConsultant = currentUser?.role === 'consultant';

  // Initialize form with default values
  const form = useForm<NewCaseFormValues>({
    resolver: zodResolver(newCaseSchema),
    defaultValues: {
      title: '',
      description: '',
      categoryId: '',
      priority: 'medium',
      userId: isConsultant ? '' : currentUser?.id,
    },
  });

  // Fetch users if current user is a consultant
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isConsultant) return;
      
      setLoadingUsers(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            name,
            email,
            company_id,
            companies!inner (
              name
            )
          `)
          .eq('role', 'user')
          .not('company_id', 'is', null)
          .order('name');

        if (error) {
          console.error('Error fetching users:', error);
          toast.error('Failed to load users');
          return;
        }

        console.log('Raw Supabase data:', data);

        // Transform the data to match our User interface
        const transformedUsers: User[] = (data as SupabaseUserResult[] || []).map(user => {
          const companyName = user.companies?.name || 'Unknown Company';
          
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            company_id: user.company_id,
            company_name: companyName
          };
        });

        console.log('Transformed users with companies:', transformedUsers);
        setUsers(transformedUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [isConsultant]);

  // Form submission handler
  const onSubmit = async (values: NewCaseFormValues) => {
    if (!currentUser) {
      toast.error('You must be logged in to create a case');
      return;
    }

    // Determine which user the case is being created for
    let targetUserId = currentUser.id;
    let targetCompanyId = currentUser.companyId || '';

    if (isConsultant && values.userId) {
      const selectedUser = users.find(u => u.id === values.userId);
      if (!selectedUser) {
        toast.error('Please select a valid user');
        return;
      }
      targetUserId = selectedUser.id;
      targetCompanyId = selectedUser.company_id;
    } else if (!isConsultant && !currentUser.companyId) {
      toast.error('You need to be associated with a company to create a case');
      return;
    }

    setIsSubmitting(true);
    
    const isHighPriority = values.priority === 'high';
    console.log(`Creating new case with priority: ${values.priority}, isHighPriority: ${isHighPriority}`);

    try {
      // Add the case to the database
      const newCase = await addCase({
        title: values.title,
        description: values.description,
        categoryId: values.categoryId,
        userId: targetUserId,
        companyId: targetCompanyId,
        priority: values.priority,
        status: 'new',
      });

      if (!newCase) {
        throw new Error('Failed to create case');
      }
      
      // If this is a high priority case, send a notification
      if (isHighPriority) {
        console.log(`Sending high priority notification for new case ${newCase.id}`);
        
        notificationService.sendHighPriorityCaseNotification(newCase.id)
          .catch(error => {
            console.error(`Error sending high priority notification: ${error.message}`);
          });
      }

      toast.success('Case created successfully');
      navigate(`/cases/${newCase.id}`);
    } catch (error) {
      console.error('Error creating case:', error);
      toast.error('Failed to create case');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user isn't logged in, show a message
  if (!currentUser) {
    return (
      <div className="max-w-3xl mx-auto mt-8 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Unable to Create Case</CardTitle>
            <CardDescription>
              You need to be logged in to create a case.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // If regular user doesn't have a companyId, show a message
  if (!isConsultant && !currentUser.companyId) {
    return (
      <div className="max-w-3xl mx-auto mt-8 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Unable to Create Case</CardTitle>
            <CardDescription>
              You need to be associated with a company to create a case.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-8 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Create New Case</CardTitle>
          <CardDescription>
            {isConsultant 
              ? "Fill out the form below to create a support case on behalf of a user."
              : "Fill out the form below to submit a new support case."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {isConsultant && (
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Create Case For User</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingUsers}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select a user"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.email}) - {user.company_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Case Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a title for your case" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your issue in detail..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(-1)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || (isConsultant && !form.watch('userId'))}>
                  {isSubmitting ? 'Submitting...' : 'Submit Case'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewCasePage;
