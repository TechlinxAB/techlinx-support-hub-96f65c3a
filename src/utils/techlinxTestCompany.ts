
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Techlinx test company name constant
export const TECHLINX_NAME = "Techlinx Solutions";

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
 * Clears Techlinx data from session storage
 * Useful for troubleshooting
 */
export const clearTechlinxCache = () => {
  sessionStorage.removeItem('techlinx_company');
  sessionStorage.removeItem('techlinx_content_checked');
  lastTechlinxCheckTime = 0;
  toast.success("Techlinx cache cleared");
};
