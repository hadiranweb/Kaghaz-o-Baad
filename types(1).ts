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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          author_id: string | null
          categories: string[] | null
          coauthors: Json | null
          cover_url: string | null
          created_at: string
          id: string
          published_at: string | null
          slug: string
          status: string
          summary_en: string | null
          summary_fa: string | null
          tags: string[] | null
          title_en: string
          title_fa: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          categories?: string[] | null
          coauthors?: Json | null
          cover_url?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          summary_en?: string | null
          summary_fa?: string | null
          tags?: string[] | null
          title_en: string
          title_fa: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          categories?: string[] | null
          coauthors?: Json | null
          cover_url?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          summary_en?: string | null
          summary_fa?: string | null
          tags?: string[] | null
          title_en?: string
          title_fa?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          article_id: string
          body: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          body: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          body?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_participants: {
        Row: {
          id: string
          joined_at: string
          left_at: string | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          session_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          article_id: string | null
          created_at: string
          description_en: string | null
          description_fa: string | null
          ended_at: string | null
          host_user_id: string
          id: string
          max_participants: number
          recording_enabled: boolean
          recording_url: string | null
          room_name: string
          scheduled_at: string | null
          started_at: string | null
          status: string
          title_en: string
          title_fa: string
          updated_at: string
        }
        Insert: {
          article_id?: string | null
          created_at?: string
          description_en?: string | null
          description_fa?: string | null
          ended_at?: string | null
          host_user_id: string
          id?: string
          max_participants?: number
          recording_enabled?: boolean
          recording_url?: string | null
          room_name: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          title_en: string
          title_fa: string
          updated_at?: string
        }
        Update: {
          article_id?: string | null
          created_at?: string
          description_en?: string | null
          description_fa?: string | null
          ended_at?: string | null
          host_user_id?: string
          id?: string
          max_participants?: number
          recording_enabled?: boolean
          recording_url?: string | null
          room_name?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          title_en?: string
          title_fa?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          created_at: string
          created_by: string | null
          folders: string[] | null
          id: string
          meta: Json | null
          provider: string | null
          src_url: string
          tags: string[] | null
          thumb_url: string | null
          title_en: string
          title_fa: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          folders?: string[] | null
          id?: string
          meta?: Json | null
          provider?: string | null
          src_url: string
          tags?: string[] | null
          thumb_url?: string | null
          title_en: string
          title_fa: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          folders?: string[] | null
          id?: string
          meta?: Json | null
          provider?: string | null
          src_url?: string
          tags?: string[] | null
          thumb_url?: string | null
          title_en?: string
          title_fa?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          identifier: string
          type: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          identifier: string
          type: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          identifier?: string
          type?: string
          verified?: boolean
        }
        Relationships: []
      }
      persons: {
        Row: {
          avatar_url: string | null
          bio_en: string | null
          bio_fa: string | null
          created_at: string
          id: string
          links: Json | null
          name_en: string
          name_fa: string
          order_num: number | null
          relation: string
          role_title_en: string | null
          role_title_fa: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio_en?: string | null
          bio_fa?: string | null
          created_at?: string
          id?: string
          links?: Json | null
          name_en: string
          name_fa: string
          order_num?: number | null
          relation: string
          role_title_en?: string | null
          role_title_fa?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio_en?: string | null
          bio_fa?: string | null
          created_at?: string
          id?: string
          links?: Json | null
          name_en?: string
          name_fa?: string
          order_num?: number | null
          relation?: string
          role_title_en?: string | null
          role_title_fa?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio_en: string | null
          bio_fa: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          must_change_password: boolean
          phone: string
          socials: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio_en?: string | null
          bio_fa?: string | null
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          must_change_password?: boolean
          phone: string
          socials?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio_en?: string | null
          bio_fa?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          must_change_password?: boolean
          phone?: string
          socials?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      project_description: {
        Row: {
          body_en: string
          body_fa: string
          created_at: string
          id: string
          order_num: number
          section_key: string
          title_en: string
          title_fa: string
          updated_at: string
        }
        Insert: {
          body_en?: string
          body_fa?: string
          created_at?: string
          id?: string
          order_num?: number
          section_key: string
          title_en: string
          title_fa: string
          updated_at?: string
        }
        Update: {
          body_en?: string
          body_fa?: string
          created_at?: string
          id?: string
          order_num?: number
          section_key?: string
          title_en?: string
          title_fa?: string
          updated_at?: string
        }
        Relationships: []
      }
      slides: {
        Row: {
          article_id: string | null
          body_en: string | null
          body_fa: string | null
          created_at: string
          id: string
          media_urls: string[] | null
          notes: string | null
          order_num: number
          title_en: string | null
          title_fa: string | null
        }
        Insert: {
          article_id?: string | null
          body_en?: string | null
          body_fa?: string | null
          created_at?: string
          id?: string
          media_urls?: string[] | null
          notes?: string | null
          order_num: number
          title_en?: string | null
          title_fa?: string | null
        }
        Update: {
          article_id?: string | null
          body_en?: string | null
          body_fa?: string | null
          created_at?: string
          id?: string
          media_urls?: string[] | null
          notes?: string | null
          order_num?: number
          title_en?: string | null
          title_fa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slides_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_links: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          label: string
          order_num: number | null
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          label: string
          order_num?: number | null
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          label?: string
          order_num?: number | null
          url?: string
        }
        Relationships: []
      }
      translations: {
        Row: {
          en: string
          fa: string
          key: string
        }
        Insert: {
          en: string
          fa: string
          key: string
        }
        Update: {
          en?: string
          fa?: string
          key?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio_en: string | null
          bio_fa: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          socials: Json | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio_en?: string | null
          bio_fa?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          socials?: Json | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio_en?: string | null
          bio_fa?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          socials?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      app_role: "admin" | "editor" | "contributor" | "user"
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
      app_role: ["admin", "editor", "contributor", "user"],
    },
  },
} as const
