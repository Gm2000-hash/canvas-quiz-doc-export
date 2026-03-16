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
          id: string
          lesson_date: string | null
          materials: string | null
          notes: string | null
          objectives: string | null
          resources: Json | null
          sort_order: number | null
          title: string
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
          id?: string
          lesson_date?: string | null
          materials?: string | null
          notes?: string | null
          objectives?: string | null
          resources?: Json | null
          sort_order?: number | null
          title: string
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
          id?: string
          lesson_date?: string | null
          materials?: string | null
          notes?: string | null
          objectives?: string | null
          resources?: Json | null
          sort_order?: number | null
          title?: string
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
          page_count: number | null
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
          page_count?: number | null
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
          page_count?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
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
