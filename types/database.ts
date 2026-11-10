/**
 * Database types for the Supabase client, matching supabase/schema.sql.
 *
 * Same shape `supabase gen types typescript` produces, so it can be swapped for
 * the generated file at any time:
 *   pnpm dlx supabase gen types typescript --project-id <id> > types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          group_id: string;
          name: string;
          share_token: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          name: string;
          share_token: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          name?: string;
          share_token?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          group_id: string;
          amount: number;
          paid_by: string;
          split_type: "equal" | "exact" | "percentage";
          note: string | null;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          amount: number;
          paid_by: string;
          split_type?: "equal" | "exact" | "percentage";
          note?: string | null;
          date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          amount?: number;
          paid_by?: string;
          split_type?: "equal" | "exact" | "percentage";
          note?: string | null;
          date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_paid_by_fkey";
            columns: ["paid_by"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_splits: {
        Row: {
          id: string;
          expense_id: string;
          member_id: string;
          amount_owed: number;
          percent_bp: number | null;
        };
        Insert: {
          id?: string;
          expense_id: string;
          member_id: string;
          amount_owed: number;
          percent_bp?: number | null;
        };
        Update: {
          id?: string;
          expense_id?: string;
          member_id?: string;
          amount_owed?: number;
          percent_bp?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "expense_splits_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_splits_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_group: {
        Args: { p_name: string; p_members: Json };
        Returns: string;
      };
      save_expense: {
        Args: {
          p_expense_id: string | null;
          p_group_id: string;
          p_amount: number;
          p_paid_by: string;
          p_split_type: string;
          p_note: string | null;
          p_date: string;
          p_splits: Json;
        };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
