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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      api_usage: {
        Row: {
          endpoint: string
          id: number
          ip_address: unknown | null
          ts: string
          user_id: string
        }
        Insert: {
          endpoint: string
          id?: number
          ip_address?: unknown | null
          ts?: string
          user_id: string
        }
        Update: {
          endpoint?: string
          id?: number
          ip_address?: unknown | null
          ts?: string
          user_id?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          char_end: number | null
          char_start: number | null
          chunk_index: number
          created_at: string
          document_id: string
          id: string
          metadata: Json | null
          page_no: number | null
          text: string
        }
        Insert: {
          char_end?: number | null
          char_start?: number | null
          chunk_index: number
          created_at?: string
          document_id: string
          id?: string
          metadata?: Json | null
          page_no?: number | null
          text: string
        }
        Update: {
          char_end?: number | null
          char_start?: number | null
          chunk_index?: number
          created_at?: string
          document_id?: string
          id?: string
          metadata?: Json | null
          page_no?: number | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string
          created_at: string
          file_path: string | null
          file_size: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          owner_id: string | null
          source: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          content: string
          created_at?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          owner_id?: string | null
          source: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          owner_id?: string | null
          source?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      embeddings: {
        Row: {
          chunk_id: string
          created_at: string
          document_id: string
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          chunk_id: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: never
          metadata?: Json | null
        }
        Update: {
          chunk_id?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: never
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "document_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embeddings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          endpoint: string | null
          error_code: string
          error_message: string | null
          id: number
          ip_address: unknown | null
          request_id: string | null
          ts: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          endpoint?: string | null
          error_code: string
          error_message?: string | null
          id?: number
          ip_address?: unknown | null
          request_id?: string | null
          ts?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          endpoint?: string | null
          error_code?: string
          error_message?: string | null
          id?: number
          ip_address?: unknown | null
          request_id?: string | null
          ts?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          avg_similarity: number | null
          chunks_retrieved: number | null
          db_latency_ms: number | null
          endpoint: string
          id: number
          latency_ms: number
          llm_latency_ms: number | null
          ts: string | null
          user_id: string | null
        }
        Insert: {
          avg_similarity?: number | null
          chunks_retrieved?: number | null
          db_latency_ms?: number | null
          endpoint: string
          id?: number
          latency_ms: number
          llm_latency_ms?: number | null
          ts?: string | null
          user_id?: string | null
        }
        Update: {
          avg_similarity?: number | null
          chunks_retrieved?: number | null
          db_latency_ms?: number | null
          endpoint?: string
          id?: number
          latency_ms?: number
          llm_latency_ms?: number | null
          ts?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      query_history: {
        Row: {
          answer: string | null
          avg_similarity: number | null
          created_at: string
          documents_retrieved: number | null
          id: string
          query: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          avg_similarity?: number | null
          created_at?: string
          documents_retrieved?: number | null
          id?: string
          query: string
          user_id: string
        }
        Update: {
          answer?: string | null
          avg_similarity?: number | null
          created_at?: string
          documents_retrieved?: number | null
          id?: string
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_queries: {
        Row: {
          created_at: string
          id: string
          query: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          created_at: string
          feedback_text: string
          id: string
          metadata: Json | null
          rating: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_text: string
          id?: string
          metadata?: Json | null
          rating: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_text?: string
          id?: string
          metadata?: Json | null
          rating?: string
          user_id?: string
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
      user_settings: {
        Row: {
          created_at: string
          default_model: string | null
          id: string
          language: string | null
          notifications_enabled: boolean | null
          results_per_page: number | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_model?: string | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          results_per_page?: number | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_model?: string | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          results_per_page?: number | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_cost_summary: {
        Row: {
          day: string | null
          embedding_cost_usd: number | null
          llm_cost_usd: number | null
          total_chunks_retrieved: number | null
          total_cost_usd: number | null
          total_queries: number | null
        }
        Relationships: []
      }
      v_error_summary: {
        Row: {
          affected_users: number | null
          endpoint: string | null
          error_code: string | null
          error_count: number | null
          minute: string | null
          sample_messages: string[] | null
        }
        Relationships: []
      }
      v_perf_summary: {
        Row: {
          avg_chunks: number | null
          avg_latency: number | null
          avg_similarity: number | null
          endpoint: string | null
          minute: string | null
          p50_latency: number | null
          p95_latency: number | null
          p99_latency: number | null
          requests: number | null
        }
        Relationships: []
      }
      v_rate_limit_summary: {
        Row: {
          endpoint: string | null
          max_ip_rpm: number | null
          max_user_rpm: number | null
          minute: string | null
          total_requests: number | null
          unique_ips: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      v_system_health: {
        Row: {
          avg_latency_5min: number | null
          errors_5min: number | null
          requests_1min: number | null
          requests_5min: number | null
          status: string | null
        }
        Relationships: []
      }
      v_user_api_usage: {
        Row: {
          endpoint: string | null
          id: number | null
          ts: string | null
          user_id: string | null
        }
        Insert: {
          endpoint?: string | null
          id?: number | null
          ts?: string | null
          user_id?: string | null
        }
        Update: {
          endpoint?: string | null
          id?: number | null
          ts?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_user_api_usage_safe: {
        Row: {
          endpoint: string | null
          id: number | null
          ts: string | null
          user_id: string | null
        }
        Insert: {
          endpoint?: string | null
          id?: number | null
          ts?: string | null
          user_id?: string | null
        }
        Update: {
          endpoint?: string | null
          id?: number | null
          ts?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_v_cost_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          day: string | null
          embedding_cost_usd: number | null
          llm_cost_usd: number | null
          total_chunks_retrieved: number | null
          total_cost_usd: number | null
          total_queries: number | null
        }[]
      }
      admin_v_error_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          affected_users: number | null
          endpoint: string | null
          error_code: string | null
          error_count: number | null
          minute: string | null
          sample_messages: string[] | null
        }[]
      }
      admin_v_perf_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_chunks: number | null
          avg_latency: number | null
          avg_similarity: number | null
          endpoint: string | null
          minute: string | null
          p50_latency: number | null
          p95_latency: number | null
          p99_latency: number | null
          requests: number | null
        }[]
      }
      admin_v_rate_limit_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          endpoint: string | null
          max_ip_rpm: number | null
          max_user_rpm: number | null
          minute: string | null
          total_requests: number | null
          unique_ips: number | null
          unique_users: number | null
        }[]
      }
      admin_v_system_health: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_latency_5min: number | null
          errors_5min: number | null
          requests_1min: number | null
          requests_5min: number | null
          status: string | null
        }[]
      }
      get_cost_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          day: string
          embedding_cost_usd: number
          llm_cost_usd: number
          total_chunks_retrieved: number
          total_cost_usd: number
          total_queries: number
        }[]
      }
      get_error_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          affected_users: number
          endpoint: string
          error_code: string
          error_count: number
          minute: string
          sample_messages: string[]
        }[]
      }
      get_perf_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_chunks: number
          avg_latency: number
          avg_similarity: number
          endpoint: string
          minute: string
          p50_latency: number
          p95_latency: number
          p99_latency: number
          requests: number
        }[]
      }
      get_rate_limit_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          endpoint: string
          max_ip_rpm: number
          max_user_rpm: number
          minute: string
          total_requests: number
          unique_ips: number
          unique_users: number
        }[]
      }
      get_system_health: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_latency_5min: number
          errors_5min: number
          requests_1min: number
          requests_5min: number
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ingest_document_with_embeddings: {
        Args: { p_chunks: Json; p_document_id: string; p_user_id: string }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      over_limit: {
        Args: { p_limit: number; p_user: string }
        Returns: boolean
      }
      over_limit_by_ip: {
        Args: { p_ip: unknown; p_limit: number }
        Returns: boolean
      }
      search_documents: {
        Args: {
          match_count?: number
          p_user_id?: string
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          chunk_metadata: Json
          chunk_text: string
          doc_source: string
          doc_title: string
          document_id: string
          similarity: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
