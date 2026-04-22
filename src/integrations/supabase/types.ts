export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_completions: {
        Row: {
          activity_id: string
          completed_at: string
          id: string
          max_score: number
          score: number
          session_id: string
        }
        Insert: {
          activity_id: string
          completed_at?: string
          id?: string
          max_score?: number
          score: number
          session_id: string
        }
        Update: {
          activity_id?: string
          completed_at?: string
          id?: string
          max_score?: number
          score?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_completions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lti_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_lesson_standards: {
        Row: {
          id: string
          lesson_id: string
          matched_terms: string[]
          ngss_code: string
          ngss_description: string
        }
        Insert: {
          id?: string
          lesson_id: string
          matched_terms?: string[]
          ngss_code: string
          ngss_description: string
        }
        Update: {
          id?: string
          lesson_id?: string
          matched_terms?: string[]
          ngss_code?: string
          ngss_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_lesson_standards_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "curriculum_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_lessons: {
        Row: {
          created_at: string
          explanation: Json
          id: string
          image_url: string | null
          interactive_activities: Json | null
          intro: Json
          key_terms: Json
          objectives: Json
          reading_paragraphs: Json | null
          reading_title: string | null
          sort_order: number
          title: string
          unit_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          explanation?: Json
          id?: string
          image_url?: string | null
          interactive_activities?: Json | null
          intro?: Json
          key_terms?: Json
          objectives?: Json
          reading_paragraphs?: Json | null
          reading_title?: string | null
          sort_order?: number
          title: string
          unit_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          explanation?: Json
          id?: string
          image_url?: string | null
          interactive_activities?: Json | null
          intro?: Json
          key_terms?: Json
          objectives?: Json
          reading_paragraphs?: Json | null
          reading_title?: string | null
          sort_order?: number
          title?: string
          unit_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_lessons_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_quizzes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          question_ids: string[]
          settings: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          question_ids?: string[]
          settings?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          question_ids?: string[]
          settings?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dashboard_layouts: {
        Row: {
          created_at: string
          id: string
          layout_data: Json
          layout_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout_data?: Json
          layout_key?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          layout_data?: Json
          layout_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exam_review_materials: {
        Row: {
          created_at: string
          exam_id: string
          flashcards: Json
          id: string
          review_lesson: Json
          study_guide: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          flashcards?: Json
          id?: string
          review_lesson?: Json
          study_guide?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          flashcards?: Json
          id?: string
          review_lesson?: Json
          study_guide?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_review_materials_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: true
            referencedRelation: "isat_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      h5p_activities: {
        Row: {
          activity_type: string
          content: Json
          created_at: string
          id: string
          title: string
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type: string
          content?: Json
          created_at?: string
          id?: string
          title: string
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          content?: Json
          created_at?: string
          id?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "h5p_activities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      h5p_activity_standards: {
        Row: {
          activity_id: string
          id: string
          matched_terms: string[]
          ngss_code: string
          ngss_description: string
        }
        Insert: {
          activity_id: string
          id?: string
          matched_terms?: string[]
          ngss_code: string
          ngss_description: string
        }
        Update: {
          activity_id?: string
          id?: string
          matched_terms?: string[]
          ngss_code?: string
          ngss_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "h5p_activity_standards_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "h5p_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      isat_exams: {
        Row: {
          answers: Json | null
          completed_at: string | null
          created_at: string
          grade_level: string
          hints_enabled: boolean
          hints_used: number
          id: string
          question_count: number
          questions: Json
          score: number | null
          title: string
          total_points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          grade_level?: string
          hints_enabled?: boolean
          hints_used?: number
          id?: string
          question_count?: number
          questions?: Json
          score?: number | null
          title: string
          total_points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          grade_level?: string
          hints_enabled?: boolean
          hints_used?: number
          id?: string
          question_count?: number
          questions?: Json
          score?: number | null
          title?: string
          total_points?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_plan_standards: {
        Row: {
          id: string
          lesson_plan_id: string
          ngss_code: string
          ngss_description: string
        }
        Insert: {
          id?: string
          lesson_plan_id: string
          ngss_code: string
          ngss_description: string
        }
        Update: {
          id?: string
          lesson_plan_id?: string
          ngss_code?: string
          ngss_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plan_standards_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plans: {
        Row: {
          activities: Json | null
          assessment: string | null
          created_at: string
          differentiation: string | null
          duration_minutes: number | null
          embedded_activities: Json | null
          id: string
          lesson_date: string | null
          materials: string | null
          notes: string | null
          objectives: string | null
          resources: Json | null
          sort_order: number | null
          title: string
          udl_supports: Json
          unit_id: string | null
          updated_at: string
          user_id: string
          vocabulary: Json | null
        }
        Insert: {
          activities?: Json | null
          assessment?: string | null
          created_at?: string
          differentiation?: string | null
          duration_minutes?: number | null
          embedded_activities?: Json | null
          id?: string
          lesson_date?: string | null
          materials?: string | null
          notes?: string | null
          objectives?: string | null
          resources?: Json | null
          sort_order?: number | null
          title: string
          udl_supports?: Json
          unit_id?: string | null
          updated_at?: string
          user_id: string
          vocabulary?: Json | null
        }
        Update: {
          activities?: Json | null
          assessment?: string | null
          created_at?: string
          differentiation?: string | null
          duration_minutes?: number | null
          embedded_activities?: Json | null
          id?: string
          lesson_date?: string | null
          materials?: string | null
          notes?: string | null
          objectives?: string | null
          resources?: Json | null
          sort_order?: number | null
          title?: string
          udl_supports?: Json
          unit_id?: string | null
          updated_at?: string
          user_id?: string
          vocabulary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plans_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      library_books: {
        Row: {
          cover_url: string | null
          created_at: string
          file_path: string
          file_size: number
          id: string
          is_published: boolean
          page_count: number | null
          share_token: string | null
          source_discipline: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          file_path: string
          file_size?: number
          id?: string
          is_published?: boolean
          page_count?: number | null
          share_token?: string | null
          source_discipline?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          file_path?: string
          file_size?: number
          id?: string
          is_published?: boolean
          page_count?: number | null
          share_token?: string | null
          source_discipline?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lti_platforms: {
        Row: {
          auth_login_url: string
          auth_token_url: string
          client_id: string
          created_at: string
          deployment_id: string | null
          id: string
          issuer: string
          jwks_url: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_login_url: string
          auth_token_url: string
          client_id: string
          created_at?: string
          deployment_id?: string | null
          id?: string
          issuer: string
          jwks_url: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_login_url?: string
          auth_token_url?: string
          client_id?: string
          created_at?: string
          deployment_id?: string | null
          id?: string
          issuer?: string
          jwks_url?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lti_sessions: {
        Row: {
          access_token_url: string | null
          activity_id: string
          canvas_user_id: string
          canvas_user_name: string | null
          client_id: string | null
          created_at: string
          expires_at: string
          id: string
          lineitem_url: string | null
          nonce: string | null
          platform_id: string | null
          score_posted: boolean
        }
        Insert: {
          access_token_url?: string | null
          activity_id: string
          canvas_user_id: string
          canvas_user_name?: string | null
          client_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          lineitem_url?: string | null
          nonce?: string | null
          platform_id?: string | null
          score_posted?: boolean
        }
        Update: {
          access_token_url?: string | null
          activity_id?: string
          canvas_user_id?: string
          canvas_user_name?: string | null
          client_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          lineitem_url?: string | null
          nonce?: string | null
          platform_id?: string | null
          score_posted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "lti_sessions_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "lti_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      note_links: {
        Row: {
          created_at: string
          id: string
          source_note_id: string
          target_note_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_note_id: string
          target_note_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_note_id?: string
          target_note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_links_source_note_id_fkey"
            columns: ["source_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_links_target_note_id_fkey"
            columns: ["target_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: Json
          content_text: string
          created_at: string
          icon: string | null
          id: string
          is_public: boolean
          parent_id: string | null
          search_vector: unknown
          share_token: string | null
          sort_order: number
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          content_text?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_public?: boolean
          parent_id?: string | null
          search_vector?: unknown
          share_token?: string | null
          sort_order?: number
          tags?: string[]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          content_text?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_public?: boolean
          parent_id?: string | null
          search_vector?: unknown
          share_token?: string | null
          sort_order?: number
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_preferences: Json
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          email: string
          grade_levels: string[]
          id: string
          phone: string | null
          subjects: string[]
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          ai_preferences?: Json
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          email?: string
          grade_levels?: string[]
          id?: string
          phone?: string | null
          subjects?: string[]
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          ai_preferences?: Json
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          email?: string
          grade_levels?: string[]
          id?: string
          phone?: string | null
          subjects?: string[]
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          answers: Json | null
          blooms_level: string | null
          canvas_question_id: number | null
          created_at: string
          dok_level: number | null
          id: string
          points_possible: number | null
          question_text: string
          question_type: string
          source_course: string | null
          source_quiz: string | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          blooms_level?: string | null
          canvas_question_id?: number | null
          created_at?: string
          dok_level?: number | null
          id?: string
          points_possible?: number | null
          question_text: string
          question_type: string
          source_course?: string | null
          source_quiz?: string | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          blooms_level?: string | null
          canvas_question_id?: number | null
          created_at?: string
          dok_level?: number | null
          id?: string
          points_possible?: number | null
          question_text?: string
          question_type?: string
          source_course?: string | null
          source_quiz?: string | null
          user_id?: string
        }
        Relationships: []
      }
      question_bank_standards: {
        Row: {
          id: string
          ngss_code: string
          ngss_description: string
          question_bank_id: string
        }
        Insert: {
          id?: string
          ngss_code: string
          ngss_description: string
          question_bank_id: string
        }
        Update: {
          id?: string
          ngss_code?: string
          ngss_description?: string
          question_bank_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_standards_question_bank_id_fkey"
            columns: ["question_bank_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_key_terms: {
        Row: {
          created_at: string
          id: string
          key_terms: string[]
          standard_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_terms?: string[]
          standard_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_terms?: string[]
          standard_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      theme_customizations: {
        Row: {
          color: string | null
          created_at: string
          extra: Json
          id: string
          scope_key: string
          scope_type: string
          updated_at: string
          user_id: string
          wallpaper_filters: Json
          wallpaper_path: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          extra?: Json
          id?: string
          scope_key: string
          scope_type: string
          updated_at?: string
          user_id: string
          wallpaper_filters?: Json
          wallpaper_path?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          extra?: Json
          id?: string
          scope_key?: string
          scope_type?: string
          updated_at?: string
          user_id?: string
          wallpaper_filters?: Json
          wallpaper_path?: string | null
        }
        Relationships: []
      }
      units: {
        Row: {
          created_at: string
          date_end: string | null
          date_start: string | null
          description: string | null
          discipline: string | null
          grade_level: string | null
          id: string
          sort_order: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          description?: string | null
          discipline?: string | null
          grade_level?: string | null
          id?: string
          sort_order?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          description?: string | null
          discipline?: string | null
          grade_level?: string | null
          id?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_exam: {
        Args: { _exam_id: string }
        Returns: {
          grade_level: string
          hints_enabled: boolean
          id: string
          question_count: number
          questions: Json
          title: string
        }[]
      }
      get_public_review: {
        Args: { _exam_id: string }
        Returns: {
          exam_id: string
          exam_title: string
          flashcards: Json
          id: string
          review_lesson: Json
          study_guide: Json
        }[]
      }
      get_published_books: {
        Args: never
        Returns: {
          cover_url: string
          created_at: string
          file_path: string
          file_size: number
          id: string
          is_published: boolean
          page_count: number
          source_discipline: string
          title: string
          updated_at: string
        }[]
      }
      get_shared_book: {
        Args: { _share_token: string }
        Returns: {
          file_path: string
          id: string
          source_discipline: string
          title: string
        }[]
      }
      get_shared_note: {
        Args: { _token: string }
        Returns: {
          author_display_name: string
          content: Json
          icon: string
          id: string
          tags: string[]
          title: string
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
