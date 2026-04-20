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
      customers: {
        Row: {
          created_at: string
          free_credits: number
          id: string
          interests: string[]
          name: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          free_credits?: number
          id?: string
          interests?: string[]
          name?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          free_credits?: number
          id?: string
          interests?: string[]
          name?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      generated_itineraries: {
        Row: {
          created_at: string
          destination: string | null
          file_name: string
          id: string
          interest_categories: string[]
          interest_focus: string | null
          pdf_url: string
          phone: string | null
          text_length: number
          title: string | null
          traveler_name: string | null
        }
        Insert: {
          created_at?: string
          destination?: string | null
          file_name: string
          id?: string
          interest_categories?: string[]
          interest_focus?: string | null
          pdf_url: string
          phone?: string | null
          text_length?: number
          title?: string | null
          traveler_name?: string | null
        }
        Update: {
          created_at?: string
          destination?: string | null
          file_name?: string
          id?: string
          interest_categories?: string[]
          interest_focus?: string | null
          pdf_url?: string
          phone?: string | null
          text_length?: number
          title?: string | null
          traveler_name?: string | null
        }
        Relationships: []
      }
      mural_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          mural_id: string
          narrative_text: string | null
          order_index: number
          photo_url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          mural_id: string
          narrative_text?: string | null
          order_index?: number
          photo_url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          mural_id?: string
          narrative_text?: string | null
          order_index?: number
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "mural_photos_mural_id_fkey"
            columns: ["mural_id"]
            isOneToOne: false
            referencedRelation: "photo_murals"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_murals: {
        Row: {
          cover_photo_url: string | null
          created_at: string
          description: string | null
          id: string
          pdf_url: string | null
          phone: string
          share_code: string
          title: string | null
        }
        Insert: {
          cover_photo_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          pdf_url?: string | null
          phone: string
          share_code: string
          title?: string | null
        }
        Update: {
          cover_photo_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          pdf_url?: string | null
          phone?: string
          share_code?: string
          title?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
