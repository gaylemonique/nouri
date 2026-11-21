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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      food_aliases: {
        Row: {
          alias: string
          food_id: string
          id: string
        }
        Insert: {
          alias: string
          food_id: string
          id?: string
        }
        Update: {
          alias?: string
          food_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_aliases_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      food_favorites: {
        Row: {
          created_at: string
          food_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          food_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          food_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_favorites_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      food_log_items: {
        Row: {
          calories: number
          carbohydrates_g: number
          created_at: string
          fat_g: number
          fiber_g: number | null
          food_id: string | null
          food_log_id: string
          food_name_snapshot: string
          food_serving_id: string | null
          id: string
          meal_type: string
          nutrients_per_100g: Json
          protein_g: number
          quantity: number
          serving_name_snapshot: string | null
          serving_weight_grams: number
          sodium_mg: number | null
          sugar_g: number | null
          total_weight_grams: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calories: number
          carbohydrates_g: number
          created_at?: string
          fat_g: number
          fiber_g?: number | null
          food_id?: string | null
          food_log_id: string
          food_name_snapshot: string
          food_serving_id?: string | null
          id: string
          meal_type: string
          nutrients_per_100g: Json
          protein_g: number
          quantity: number
          serving_name_snapshot?: string | null
          serving_weight_grams: number
          sodium_mg?: number | null
          sugar_g?: number | null
          total_weight_grams?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number
          carbohydrates_g?: number
          created_at?: string
          fat_g?: number
          fiber_g?: number | null
          food_id?: string | null
          food_log_id?: string
          food_name_snapshot?: string
          food_serving_id?: string | null
          id?: string
          meal_type?: string
          nutrients_per_100g?: Json
          protein_g?: number
          quantity?: number
          serving_name_snapshot?: string | null
          serving_weight_grams?: number
          sodium_mg?: number | null
          sugar_g?: number | null
          total_weight_grams?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_log_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_log_items_food_log_id_fkey"
            columns: ["food_log_id"]
            isOneToOne: false
            referencedRelation: "food_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_log_items_serving_matches_food"
            columns: ["food_serving_id", "food_id"]
            isOneToOne: false
            referencedRelation: "food_servings"
            referencedColumns: ["id", "food_id"]
          },
        ]
      }
      food_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_servings: {
        Row: {
          food_id: string
          id: string
          is_default: boolean
          serving_name: string
          sort_order: number
          weight_grams: number
        }
        Insert: {
          food_id: string
          id?: string
          is_default?: boolean
          serving_name: string
          sort_order?: number
          weight_grams: number
        }
        Update: {
          food_id?: string
          id?: string
          is_default?: boolean
          serving_name?: string
          sort_order?: number
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "food_servings_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          brand: string | null
          calories_per_100g: number
          carbohydrates_per_100g: number
          category: string
          created_at: string
          description: string | null
          fat_per_100g: number
          fiber_per_100g: number | null
          id: string
          name: string
          protein_per_100g: number
          sodium_mg_per_100g: number | null
          source_name: string
          source_ref: string | null
          sugar_per_100g: number | null
          updated_at: string
          verification_status: string
        }
        Insert: {
          brand?: string | null
          calories_per_100g: number
          carbohydrates_per_100g: number
          category: string
          created_at?: string
          description?: string | null
          fat_per_100g: number
          fiber_per_100g?: number | null
          id?: string
          name: string
          protein_per_100g: number
          sodium_mg_per_100g?: number | null
          source_name: string
          source_ref?: string | null
          sugar_per_100g?: number | null
          updated_at?: string
          verification_status?: string
        }
        Update: {
          brand?: string | null
          calories_per_100g?: number
          carbohydrates_per_100g?: number
          category?: string
          created_at?: string
          description?: string | null
          fat_per_100g?: number
          fiber_per_100g?: number | null
          id?: string
          name?: string
          protein_per_100g?: number
          sodium_mg_per_100g?: number | null
          source_name?: string
          source_ref?: string | null
          sugar_per_100g?: number | null
          updated_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      nutrition_goals: {
        Row: {
          calorie_goal: number
          carbohydrates_goal_g: number | null
          fat_goal_g: number | null
          id: string
          protein_goal_g: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calorie_goal: number
          carbohydrates_goal_g?: number | null
          fat_goal_g?: number | null
          id?: string
          protein_goal_g?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          calorie_goal?: number
          carbohydrates_goal_g?: number | null
          fat_goal_g?: number | null
          id?: string
          protein_goal_g?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          created_at: string
          current_weight_kg: number | null
          date_of_birth: string | null
          dietary_preference: string | null
          display_name: string | null
          height_cm: number | null
          id: string
          onboarding_completed_at: string | null
          tracking_objective: string | null
          updated_at: string
        }
        Insert: {
          activity_level?: string | null
          created_at?: string
          current_weight_kg?: number | null
          date_of_birth?: string | null
          dietary_preference?: string | null
          display_name?: string | null
          height_cm?: number | null
          id: string
          onboarding_completed_at?: string | null
          tracking_objective?: string | null
          updated_at?: string
        }
        Update: {
          activity_level?: string | null
          created_at?: string
          current_weight_kg?: number | null
          date_of_birth?: string | null
          dietary_preference?: string | null
          display_name?: string | null
          height_cm?: number | null
          id?: string
          onboarding_completed_at?: string | null
          tracking_objective?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      daily_nutrition_totals: {
        Args: { p_from: string; p_to: string }
        Returns: {
          calories: number
          carbohydrates_g: number
          fat_g: number
          fiber_g: number
          item_count: number
          log_date: string
          protein_g: number
          sodium_mg: number
          sugar_g: number
        }[]
      }
      delete_food_log_item: { Args: { p_id: string }; Returns: boolean }
      log_food_item: {
        Args: {
          p_food_id: string
          p_id: string
          p_log_date: string
          p_meal_type: string
          p_quantity: number
          p_serving_grams?: number
          p_serving_id?: string
        }
        Returns: {
          calories: number
          carbohydrates_g: number
          created_at: string
          fat_g: number
          fiber_g: number | null
          food_id: string | null
          food_log_id: string
          food_name_snapshot: string
          food_serving_id: string | null
          id: string
          meal_type: string
          nutrients_per_100g: Json
          protein_g: number
          quantity: number
          serving_name_snapshot: string | null
          serving_weight_grams: number
          sodium_mg: number | null
          sugar_g: number | null
          total_weight_grams: number | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "food_log_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      recent_foods: {
        Args: { p_limit?: number }
        Returns: {
          brand: string | null
          calories_per_100g: number
          carbohydrates_per_100g: number
          category: string
          created_at: string
          description: string | null
          fat_per_100g: number
          fiber_per_100g: number | null
          id: string
          name: string
          protein_per_100g: number
          sodium_mg_per_100g: number | null
          source_name: string
          source_ref: string | null
          sugar_per_100g: number | null
          updated_at: string
          verification_status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "foods"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_foods: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          brand: string | null
          calories_per_100g: number
          carbohydrates_per_100g: number
          category: string
          created_at: string
          description: string | null
          fat_per_100g: number
          fiber_per_100g: number | null
          id: string
          name: string
          protein_per_100g: number
          sodium_mg_per_100g: number | null
          source_name: string
          source_ref: string | null
          sugar_per_100g: number | null
          updated_at: string
          verification_status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "foods"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_food_log_item: {
        Args: {
          p_id: string
          p_meal_type?: string
          p_quantity?: number
          p_serving_grams?: number
          p_serving_id?: string
        }
        Returns: {
          calories: number
          carbohydrates_g: number
          created_at: string
          fat_g: number
          fiber_g: number | null
          food_id: string | null
          food_log_id: string
          food_name_snapshot: string
          food_serving_id: string | null
          id: string
          meal_type: string
          nutrients_per_100g: Json
          protein_g: number
          quantity: number
          serving_name_snapshot: string | null
          serving_weight_grams: number
          sodium_mg: number | null
          sugar_g: number | null
          total_weight_grams: number | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "food_log_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
