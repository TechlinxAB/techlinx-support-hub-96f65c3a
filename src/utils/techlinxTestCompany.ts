
import { supabase } from "@/integrations/supabase/client";
import { Company } from "@/context/AppContext";

/**
 * Constants for Techlinx test company
 */
export const TECHLINX_NAME = "Techlinx";
export const TECHLINX_LOGO = "https://i.imgur.com/XqpQbMQ.png"; // Placeholder logo URL

/**
 * Ensures the Techlinx test company exists in the database
 * @returns The Techlinx company object or null if creation failed
 */
export const ensureTechlinxCompanyExists = async (): Promise<Company | null> => {
  try {
    // Check if Techlinx already exists
    const { data: existingCompanies, error: fetchError } = await supabase
      .from('companies')
      .select('*')
      .eq('name', TECHLINX_NAME);
    
    if (fetchError) {
      console.error("Error fetching Techlinx company:", fetchError.message);
      return null;
    }
    
    // If Techlinx already exists, return it
    if (existingCompanies && existingCompanies.length > 0) {
      return {
        id: existingCompanies[0].id,
        name: existingCompanies[0].name,
        logo: existingCompanies[0].logo,
        createdAt: new Date(existingCompanies[0].created_at) // Add createdAt property
      };
    }
    
    // Create Techlinx company if it doesn't exist
    const { data: newCompany, error: createError } = await supabase
      .from('companies')
      .insert({
        name: TECHLINX_NAME,
        logo: TECHLINX_LOGO
      })
      .select()
      .single();
    
    if (createError) {
      console.error("Error creating Techlinx company:", createError.message);
      return null;
    }
    
    return {
      id: newCompany.id,
      name: newCompany.name,
      logo: newCompany.logo,
      createdAt: new Date(newCompany.created_at) // Add createdAt property
    };
  } catch (error) {
    console.error("Unexpected error ensuring Techlinx exists:", error);
    return null;
  }
};

/**
 * Assigns a consultant user to the Techlinx company
 * @param userId The ID of the consultant user to assign
 * @param techlinxCompanyId The ID of the Techlinx company
 * @returns True if successful, false otherwise
 */
