export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Profile = {
  id: string
  username: string
  full_name: string | null
  avatar_path: string | null
  timezone: string
  locale: string
  onboarded_at: string | null
  terms_accepted_at: string | null
  privacy_accepted_at: string | null
  age_confirmed_at: string | null
  created_at: string
  updated_at: string
}

export type AcademicYear = {
  id: string
  user_id: string
  name: string
  starts_on: string
  ends_on: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Subject = {
  id: string
  user_id: string
  academic_year_id: string
  name: string
  description: string | null
  color_hex: string
  teacher_names: string[]
  notes: string | null
  evaluation_criteria: string | null
  methodology: string | null
  created_at: string
  updated_at: string
}

export type UserSettings = {
  user_id: string
  week_starts_on: number
  theme: 'dark' | 'light' | 'system'
  email_reminders_enabled: boolean
  reminder_email: string | null
  default_reminder_minutes: number
  created_at: string
  updated_at: string
}

export type GradingSettings = {
  user_id: string
  scale_min: number
  scale_max: number
  passing_score: number
  rounding_decimals: number
  configured_at: string | null
  created_at: string
  updated_at: string
}

type TableDefinition<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<
        Profile,
        {
          id: string
          username: string
          full_name?: string | null
          avatar_path?: string | null
          timezone?: string
          locale?: string
          onboarded_at?: string | null
          terms_accepted_at?: string | null
          privacy_accepted_at?: string | null
          age_confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          username?: string
          full_name?: string | null
          avatar_path?: string | null
          timezone?: string
          locale?: string
          onboarded_at?: string | null
          terms_accepted_at?: string | null
          privacy_accepted_at?: string | null
          age_confirmed_at?: string | null
          updated_at?: string
        }
      >
      academic_years: TableDefinition<
        AcademicYear,
        {
          id?: string
          user_id: string
          name: string
          starts_on: string
          ends_on: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        },
        {
          name?: string
          starts_on?: string
          ends_on?: string
          is_active?: boolean
          updated_at?: string
        }
      >
      subjects: TableDefinition<
        Subject,
        {
          id?: string
          user_id: string
          academic_year_id: string
          name: string
          description?: string | null
          color_hex: string
          teacher_names?: string[]
          notes?: string | null
          evaluation_criteria?: string | null
          methodology?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          name?: string
          description?: string | null
          color_hex?: string
          teacher_names?: string[]
          notes?: string | null
          evaluation_criteria?: string | null
          methodology?: string | null
          updated_at?: string
        }
      >
      user_settings: TableDefinition<
        UserSettings,
        {
          user_id: string
          week_starts_on?: number
          theme?: 'dark' | 'light' | 'system'
          email_reminders_enabled?: boolean
          reminder_email?: string | null
          default_reminder_minutes?: number
          created_at?: string
          updated_at?: string
        },
        {
          week_starts_on?: number
          theme?: 'dark' | 'light' | 'system'
          email_reminders_enabled?: boolean
          reminder_email?: string | null
          default_reminder_minutes?: number
          updated_at?: string
        }
      >
      grading_settings: TableDefinition<
        GradingSettings,
        {
          user_id: string
          scale_min?: number
          scale_max?: number
          passing_score?: number
          rounding_decimals?: number
          configured_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          scale_min?: number
          scale_max?: number
          passing_score?: number
          rounding_decimals?: number
          configured_at?: string | null
          updated_at?: string
        }
      >
    }
    Views: Record<string, never>
    Functions: {
      activate_academic_year: {
        Args: { p_year_id: string }
        Returns: undefined
      }
      delete_current_user: {
        Args: Record<string, never>
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
