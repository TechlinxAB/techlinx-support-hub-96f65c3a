import React, { useState } from 'react';
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

// Form schema for creating a new case
const newCaseSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters long' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters long' }),
  categoryId: z.string({ required_error: 'Please select a category' }),
  priority: z.enum(['low', 'medium', 'high'], { required_error: 'Please select a priority' }),
});

// Form values type
type NewCaseFormValues = z.infer<typeof newCaseSchema>;

const NewCasePage = () => {
  const { categories, companies, currentUser, addCase } = useAppContext();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values
  const form = useForm<NewCaseFormValues>({
    resolver: zodResolver(newCaseSchema),
    defaultValues: {
      title: '',
      description: '',
      categoryId: '',
      priority: 'medium',
    },
  });

  // Form submission handler
  const onSubmit = async (values: NewCaseFormValues) => {
    if (!currentUser) {
      toast.error('You must be logged in to create a case');
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
        userId: currentUser.id,
        companyId: currentUser.companyId || '',
        priority: values.priority,
        status: 'new',
      });

      if (!newCase) {
        throw new Error('Failed to create case');
      }
      
      // If this is a high priority case, send a notification
      if (isHighPriority) {
        console.log(`Sending high priority notification for new case ${newCase.id}`);
        
        // We no longer need a loading toast
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

  // If user isn't logged in or doesn't have a companyId, show a message
  if (!currentUser || !currentUser.companyId) {
    return (
      <div className="max-w-3xl mx-auto mt-8 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Unable to Create Case</CardTitle>
            <CardDescription>
              You need to be logged in and associated with a company to create a case.
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
            Fill out the form below to submit a new support case.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <Button type="submit" disabled={isSubmitting}>
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
