
import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Define our schema for notification settings
const notificationFormSchema = z.object({
  servicesEmail: z.string().email("Invalid email address"),
  userSubject: z.string().min(5, "Subject must be at least 5 characters"),
  userBody: z.string().min(20, "Template must be at least 20 characters"),
  consultantSubject: z.string().min(5, "Subject must be at least 5 characters"),
  consultantBody: z.string().min(20, "Template must be at least 20 characters"),
  emailSignature: z.string().optional(),
});

type NotificationFormValues = z.infer<typeof notificationFormSchema>;

const SettingsPage = () => {
  const { currentUser, categories } = useAppContext();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState({
    servicesEmail: "services@techlinx.se",
    userSubject: "Your case has been updated",
    userBody: "Your case {case_title} has received a new reply.",
    consultantSubject: "New case reply notification",
    consultantBody: "Case {case_title} has received a new reply from {user_name}.",
    emailSignature: "Best regards,\nThe Techlinx Support Team",
  });

  // Form
  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      servicesEmail: templates.servicesEmail,
      userSubject: templates.userSubject,
      userBody: templates.userBody,
      consultantSubject: templates.consultantSubject,
      consultantBody: templates.consultantBody,
      emailSignature: templates.emailSignature,
    },
  });

  // Load existing notification settings from the database
  useEffect(() => {
    const fetchNotificationSettings = async () => {
      try {
        // First, get the services email from notification_settings
        const { data: settingsData } = await supabase
          .from('notification_settings')
          .select('*')
          .single();

        // Then, get the email templates
        const { data: templatesData } = await supabase
          .from('notification_templates')
          .select('*');

        if (templatesData) {
          const userTemplate = templatesData.find(t => t.type === 'user_notification');
          const consultantTemplate = templatesData.find(t => t.type === 'consultant_notification');
          
          const newTemplates = {
            servicesEmail: settingsData?.services_email || "services@techlinx.se",
            userSubject: userTemplate?.subject || templates.userSubject,
            userBody: userTemplate?.body || templates.userBody,
            consultantSubject: consultantTemplate?.subject || templates.consultantSubject,
            consultantBody: consultantTemplate?.body || templates.consultantBody,
            emailSignature: settingsData?.email_signature || templates.emailSignature,
          };
          
          setTemplates(newTemplates);
          form.reset(newTemplates);
        }
      } catch (error) {
        console.error("Error fetching notification settings:", error);
      }
    };
    
    fetchNotificationSettings();
  }, []);

  // Save notification settings
  const onSubmitNotifications = async (data: NotificationFormValues) => {
    setLoading(true);
    try {
      // Update notification_settings
      const { error: settingsError } = await supabase
        .from('notification_settings')
        .upsert([
          {
            id: 1, // Using a fixed ID for the single settings record
            services_email: data.servicesEmail,
            email_signature: data.emailSignature,
            updated_at: new Date().toISOString(),
          }
        ]);

      if (settingsError) throw settingsError;

      // Update user notification template
      const { error: userTemplateError } = await supabase
        .from('notification_templates')
        .upsert([
          {
            type: 'user_notification',
            subject: data.userSubject,
            body: data.userBody,
            updated_at: new Date().toISOString(),
          }
        ]);

      if (userTemplateError) throw userTemplateError;

      // Update consultant notification template
      const { error: consultantTemplateError } = await supabase
        .from('notification_templates')
        .upsert([
          {
            type: 'consultant_notification',
            subject: data.consultantSubject,
            body: data.consultantBody,
            updated_at: new Date().toISOString(),
          }
        ]);

      if (consultantTemplateError) throw consultantTemplateError;

      toast.success("Notification settings saved successfully");
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast.error("Failed to save notification settings");
    } finally {
      setLoading(false);
    }
  };

  // Add a new category
  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const { error } = await supabase
        .from('categories')
        .insert({ name: newCategoryName });
      
      if (error) throw error;
      
      // Refetch categories
      await useAppContext().refetchCategories();
      setNewCategoryName('');
      toast.success("Category added successfully");
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("Failed to add category");
    }
  };

  // Delete a category
  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Refetch categories
      await useAppContext().refetchCategories();
      toast.success("Category deleted successfully");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };
  
  // Only consultants can access this page
  if (currentUser?.role !== 'consultant') {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-lg text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      
      <Tabs defaultValue="system">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="system">System Settings</TabsTrigger>
          <TabsTrigger value="case">Case Settings</TabsTrigger>
          <TabsTrigger value="notification">Notification Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="system" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Configure general system settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="sv">Swedish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Default Time Zone</Label>
                <Select defaultValue="UTC+1">
                  <SelectTrigger>
                    <SelectValue placeholder="Select time zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="UTC+1">UTC+1 (Stockholm)</SelectItem>
                    <SelectItem value="UTC+2">UTC+2 (Helsinki)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Default Reply Template</Label>
                <Textarea 
                  placeholder="Enter default reply text..."
                  defaultValue="Thank you for your case submission. We are reviewing your request and will respond shortly."
                  rows={4}
                />
              </div>
              
              <div className="flex justify-end">
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="case" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Manage case categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map(category => (
                      <TableRow key={category.id}>
                        <TableCell>{category.name}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => deleteCategory(category.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="New category name" 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <Button onClick={addCategory}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Default Assignment Rules</CardTitle>
              <CardDescription>Configure automatic case assignment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enable automatic assignment</Label>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Round-robin assignment</Label>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>High priority alerts</Label>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex justify-end">
                  <Button>Save Settings</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notification" className="space-y-4 mt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitNotifications)} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Email Configuration</CardTitle>
                  <CardDescription>Configure email settings for notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="servicesEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Email Address</FormLabel>
                        <FormDescription>
                          Email address for consultants to receive notifications
                        </FormDescription>
                        <FormControl>
                          <Input placeholder="services@techlinx.se" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>User Notification Template</CardTitle>
                  <CardDescription>Template for emails sent to users when their case is updated</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="userSubject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="Your case has been updated" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="userBody"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Body</FormLabel>
                        <FormDescription>
                          You can use these placeholders: {"{case_title}"}, {"{case_id}"}, {"{case_status}"}, 
                          {"{case_priority}"}, {"{category}"}, {"{user_name}"}, {"{reply_content}"}
                        </FormDescription>
                        <FormControl>
                          <Textarea 
                            rows={6} 
                            placeholder="Your case {case_title} has received a new reply." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Consultant Notification Template</CardTitle>
                  <CardDescription>Template for emails sent to consultants when a case is updated</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="consultantSubject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="New case reply notification" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="consultantBody"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Body</FormLabel>
                        <FormDescription>
                          You can use these placeholders: {"{case_title}"}, {"{case_id}"}, {"{case_status}"}, 
                          {"{case_priority}"}, {"{category}"}, {"{user_name}"}, {"{reply_content}"}
                        </FormDescription>
                        <FormControl>
                          <Textarea 
                            rows={6} 
                            placeholder="Case {case_title} has received a new reply from {user_name}." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Email Footer</CardTitle>
                  <CardDescription>Configure the signature that appears at the bottom of all emails</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="emailSignature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Signature</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={4} 
                            placeholder="Best regards,
The Techlinx Support Team" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Notification Settings"}
                  {!loading && <Save className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
