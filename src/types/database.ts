// Generated shape of the public schema. Regenerate with `npm run db:types`
// after changing migrations; CI fails if this file drifts from the schema.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          id: number;
          metadata: Json;
          request_id: string | null;
          target_id: string | null;
          target_type: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          metadata?: Json;
          request_id?: string | null;
          target_id?: string | null;
          target_type?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          metadata?: Json;
          request_id?: string | null;
          target_id?: string | null;
          target_type?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          bio: string;
          created_at: string;
          display_name: string;
          handle: string | null;
          id: string;
          status: Database["public"]["Enums"]["profile_status"];
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          bio?: string;
          created_at?: string;
          display_name: string;
          handle?: string | null;
          id: string;
          status?: Database["public"]["Enums"]["profile_status"];
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          bio?: string;
          created_at?: string;
          display_name?: string;
          handle?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["profile_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: { count: number; key: string; window_start: string };
        Insert: { count: number; key: string; window_start: string };
        Update: { count?: number; key?: string; window_start?: string };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          favourite_sports: Database["public"]["Enums"]["sport"][];
          locale: string;
          timezone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          favourite_sports?: Database["public"]["Enums"]["sport"][];
          locale?: string;
          timezone?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          favourite_sports?: Database["public"]["Enums"]["sport"][];
          locale?: string;
          timezone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          assigned_by: string | null;
          created_at: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          assigned_by?: string | null;
          created_at?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          assigned_by?: string | null;
          created_at?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      has_role: {
        Args: { p_role: Database["public"]["Enums"]["app_role"] };
        Returns: boolean;
      };
      rate_limit_hit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: { allowed: boolean; retry_after_seconds: number }[];
      };
    };
    Enums: {
      app_role: "moderator" | "admin";
      profile_status: "active" | "limited" | "suspended" | "deleted";
      sport: "football" | "basketball";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
