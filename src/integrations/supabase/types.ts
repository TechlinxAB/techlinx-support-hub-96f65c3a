export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          company_id: string
          content: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      case_attachments: {
        Row: {
          case_id: string
          content_type: string | null
          created_at: string | null
          created_by: string
          file_name: string
          file_path: string
          id: string
          reply_id: string | null
          size: number | null
        }
        Insert: {
          case_id: string
          content_type?: string | null
          created_at?: string | null
          created_by: string
          file_name: string
          file_path: string
          id?: string
          reply_id?: string | null
          size?: number | null
        }
        Update: {
          case_id?: string
          content_type?: string | null
          created_at?: string | null
          created_by?: string
          file_name?: string
          file_path?: string
          id?: string
          reply_id?: string | null
          size?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "case_attachments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_attachments_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "replies"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          assigned_to_id: string | null
          category_id: string
          company_id: string
          created_at: string | null
          description: string
          id: string
          priority: Database["public"]["Enums"]["case_priority"] | null
          status: Database["public"]["Enums"]["case_status"] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to_id?: string | null
          category_id: string
          company_id: string
          created_at?: string | null
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["case_priority"] | null
          status?: Database["public"]["Enums"]["case_status"] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to_id?: string | null
          category_id?: string
          company_id?: string
          created_at?: string | null
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["case_priority"] | null
          status?: Database["public"]["Enums"]["case_status"] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string | null
          id: string
          logo: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          logo?: string | null
          name?: string
        }
        Relationships: []
      }
      company_news_blocks: {
        Row: {
          company_id: string
          content: Json
          created_at: string | null
          created_by: string
          id: string
          is_published: boolean | null
          parent_id: string | null
          position: number
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          content: Json
          created_at?: string | null
          created_by: string
          id?: string
          is_published?: boolean | null
          parent_id?: string | null
          position: number
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          content?: Json
          created_at?: string | null
          created_by?: string
          id?: string
          is_published?: boolean | null
          parent_id?: string | null
          position?: number
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_news_blocks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_news_blocks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "company_news_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          show_active_cases: boolean | null
          show_company_dashboard_button: boolean | null
          show_company_news_button: boolean | null
          show_company_notices: boolean | null
          show_new_case_button: boolean | null
          show_subtitle: boolean | null
          show_welcome: boolean | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          show_active_cases?: boolean | null
          show_company_dashboard_button?: boolean | null
          show_company_news_button?: boolean | null
          show_company_notices?: boolean | null
          show_new_case_button?: boolean | null
          show_subtitle?: boolean | null
          show_welcome?: boolean | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          show_active_cases?: boolean | null
          show_company_dashboard_button?: boolean | null
          show_company_news_button?: boolean | null
          show_company_notices?: boolean | null
          show_new_case_button?: boolean | null
          show_subtitle?: boolean | null
          show_welcome?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_blocks: {
        Row: {
          company_id: string
          content: Json
          created_at: string | null
          created_by: string
          id: string
          parent_id: string | null
          position: number
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          content: Json
          created_at?: string | null
          created_by: string
          id?: string
          parent_id?: string | null
          position: number
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          content?: Json
          created_at?: string | null
          created_by?: string
          id?: string
          parent_id?: string | null
          position?: number
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_blocks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_blocks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "dashboard_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation: {
        Row: {
          company_id: string
          content: string
          created_at: string | null
          id: string
          parent_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentation_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentation_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "documentation"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          company_id: string
          content: string
          created_at: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faqs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          impersonated_user_id: string
          original_user_id: string
          status: Database["public"]["Enums"]["impersonation_status"]
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          impersonated_user_id: string
          original_user_id: string
          status?: Database["public"]["Enums"]["impersonation_status"]
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          impersonated_user_id?: string
          original_user_id?: string
          status?: Database["public"]["Enums"]["impersonation_status"]
        }
        Relationships: []
      }
      notes: {
        Row: {
          case_id: string
          content: string
          created_at: string | null
          deleted_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          case_id: string
          content: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          case_id?: string
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          base_url: string | null
          created_at: string
          debug_mode: boolean | null
          email_provider: string | null
          email_signature: string | null
          enable_priority_notifications: boolean | null
          high_priority_color: string | null
          id: number
          log_level: string | null
          resend_api_key: string | null
          sender_email: string | null
          sender_name: string | null
          services_email: string
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          smtp_user: string | null
          updated_at: string
        }
        Insert: {
          base_url?: string | null
          created_at?: string
          debug_mode?: boolean | null
          email_provider?: string | null
          email_signature?: string | null
          enable_priority_notifications?: boolean | null
          high_priority_color?: string | null
          id?: number
          log_level?: string | null
          resend_api_key?: string | null
          sender_email?: string | null
          sender_name?: string | null
          services_email?: string
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          updated_at?: string
        }
        Update: {
          base_url?: string | null
          created_at?: string
          debug_mode?: boolean | null
          email_provider?: string | null
          email_signature?: string | null
          enable_priority_notifications?: boolean | null
          high_priority_color?: string | null
          id?: number
          log_level?: string | null
          resend_api_key?: string | null
          sender_email?: string | null
          sender_name?: string | null
          services_email?: string
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body: string
          created_at: string
          subject: string
          type: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          subject: string
          type: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          subject?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string | null
          company_id: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          preferred_language:
            | Database["public"]["Enums"]["language_preference"]
            | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          avatar?: string | null
          company_id?: string | null
          created_at?: string | null
          email: string
          id: string
          name: string
          phone?: string | null
          preferred_language?:
            | Database["public"]["Enums"]["language_preference"]
            | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          avatar?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          preferred_language?:
            | Database["public"]["Enums"]["language_preference"]
            | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      replies: {
        Row: {
          case_id: string
          content: string
          created_at: string | null
          deleted_at: string | null
          id: string
          is_internal: boolean | null
          user_id: string
        }
        Insert: {
          case_id: string
          content: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_internal?: boolean | null
          user_id: string
        }
        Update: {
          case_id?: string
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_internal?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replies_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      belongs_to_company: {
        Args: { company_id: string }
        Returns: boolean
      }
      check_notification_trigger_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          trigger_name: string
          is_active: boolean
          table_name: string
          function_name: string
        }[]
      }
      check_pg_net_availability: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      handle_company_deletion: {
        Args: { company_id_param: string }
        Returns: undefined
      }
      is_consultant: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      test_http_request: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      test_notification_system: {
        Args: { case_id: string }
        Returns: string
      }
    }
    Enums: {
      case_priority: "low" | "medium" | "high"
      case_status: "new" | "ongoing" | "resolved" | "completed" | "draft"
      impersonation_status: "active" | "ended"
      language_preference: "en" | "sv"
      user_role: "user" | "consultant"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      case_priority: ["low", "medium", "high"],
      case_status: ["new", "ongoing", "resolved", "completed", "draft"],
      impersonation_status: ["active", "ended"],
      language_preference: ["en", "sv"],
      user_role: ["user", "consultant"],
    },
  },
} as const
