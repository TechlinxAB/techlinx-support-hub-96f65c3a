
export interface CompanySettingsRow {
  id: string;
  company_id: string;
  show_welcome: boolean;
  show_subtitle: boolean;
  show_new_case_button: boolean;
  show_company_news_button: boolean;
  show_company_dashboard_button: boolean;
  show_active_cases: boolean;
  show_company_notices: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardSettings {
  showWelcome: boolean;
  showSubtitle: boolean;
  showNewCaseButton: boolean;
  showCompanyNewsButton: boolean;
  showCompanyDashboardButton: boolean;
  showActiveCases: boolean;
  showCompanyNotices: boolean;
}

export interface CompanyAnnouncement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export interface UserCaseItem {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
}
