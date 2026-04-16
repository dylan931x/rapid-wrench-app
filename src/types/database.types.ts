export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          business_name: string;
          owner_name: string | null;
          phone: string | null;
          email: string | null;
          service_area: string | null;
          booking_slug: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          business_name?: string;
          owner_name?: string | null;
          phone?: string | null;
          email?: string | null;
          service_area?: string | null;
          booking_slug?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string;
          owner_name?: string | null;
          phone?: string | null;
          email?: string | null;
          service_area?: string | null;
          booking_slug?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_settings: {
        Row: {
          id: string;
          user_id: string;
          default_warranty_text: string;
          default_policy_text: string;
          invoice_footer_text: string | null;
          require_deposit: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          default_warranty_text?: string;
          default_policy_text: string;
          invoice_footer_text?: string | null;
          require_deposit?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          default_warranty_text?: string;
          default_policy_text?: string;
          invoice_footer_text?: string | null;
          require_deposit?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'business_settings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          phone: string;
          email: string | null;
          area: string | null;
          preferred_contact: 'text' | 'call' | 'email' | 'either';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          phone: string;
          email?: string | null;
          area?: string | null;
          preferred_contact?: 'text' | 'call' | 'email' | 'either';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          phone?: string;
          email?: string | null;
          area?: string | null;
          preferred_contact?: 'text' | 'call' | 'email' | 'either';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'customers_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      vehicles: {
        Row: {
          id: string;
          user_id: string;
          customer_id: string;
          year: number;
          make: string;
          model: string;
          engine: string | null;
          vin: string | null;
          mileage: number | null;
          license_plate: string | null;
          color: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          customer_id: string;
          year: number;
          make: string;
          model: string;
          engine?: string | null;
          vin?: string | null;
          mileage?: number | null;
          license_plate?: string | null;
          color?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          customer_id?: string;
          year?: number;
          make?: string;
          model?: string;
          engine?: string | null;
          vin?: string | null;
          mileage?: number | null;
          license_plate?: string | null;
          color?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicles_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      jobs: {
        Row: {
          id: string;
          user_id: string;
          customer_id: string;
          vehicle_id: string;
          title: string | null;
          complaint: string;
          diagnosis_notes: string | null;
          recommended_tests: string | null;
          repair_performed: string | null;
          status:
            | 'new lead'
            | 'scheduled'
            | 'waiting on deposit'
            | 'waiting on parts'
            | 'in progress'
            | 'completed'
            | 'payment pending';
          labor_amount: number;
          parts_amount: number;
          deposit_amount: number;
          balance_amount: number;
          next_step: string | null;
          warranty_text: string | null;
          scheduled_for: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          customer_id: string;
          vehicle_id: string;
          title?: string | null;
          complaint: string;
          diagnosis_notes?: string | null;
          recommended_tests?: string | null;
          repair_performed?: string | null;
          status?:
            | 'new lead'
            | 'scheduled'
            | 'waiting on deposit'
            | 'waiting on parts'
            | 'in progress'
            | 'completed'
            | 'payment pending';
          labor_amount?: number;
          parts_amount?: number;
          deposit_amount?: number;
          balance_amount?: number;
          next_step?: string | null;
          warranty_text?: string | null;
          scheduled_for?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          customer_id?: string;
          vehicle_id?: string;
          title?: string | null;
          complaint?: string;
          diagnosis_notes?: string | null;
          recommended_tests?: string | null;
          repair_performed?: string | null;
          status?:
            | 'new lead'
            | 'scheduled'
            | 'waiting on deposit'
            | 'waiting on parts'
            | 'in progress'
            | 'completed'
            | 'payment pending';
          labor_amount?: number;
          parts_amount?: number;
          deposit_amount?: number;
          balance_amount?: number;
          next_step?: string | null;
          warranty_text?: string | null;
          scheduled_for?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'jobs_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'jobs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'jobs_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          job_id: string;
          amount: number;
          payment_method: 'cash' | 'card' | 'cashapp' | 'venmo' | 'other';
          note: string | null;
          paid_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          amount: number;
          payment_method?: 'cash' | 'card' | 'cashapp' | 'venmo' | 'other';
          note?: string | null;
          paid_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          job_id?: string;
          amount?: number;
          payment_method?: 'cash' | 'card' | 'cashapp' | 'venmo' | 'other';
          note?: string | null;
          paid_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      job_photos: {
        Row: {
          id: string;
          user_id: string;
          job_id: string;
          storage_path: string;
          file_name: string;
          caption: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          storage_path: string;
          file_name: string;
          caption?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          job_id?: string;
          storage_path?: string;
          file_name?: string;
          caption?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'job_photos_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'job_photos_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          job_id: string;
          document_type: 'invoice' | 'agreement';
          pdf_storage_path: string | null;
          policy_text_snapshot: string;
          warranty_text_snapshot: string | null;
          signer_name: string | null;
          signed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          document_type: 'invoice' | 'agreement';
          pdf_storage_path?: string | null;
          policy_text_snapshot: string;
          warranty_text_snapshot?: string | null;
          signer_name?: string | null;
          signed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          job_id?: string;
          document_type?: 'invoice' | 'agreement';
          pdf_storage_path?: string | null;
          policy_text_snapshot?: string;
          warranty_text_snapshot?: string | null;
          signer_name?: string | null;
          signed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      signatures: {
        Row: {
          id: string;
          user_id: string;
          document_id: string;
          storage_path: string;
          signer_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_id: string;
          storage_path: string;
          signer_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          document_id?: string;
          storage_path?: string;
          signer_name?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'signatures_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: true;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'signatures_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      service_types: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          duration_minutes: number;
          requires_approval: boolean;
          public_booking_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          duration_minutes?: number;
          requires_approval?: boolean;
          public_booking_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          duration_minutes?: number;
          requires_approval?: boolean;
          public_booking_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'service_types_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      availability_rules: {
        Row: {
          id: string;
          user_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_available: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'availability_rules_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      blocked_times: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          start_at: string;
          end_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          start_at: string;
          end_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          start_at?: string;
          end_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'blocked_times_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      appointments: {
        Row: {
          id: string;
          user_id: string;
          customer_id: string | null;
          vehicle_id: string | null;
          service_type_id: string;
          title: string | null;
          notes: string | null;
          status: 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
          source: 'owner' | 'customer';
          start_at: string;
          end_at: string;
          contact_name: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          vehicle_year: number | null;
          vehicle_make: string | null;
          vehicle_model: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          customer_id?: string | null;
          vehicle_id?: string | null;
          service_type_id: string;
          title?: string | null;
          notes?: string | null;
          status?: 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
          source?: 'owner' | 'customer';
          start_at: string;
          end_at: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          vehicle_year?: number | null;
          vehicle_make?: string | null;
          vehicle_model?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          customer_id?: string | null;
          vehicle_id?: string | null;
          service_type_id?: string;
          title?: string | null;
          notes?: string | null;
          status?: 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
          source?: 'owner' | 'customer';
          start_at?: string;
          end_at?: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          vehicle_year?: number | null;
          vehicle_make?: string | null;
          vehicle_model?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'appointments_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'appointments_service_type_id_fkey';
            columns: ['service_type_id'];
            isOneToOne: false;
            referencedRelation: 'service_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'appointments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'appointments_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
        ];
      };

      diagnostic_entries: {
        Row: {
          id: string;
          user_id: string;
          job_id: string;
          symptom: string | null;
          obd_code: string | null;
          likely_causes: Json | null;
          suggested_tests: Json | null;
          tech_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          symptom?: string | null;
          obd_code?: string | null;
          likely_causes?: Json | null;
          suggested_tests?: Json | null;
          tech_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          job_id?: string;
          symptom?: string | null;
          obd_code?: string | null;
          likely_causes?: Json | null;
          suggested_tests?: Json | null;
          tech_notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'diagnostic_entries_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'diagnostic_entries_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      recalculate_job_totals: {
        Args: { p_job_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database['public'];

export type TableName = keyof PublicSchema['Tables'];

export type TableRow<T extends TableName> = PublicSchema['Tables'][T]['Row'];
export type TableInsert<T extends TableName> = PublicSchema['Tables'][T]['Insert'];
export type TableUpdate<T extends TableName> = PublicSchema['Tables'][T]['Update'];
