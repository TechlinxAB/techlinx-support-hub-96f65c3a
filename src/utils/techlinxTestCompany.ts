
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Techlinx test company name constant
export const TECHLINX_NAME = "Techlinx Internal";

// Track last check time to prevent frequent checks
let lastTechlinxCheckTime = 0;
const CHECK_INTERVAL = 300000; // 5 minutes in milliseconds
const LOG_LEVEL = {
  NONE: 0,
  ERROR: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level - change to LOG_LEVEL.NONE for production
const CURRENT_LOG_LEVEL = LOG_LEVEL.ERROR;

/**
 * Logger utility for controlled logging
 */
const logger = {
  error: (message: string, ...args: any[]) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVEL.ERROR) {
      console.error(message, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVEL.INFO) {
      console.info(message, ...args);
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVEL.DEBUG) {
      console.debug(message, ...args);
    }
  }
};

/**
 * Gets the Techlinx test company if it exists
 * @returns The company object or null if not found
 */
const getTechlinxCompany = async () => {
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("name", TECHLINX_NAME)
      .single();
    
    if (error) {
      // Check if it's a "not found" error (PGRST116) or something else
      if (error.code === 'PGRST116') {
        return null; // Company not found
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    logger.error("Error searching for Techlinx:", error);
    throw error;
  }
};

/**
 * Creates the Techlinx test company
 * @returns The newly created company
 */
const createTechlinxCompany = async () => {
  logger.info("Creating Techlinx test company...");
  
  try {
    const { data, error } = await supabase
      .from("companies")
      .insert({
        name: TECHLINX_NAME,
        logo: "/placeholder.svg"
      })
      .select()
      .single();
    
    if (error) {
      logger.error("Error creating Techlinx:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    logger.error("Error creating Techlinx:", error);
    throw error;
  }
};

/**
 * Creates test content for Techlinx company
 * @param companyId The Techlinx company ID
 */
const createTechlinxContent = async (companyId: string) => {
  logger.info(`Creating sample content for Techlinx company ${companyId}...`);
  
  // Check if content already exists
  const contentChecked = sessionStorage.getItem('techlinx_content_checked');
  if (contentChecked) {
    logger.info("Sample content already exists for Techlinx");
    return;
  }
  
  try {
    // Create a default category if it doesn't exist
    const { data: categoryData, error: categoryError } = await supabase
      .from("categories")
      .select("*")
      .eq("name", "General")
      .single();
    
    let categoryId;
    
    if (categoryError && categoryError.code === 'PGRST116') {
      // Category doesn't exist, create it
      const { data: newCategory, error: createCategoryError } = await supabase
        .from("categories")
        .insert({ name: "General" })
        .select()
        .single();
      
      if (createCategoryError) {
        throw createCategoryError;
      }
      
      categoryId = newCategory.id;
    } else if (categoryError) {
      throw categoryError;
    } else {
      categoryId = categoryData.id;
    }
    
    // Create default documentation
    // Create default announcements
    // Create default dashboard blocks
    
    // Mark content as checked to avoid repeated checks
    sessionStorage.setItem('techlinx_content_checked', 'true');
    
  } catch (error) {
    logger.error("Error creating Techlinx content:", error);
    // Don't throw, we can still use Techlinx without sample content
  }
};

/**
 * Ensures that the Techlinx test company exists
 * @returns The company object
 */
export const ensureTechlinxCompanyExists = async () => {
  try {
    // Check if we've checked recently and use cached company if available
    const now = Date.now();
    if (now - lastTechlinxCheckTime < CHECK_INTERVAL) {
      // Use cached result if available
      const cachedCompany = sessionStorage.getItem('techlinx_company');
      if (cachedCompany) {
        return JSON.parse(cachedCompany);
      }
    }
    
    lastTechlinxCheckTime = now;
    logger.info("Checking if Techlinx company exists...");
    
    // Check if company already exists
    let company = await getTechlinxCompany();
    
    // If company doesn't exist, create it
    if (!company) {
      company = await createTechlinxCompany();
      
      // Create default content for the new company
      await createTechlinxContent(company.id);
    }
    
    // Cache the result
    sessionStorage.setItem('techlinx_company', JSON.stringify(company));
    
    return company;
  } catch (error) {
    logger.error("Error in ensureTechlinxCompanyExists:", error);
    throw error;
  }
};

/**
 * Assigns a consultant to Techlinx company
 * @param consultantId The consultant user ID
 * @param companyId The Techlinx company ID
 */
export const assignConsultantToTechlinx = async (consultantId: string, companyId: string) => {
  try {
    logger.info(`Assigning consultant ${consultantId} to Techlinx ${companyId}`);
    
    // Check if already assigned
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", consultantId)
      .single();
    
    if (profileError) {
      throw profileError;
    }
    
    // If already assigned to this company, no need to update
    if (profile.company_id === companyId) {
      logger.info("Consultant already assigned to Techlinx");
      return profile;
    }
    
    // Update the consultant's company_id
    const { data, error } = await supabase
      .from("profiles")
      .update({ company_id: companyId })
      .eq("id", consultantId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    logger.error("Error assigning consultant to Techlinx:", error);
    throw error;
  }
};

/**
 * Creates sample content for Techlinx
 * @param companyId The Techlinx company ID
 * @param userId The current user ID
 */
export const createTechlinxSampleContent = async (companyId: string, userId: string) => {
  try {
    // Check if sample content was already created
    const contentCreated = sessionStorage.getItem(`techlinx_content_created_${companyId}`);
    if (contentCreated) {
      logger.info("Sample content already created for Techlinx");
      return;
    }
    
    logger.info(`Creating sample content for Techlinx company ${companyId}...`);
    
    // Create default categories
    const categories = ["Technical Support", "Billing", "Features"];
    for (const categoryName of categories) {
      const { data: existingCategory } = await supabase
        .from("categories")
        .select("*")
        .eq("name", categoryName)
        .maybeSingle();
      
      if (!existingCategory) {
        await supabase
          .from("categories")
          .insert({ name: categoryName });
      }
    }
    
    // Create sample dashboard blocks if none exist
    const { data: existingBlocks } = await supabase
      .from("dashboard_blocks")
      .select("*")
      .eq("company_id", companyId);
    
    if (!existingBlocks || existingBlocks.length === 0) {
      const welcomeBlock = {
        company_id: companyId,
        title: "Welcome to Techlinx Internal",
        type: "welcome",
        position: 0,
        content: JSON.stringify({
          message: "Welcome to our support portal. Find documentation and create support cases here.",
          image: "/placeholder.svg"
        }),
        created_by: userId
      };
      
      await supabase.from("dashboard_blocks").insert(welcomeBlock);
    }
    
    // Create sample announcements if none exist
    const { data: existingAnnouncements } = await supabase
      .from("announcements")
      .select("*")
      .eq("company_id", companyId);
    
    if (!existingAnnouncements || existingAnnouncements.length === 0) {
      const announcements = [
        {
          company_id: companyId,
          title: "New Support Portal",
          content: "Welcome to our new support portal. We're excited to help you with any questions!",
          is_active: true
        },
        {
          company_id: companyId,
          title: "Scheduled Maintenance",
          content: "There will be scheduled maintenance this weekend. Please plan accordingly.",
          is_active: true
        }
      ];
      
      await supabase.from("announcements").insert(announcements);
    }
    
    // Create sample documentation if none exists
    const { data: existingDocs } = await supabase
      .from("documentation")
      .select("*")
      .eq("company_id", companyId);
    
    if (!existingDocs || existingDocs.length === 0) {
      const docs = [
        {
          company_id: companyId,
          title: "Getting Started",
          content: "# Getting Started\nThis guide will help you get started with our product.",
        },
        {
          company_id: companyId,
          title: "Frequently Asked Questions",
          content: "# FAQs\n## How do I reset my password?\nYou can reset your password from the login page.",
        }
      ];
      
      await supabase.from("documentation").insert(docs);
    }
    
    // Mark as created to avoid duplicating content
    sessionStorage.setItem(`techlinx_content_created_${companyId}`, 'true');
    
  } catch (error) {
    logger.error("Error creating Techlinx sample content:", error);
    // Don't throw, just log the error
  }
};

/**
 * Clears Techlinx data from session storage
 * Useful for troubleshooting
 */
export const clearTechlinxCache = () => {
  sessionStorage.removeItem('techlinx_company');
  sessionStorage.removeItem('techlinx_content_checked');
  
  // Also clear content creation flags
  const keys = Object.keys(sessionStorage);
  keys.forEach(key => {
    if (key.startsWith('techlinx_content_created_')) {
      sessionStorage.removeItem(key);
    }
  });
  
  lastTechlinxCheckTime = 0;
  toast.success("Techlinx cache cleared");
};
