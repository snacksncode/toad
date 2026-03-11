export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          name: string
          owner_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string | null
          invited_email: string
          role: 'owner' | 'member'
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id?: string | null
          invited_email: string
          role?: 'owner' | 'member'
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string | null
          invited_email?: string
          role?: 'owner' | 'member'
          created_at?: string
        }
        Relationships: []
      }
      columns: {
        Row: {
          id: string
          project_id: string
          name: string
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          position: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          position?: number
          created_at?: string
        }
        Relationships: []
      }
      issues: {
        Row: {
          id: string
          project_id: string
          column_id: string
          title: string
          description: string
          priority: 'low' | 'medium' | 'high'
          labels: string[]
          assignee_email: string | null
          due_date: string | null
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          column_id: string
          title: string
          description?: string
          priority?: 'low' | 'medium' | 'high'
          labels?: string[]
          assignee_email?: string | null
          due_date?: string | null
          position: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          column_id?: string
          title?: string
          description?: string
          priority?: 'low' | 'medium' | 'high'
          labels?: string[]
          assignee_email?: string | null
          due_date?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectMember = Database['public']['Tables']['project_members']['Row']
export type Column = Database['public']['Tables']['columns']['Row']
export type Issue = Database['public']['Tables']['issues']['Row']

export type IssueInsert = Database['public']['Tables']['issues']['Insert']
export type IssueUpdate = Database['public']['Tables']['issues']['Update']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ColumnInsert = Database['public']['Tables']['columns']['Insert']
