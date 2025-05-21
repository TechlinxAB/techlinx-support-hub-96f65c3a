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
import { 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Mail, 
  Plus, 
  Trash, 
  Save, 
  Send, 
  Check,
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { notificationService } from '@/services/notificationService';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define our schema for notification settings
const notificationFormSchema = z.object({
  servicesEmail: z.string().email("Invalid email address"),
  userSubject: z.string().min(5, "Subject must be at least 5 characters"),
  userBody: z.string().min(20, "Template must be at least 20 characters"),
  consultantSubject: z.string().min(5, "Subject must be at least 5 characters"),
  consultantBody: z.string().min(20, "Template must be at least 20 characters"),
  emailSignature: z.string().optional(),
  emailProvider: z.enum(["smtp", "none"]).default("none"),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(587).optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpSecure: z.boolean().default(false).optional(),
  senderEmail: z.string().email("Invalid sender email").optional(),
  senderName: z.string().min(2, "Sender name must be at least 2 characters").optional(),
  baseUrl: z.string().url("Must be a valid URL").default("https://helpdesk.techlinx.se"),
});

type NotificationFormValues = z.infer<typeof notificationFormSchema>;

const SettingsPage = () => {
  const { currentUser, categories, refetchCategories } = useAppContext();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [templates, setTemplates] = useState({
    servicesEmail: "services@techlinx.se",
    userSubject: "Your case has been updated",
    userBody: "Your case {case_title} has received a new reply. You can view and respond to this case by following this link: https://support.example.com/cases/{case_id}",
    consultantSubject: "New case reply notification",
    consultantBody: "Case {case_title} has received a new reply from {user_name}. You can view and respond to this case by following this link: https://support.example.com/cases/{case_id}",
    emailSignature: "Best regards,\nThe Techlinx Support Team",
    emailProvider: "none",
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    smtpSecure: false,
    senderEmail: "notifications@techlinx.se",
    senderName: "Techlinx Support",
    baseUrl: "https://helpdesk.techlinx.se",
  });
  const [isEmailConfigOpen, setIsEmailConfigOpen] = useState(false);
  const [isPlaceholdersOpen, setIsPlaceholdersOpen] = useState(true);

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
      emailProvider: templates.emailProvider as "smtp" | "none",
      smtpHost: templates.smtpHost,
      smtpPort: templates.smtpPort,
      smtpUser: templates.smtpUser,
      smtpPassword: templates.smtpPassword,
      smtpSecure: templates.smtpSecure,
      senderEmail: templates.senderEmail,
      senderName: templates.senderName,
      baseUrl: templates.baseUrl,
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
            emailProvider: settingsData?.email_provider || "none",
            smtpHost: settingsData?.smtp_host || "",
            smtpPort: settingsData?.smtp_port || 587,
            smtpUser: settingsData?.smtp_user || "",
            smtpPassword: settingsData?.smtp_password || "",
            smtpSecure: settingsData?.smtp_secure || false,
            senderEmail: settingsData?.sender_email || "notifications@techlinx.se",
            senderName: settingsData?.sender_name || "Techlinx Support",
            baseUrl: settingsData?.base_url || "https://helpdesk.techlinx.se",
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
            email_provider: data.emailProvider,
            smtp_host: data.smtpHost,
            smtp_port: data.smtpPort,
            smtp_user: data.smtpUser,
            smtp_password: data.smtpPassword,
            smtp_secure: data.smtpSecure,
            sender_email: data.senderEmail,
            sender_name: data.senderName,
            base_url: data.baseUrl,
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

  // Send a test email
  const sendTestEmail = async () => {
    if (!testEmailAddress) {
      toast.error("Please enter a test email address");
      return;
    }

    setTestEmailLoading(true);
    
    try {
      const success = await notificationService.sendTestEmail(testEmailAddress);
      if (!success) {
        throw new Error("Failed to send test email");
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      toast.error("Failed to send test email", {
        description: error.message || "An error occurred"
      });
    } finally {
      setTestEmailLoading(false);
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
      await refetchCategories();
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
      await refetchCategories();
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
  
  // Template placeholders for reference
  const templatePlaceholders = [
    { name: '{case_title}', description: 'The title of the case' },
    { name: '{case_id}', description: 'The ID of the case (for links)' },
    { name: '{case_status}', description: 'The current status of the case' },
    { name: '{case_priority}', description: 'The priority level of the case' },
    { name: '{category}', description: 'The category of the case' },
    { name: '{user_name}', description: 'The name of the user who created the reply' },
    { name: '{reply_content}', description: 'The content of the latest reply' },
    { name: '{case_link}', description: 'The full URL to view the case' },
  ];

  // Display a placeholder in the textarea
  const insertPlaceholder = (placeholder: string, fieldName: "userBody" | "consultantBody") => {
    const field = form.getValues(fieldName);
    const textarea = document.getElementById(fieldName) as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = field || "";
      const newText = text.substring(0, start) + placeholder + text.substring(end);
      form.setValue(fieldName, newText, { shouldValidate: true });
      
      // Set focus and cursor position after the inserted placeholder
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    } else {
      // Fallback if we can't find the textarea
      const currentText = field || "";
      form.setValue(fieldName, currentText + " " + placeholder, { shouldValidate: true });
    }
  };

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
                  <CardTitle>Email Provider Configuration</CardTitle>
                  <CardDescription>Configure your email service provider for sending notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="emailProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Provider</FormLabel>
                        <FormDescription>
                          Select which email service to use for sending notifications
                        </FormDescription>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select email provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None (Log emails only)</SelectItem>
                            <SelectItem value="smtp">SMTP (Microsoft 365, Gmail, etc)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {form.watch("emailProvider") === "smtp" && (
                    <Collapsible
                      open={isEmailConfigOpen}
                      onOpenChange={setIsEmailConfigOpen}
                      className="border rounded-md p-2"
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex justify-between items-center p-2 cursor-pointer hover:bg-muted">
                          <h4 className="text-sm font-medium">SMTP Configuration Settings</h4>
                          <Button variant="ghost" size="sm">
                            {isEmailConfigOpen ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="smtpHost"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SMTP Server</FormLabel>
                                <FormDescription>
                                  Your SMTP server address
                                </FormDescription>
                                <FormControl>
                                  <Input placeholder="smtp.office365.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="smtpPort"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SMTP Port</FormLabel>
                                <FormDescription>
                                  SMTP server port (usually 587 for Office 365)
                                </FormDescription>
                                <FormControl>
                                  <Input type="number" placeholder="587" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <FormField
                            control={form.control}
                            name="smtpUser"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SMTP Username</FormLabel>
                                <FormDescription>
                                  Usually your full email address
                                </FormDescription>
                                <FormControl>
                                  <Input placeholder="your.email@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="smtpPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SMTP Password</FormLabel>
                                <FormDescription>
                                  Your email account password
                                </FormDescription>
                                <FormControl>
                                  <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="smtpSecure"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Use SSL/TLS</FormLabel>
                                <FormDescription>
                                  Enable secure connection (TLS)
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <FormField
                            control={form.control}
                            name="senderEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sender Email</FormLabel>
                                <FormDescription>
                                  The email address notifications will be sent from
                                </FormDescription>
                                <FormControl>
                                  <Input placeholder="notifications@yourdomain.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="senderName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sender Name</FormLabel>
                                <FormDescription>
                                  The name that will appear as the sender
                                </FormDescription>
                                <FormControl>
                                  <Input placeholder="Your Company Support" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="p-4 border rounded-md bg-amber-50 border-amber-200 mt-4">
                          <div className="flex items-start">
                            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-2" />
                            <div className="text-sm text-amber-800">
                              <p className="font-medium">Microsoft 365 SMTP Setup</p>
                              <ol className="list-decimal ml-5 mt-1 space-y-1">
                                <li>Server: <code>smtp.office365.com</code></li>
                                <li>Port: <code>587</code></li>
                                <li>Use SSL/TLS: <code>Yes</code> (enables STARTTLS)</li>
                                <li>Username: Your full email address</li>
                                <li>Password: Your Microsoft 365 password or app password</li>
                                <li>For security, it's recommended to create an app password rather than using your main account password</li>
                              </ol>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                  
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Send Test Email</h4>
                    <div className="flex space-x-2">
                      <Input 
                        type="email" 
                        placeholder="recipient@example.com" 
                        value={testEmailAddress} 
                        onChange={(e) => setTestEmailAddress(e.target.value)} 
                        className="max-w-md"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={sendTestEmail}
                        disabled={testEmailLoading || form.watch("emailProvider") === "none"}
                      >
                        {testEmailLoading ? "Sending..." : "Test"}
                        {testEmailLoading ? null : <Send className="ml-2 h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Send a test email to verify your email configuration
                    </p>
                  </div>
                </CardContent>
              </Card>
              
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

                  <FormField
                    control={form.control}
                    name="baseUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application URL</FormLabel>
                        <FormDescription>
                          The base URL for case links in notification emails
                        </FormDescription>
                        <FormControl>
                          <Input placeholder="https://helpdesk.techlinx.se" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Template Placeholders</CardTitle>
                    <CardDescription>Available placeholders you can use in your email templates</CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsPlaceholdersOpen(!isPlaceholdersOpen)}
                  >
                    {isPlaceholdersOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CardHeader>
                {isPlaceholdersOpen && (
                  <CardContent>
                    <div className="bg-muted p-4 rounded-md border mb-4">
                      <h4 className="text-sm font-medium mb-2 flex items-center">
                        <HelpCircle className="h-4 w-4 mr-2" />
                        How to use placeholders
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Copy and paste these placeholders into your email templates. They will be automatically replaced with actual values when emails are sent.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                        {templatePlaceholders.map((placeholder) => (
                          <div key={placeholder.name} className="flex items-center">
                            <code className="bg-background border px-2 py-0.5 rounded text-sm font-mono">
                              {placeholder.name}
                            </code>
                            <span className="text-xs text-muted-foreground ml-2">
                              - {placeholder.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
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
                        <FormLabel className="flex items-center justify-between">
                          <span>Email Body</span>
                          <div className="flex gap-1">
                            {templatePlaceholders.map((placeholder) => (
                              <TooltipProvider key={placeholder.name}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => insertPlaceholder(placeholder.name, "userBody")}
                                    >
                                      {placeholder.name.replace(/[{}]/g, '')}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{placeholder.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </div>
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            id="userBody"
                            rows={6} 
                            placeholder="Your case {case_title} has received a new reply. You can view and respond to this case by following this link: https://support.example.com/cases/{case_id}" 
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
                        <FormLabel className="flex items-center justify-between">
                          <span>Email Body</span>
                          <div className="flex gap-1">
                            {templatePlaceholders.map((placeholder) => (
                              <TooltipProvider key={placeholder.name}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => insertPlaceholder(placeholder.name, "consultantBody")}
                                    >
                                      {placeholder.name.replace(/[{}]/g, '')}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{placeholder.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </div>
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            id="consultantBody"
                            rows={6} 
                            placeholder="Case {case_title} has received a new reply from {user_name}. You can view and respond to this case by following this link: https://support.example.com/cases/{case_id}" 
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