export const assignConsultantToTechlinx = async (userId: string, techlinxCompanyId: string): Promise<boolean> => {
  try {
    // Update the user's company_id to Techlinx
    const { error } = await supabase
      .from('profiles')
      .update({ company_id: techlinxCompanyId })
      .eq('id', userId)
      .eq('role', 'consultant');
    
    if (error) {
      console.error("Error assigning consultant to Techlinx:", error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Unexpected error assigning consultant to Techlinx:", error);
    return false;
  }
};

/**
 * Creates sample content for the Techlinx test company
 * @param techlinxCompanyId The ID of the Techlinx company
 * @param createdBy The ID of the user creating the sample content
 */
export const createTechlinxSampleContent = async (techlinxCompanyId: string, createdBy: string): Promise<void> => {
  try {
    // Check if dashboard blocks already exist for Techlinx
    const { data: existingBlocks } = await supabase
      .from('dashboard_blocks')
      .select('*')
      .eq('company_id', techlinxCompanyId);
    
    // Only create sample blocks if none exist
    if (!existingBlocks || existingBlocks.length === 0) {
      // Create some sample dashboard blocks
      await supabase
        .from('dashboard_blocks')
        .insert([
          {
            company_id: techlinxCompanyId,
            title: 'Welcome to Techlinx Test Zone',
            content: JSON.stringify({
              text: 'This is a test environment for consultants to try out features safely.'
            }),
            type: 'welcome',
            position: 0,
            created_by: createdBy
          },
          {
            company_id: techlinxCompanyId,
            title: 'Test Dashboard Block',
            content: JSON.stringify({
              text: 'This is a sample dashboard block you can experiment with.'
            }),
            type: 'text',
            position: 1,
            created_by: createdBy
          }
        ]);
    }

    // Check if news blocks already exist for Techlinx
    const { data: existingNews } = await supabase
      .from('company_news_blocks')
      .select('*')
      .eq('company_id', techlinxCompanyId);
    
    // Only create sample news if none exist
    if (!existingNews || existingNews.length === 0) {
      // Create some sample news blocks
      await supabase
        .from('company_news_blocks')
        .insert([
          {
            company_id: techlinxCompanyId,
            title: 'Welcome to Techlinx News',
            content: JSON.stringify({
              text: 'This is the test news section where you can try creating and publishing company news.'
            }),
            type: 'text',
            position: 0,
            created_by: createdBy,
            is_published: true
          }
        ]);
    }
  } catch (error) {
    console.error("Error creating sample content for Techlinx:", error);
  }
};

/**
 * Checks if a company is the protected Techlinx test company
 * @param companyName The name of the company to check
 * @returns True if the company is Techlinx, false otherwise
 */
export const isTechlinxCompany = (companyName: string): boolean => {
  return companyName === TECHLINX_NAME;
};

/**
 * Retrieves the Techlinx company object
 * @returns The Techlinx company object
 */
export const getTechlinxCompany = async (): Promise<Company> => {
  // Check if Techlinx already exists
  const { data: companyData, error: fetchError } = await supabase
    .from('companies')
    .select('*')
    .eq('name', TECHLINX_NAME);
  
  if (fetchError) {
    console.error("Error fetching Techlinx company:", fetchError.message);
    return {
      id: 'techlinx-test',
      name: 'Techlinx Test',
      logo: '/placeholder.svg',
      createdAt: new Date()
    };
  }
  
  // If Techlinx already exists, return it
  if (companyData && companyData.length > 0) {
    return {
      id: companyData[0].id,
      name: companyData[0].name,
      logo: companyData[0].logo,
      createdAt: new Date(companyData[0].created_at)
    };
  }
  
  // Create Techlinx company if it doesn't exist
  const { data: newCompany, error: createError } = await supabase
    .from('companies')
    .insert({
      name: TECHLINX_NAME,
      logo: TECHLINX_LOGO
    })
    .select()
    .single();
  
  if (createError) {
    console.error("Error creating Techlinx company:", createError.message);
    return {
      id: 'techlinx-test',
      name: 'Techlinx Test',
      logo: '/placeholder.svg',
      createdAt: new Date()
    };
  }
  
  return {
    id: newCompany.id,
    name: newCompany.name,
    logo: newCompany.logo,
    createdAt: new Date(newCompany.created_at)
  };
};

/**
 * Retrieves the test company object
 * @returns The test company object
 */
export const getTestCompanyObject = async (): Promise<Company> => {
  // Check if Techlinx already exists
  const { data: companyData, error: fetchError } = await supabase
    .from('companies')
    .select('*')
    .eq('name', TECHLINX_NAME);
  
  if (fetchError) {
    console.error("Error fetching Techlinx company:", fetchError.message);
    return {
      id: 'techlinx-test',
      name: 'Techlinx Test',
      logo: '/placeholder.svg',
      createdAt: new Date()
    };
  }
  
  // If Techlinx already exists, return it
  if (companyData && companyData.length > 0) {
    return {
      id: companyData[0].id,
      name: companyData[0].name,
      logo: companyData[0].logo,
      createdAt: new Date(companyData[0].created_at)
    };
  }
  
  // Create Techlinx company if it doesn't exist
  const { data: newCompany, error: createError } = await supabase
    .from('companies')
    .insert({
      name: TECHLINX_NAME,
      logo: TECHLINX_LOGO
    })
    .select()
    .single();
  
  if (createError) {
    console.error("Error creating Techlinx company:", createError.message);
    return {
      id: 'techlinx-test',
      name: 'Techlinx Test',
      logo: '/placeholder.svg',
      createdAt: new Date()
    };
  }
  
  return {
    id: newCompany.id,
    name: newCompany.name,
    logo: newCompany.logo,
    createdAt: new Date(newCompany.created_at)
  };
};
