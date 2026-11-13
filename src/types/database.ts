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
  /** Versión aceptada de cada texto legal (migración 006). Solo la escribe la base. */
  terms_version: string | null
  privacy_version: string | null
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
  /** Si es nulo se usa el correo de la cuenta. El cliente no puede cambiarlo (migración 005). */
  reminder_email: string | null
  default_reminder_minutes: number
  /** Tipos de aviso (migración 005). */
  remind_tasks: boolean
  remind_exams: boolean
  remind_study_sessions: boolean
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

export type TaskKind = 'task' | 'project'
export type TaskStatus = 'pending' | 'waiting' | 'done'
export type StudySessionStatus = 'scheduled' | 'completed' | 'skipped'

export type Task = {
  id: string
  user_id: string
  subject_id: string
  node_id: string | null
  title: string
  description: string | null
  kind: TaskKind
  status: TaskStatus
  color_hex: string | null
  due_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type Exam = {
  id: string
  user_id: string
  subject_id: string
  node_id: string | null
  title: string
  description: string | null
  exam_at: string
  duration_minutes: number | null
  location: string | null
  study_days_before: number | null
  study_frequency_days: number | null
  study_session_minutes: number | null
  /** Hora local preferida para estudiar, como la devuelve PostgreSQL: `HH:mm:ss`. */
  study_time: string | null
  created_at: string
  updated_at: string
}

export type StudySession = {
  id: string
  user_id: string
  exam_id: string
  scheduled_at: string
  duration_minutes: number
  status: StudySessionStatus
  created_at: string
  updated_at: string
}

export type ScheduleEntryType = 'class' | 'break' | 'activity' | 'other'

export type ScheduleEntry = {
  id: string
  user_id: string
  academic_year_id: string
  subject_id: string | null
  title: string
  entry_type: ScheduleEntryType
  /** 1 = lunes … 7 = domingo. */
  weekday: number
  /** Hora local como la devuelve PostgreSQL: `HH:mm:ss`. */
  starts_at: string
  ends_at: string
  location: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Assessment = {
  id: string
  user_id: string
  subject_id: string
  node_id: string | null
  title: string
  /** `null` = evaluación futura o sin corregir. PostgreSQL `numeric` llega como número. */
  score: number | null
  scale_min: number
  scale_max: number
  weight: number
  assessed_on: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Nodo de conocimiento. Se llama así (y no `Node`) para no chocar con el tipo
 * `Node` del DOM. El nodo raíz de cada asignatura es un contenedor: no tiene
 * padre, dificultad ni dominio (D5).
 */
export type KnowledgeNode = {
  id: string
  user_id: string
  subject_id: string
  parent_id: string | null
  is_root: boolean
  name: string
  description: string | null
  summary: string | null
  difficulty: number | null
  mastery: number | null
  position_x: number
  position_y: number
  created_at: string
  updated_at: string
}

export type NodeLink = {
  id: string
  user_id: string
  source_node_id: string
  target_node_id: string
  label: string | null
  created_at: string
}

export type SourceType = 'document' | 'book' | 'link' | 'video' | 'image' | 'audio' | 'other'

export type ReminderKind = 'task_due' | 'exam' | 'study_session' | 'custom'
export type ReminderStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled'

/** Recordatorio por correo (Fase 7). Lo crea la base; el cliente solo lo lee. */
export type Reminder = {
  id: string
  user_id: string
  kind: ReminderKind
  task_id: string | null
  exam_id: string | null
  study_session_id: string | null
  send_at: string
  /** Momento del evento recordado; nulo en los personalizados. */
  event_at: string | null
  recipient: string
  subject: string
  body: string | null
  status: ReminderStatus
  provider_message_id: string | null
  sent_at: string | null
  error_message: string | null
  attempts: number
  locked_until: string | null
  created_at: string
  updated_at: string
}

export type Source = {
  id: string
  user_id: string
  subject_id: string
  node_id: string | null
  task_id: string | null
  title: string
  description: string | null
  source_type: SourceType
  external_url: string | null
  storage_path: string | null
  thumbnail_path: string | null
  tags: string[]
  /** Tamaño del archivo en bytes (migración 004); nulo en los enlaces. */
  size_bytes: number | null
  mime_type: string | null
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
          terms_version?: string | null
          privacy_version?: string | null
          created_at?: string
          updated_at?: string
        },
        // Los consentimientos y las fechas de sistema no son editables desde el
        // cliente: 003_proteger_consentimientos.sql limita el UPDATE por columna.
        {
          username?: string
          full_name?: string | null
          avatar_path?: string | null
          timezone?: string
          locale?: string
          onboarded_at?: string | null
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
        // `reminder_email` y `week_starts_on` no son editables (migración 005).
        {
          theme?: 'dark' | 'light' | 'system'
          email_reminders_enabled?: boolean
          default_reminder_minutes?: number
          remind_tasks?: boolean
          remind_exams?: boolean
          remind_study_sessions?: boolean
        }
      >
      // Solo lectura: se cambian con las funciones de la migración 005.
      reminders: TableDefinition<Reminder, Record<string, never>, Record<string, never>>
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
      tasks: TableDefinition<
        Task,
        {
          id?: string
          user_id: string
          subject_id: string
          node_id?: string | null
          title: string
          description?: string | null
          kind?: TaskKind
          status?: TaskStatus
          color_hex?: string | null
          due_at: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          subject_id?: string
          node_id?: string | null
          title?: string
          description?: string | null
          kind?: TaskKind
          status?: TaskStatus
          color_hex?: string | null
          due_at?: string
          completed_at?: string | null
          updated_at?: string
        }
      >
      exams: TableDefinition<
        Exam,
        {
          id?: string
          user_id: string
          subject_id: string
          node_id?: string | null
          title: string
          description?: string | null
          exam_at: string
          duration_minutes?: number | null
          location?: string | null
          study_days_before?: number | null
          study_frequency_days?: number | null
          study_session_minutes?: number | null
          study_time?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          subject_id?: string
          node_id?: string | null
          title?: string
          description?: string | null
          exam_at?: string
          duration_minutes?: number | null
          location?: string | null
          study_days_before?: number | null
          study_frequency_days?: number | null
          study_session_minutes?: number | null
          study_time?: string | null
          updated_at?: string
        }
      >
      schedule_entries: TableDefinition<
        ScheduleEntry,
        {
          id?: string
          user_id: string
          academic_year_id: string
          subject_id?: string | null
          title: string
          entry_type: ScheduleEntryType
          weekday: number
          starts_at: string
          ends_at: string
          location?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          subject_id?: string | null
          title?: string
          entry_type?: ScheduleEntryType
          weekday?: number
          starts_at?: string
          ends_at?: string
          location?: string | null
          notes?: string | null
          updated_at?: string
        }
      >
      assessments: TableDefinition<
        Assessment,
        {
          id?: string
          user_id: string
          subject_id: string
          node_id?: string | null
          title: string
          score?: number | null
          scale_min: number
          scale_max: number
          weight?: number
          assessed_on?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          subject_id?: string
          node_id?: string | null
          title?: string
          score?: number | null
          weight?: number
          assessed_on?: string | null
          notes?: string | null
          updated_at?: string
        }
      >
      nodes: TableDefinition<
        KnowledgeNode,
        {
          id?: string
          user_id: string
          subject_id: string
          parent_id?: string | null
          is_root?: boolean
          name: string
          description?: string | null
          summary?: string | null
          difficulty?: number | null
          mastery?: number | null
          position_x?: number
          position_y?: number
          created_at?: string
          updated_at?: string
        },
        {
          parent_id?: string | null
          name?: string
          description?: string | null
          summary?: string | null
          difficulty?: number | null
          mastery?: number | null
          position_x?: number
          position_y?: number
          updated_at?: string
        }
      >
      node_links: TableDefinition<
        NodeLink,
        {
          id?: string
          user_id: string
          source_node_id: string
          target_node_id: string
          label?: string | null
          created_at?: string
        },
        { label?: string | null }
      >
      sources: TableDefinition<
        Source,
        {
          id?: string
          user_id: string
          subject_id: string
          node_id?: string | null
          task_id?: string | null
          title: string
          description?: string | null
          source_type: SourceType
          external_url?: string | null
          storage_path?: string | null
          thumbnail_path?: string | null
          tags?: string[]
          size_bytes?: number | null
          mime_type?: string | null
          created_at?: string
          updated_at?: string
        },
        // El archivo, su tamaño y la miniatura no se editan (migración 004).
        {
          subject_id?: string
          node_id?: string | null
          task_id?: string | null
          title?: string
          description?: string | null
          source_type?: SourceType
          external_url?: string | null
          tags?: string[]
          updated_at?: string
        }
      >
      study_sessions: TableDefinition<
        StudySession,
        {
          id?: string
          user_id: string
          exam_id: string
          scheduled_at: string
          duration_minutes: number
          status?: StudySessionStatus
          created_at?: string
          updated_at?: string
        },
        {
          scheduled_at?: string
          duration_minutes?: number
          status?: StudySessionStatus
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
      library_limits: {
        Args: Record<string, never>
        Returns: Array<{ max_bytes: number; max_sources: number }>
      }
      accept_legal_documents: {
        Args: { p_terms_version: string; p_privacy_version: string; p_age_confirmed?: boolean }
        Returns: undefined
      }
      current_legal_versions: {
        Args: Record<string, never>
        Returns: Array<{ terms_version: string; privacy_version: string }>
      }
      cancel_reminder: {
        Args: { p_reminder_id: string }
        Returns: undefined
      }
      restore_reminder: {
        Args: { p_reminder_id: string }
        Returns: undefined
      }
      reschedule_reminder: {
        Args: { p_reminder_id: string; p_send_at: string }
        Returns: undefined
      }
      schedule_test_reminder: {
        Args: Record<string, never>
        Returns: undefined
      }
    }
    Enums: {
      task_kind: TaskKind
      task_status: TaskStatus
      study_session_status: StudySessionStatus
      schedule_entry_type: ScheduleEntryType
      source_type: SourceType
      reminder_kind: ReminderKind
      reminder_status: ReminderStatus
    }
    CompositeTypes: Record<string, never>
  }
}
