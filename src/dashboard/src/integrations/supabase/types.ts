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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          organization_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          organization_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          brand_id: string | null
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          label: string
          last_used_at: string | null
          organization_id: string
          rate_limit: number
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          label: string
          last_used_at?: string | null
          organization_id: string
          rate_limit?: number
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          label?: string
          last_used_at?: string | null
          organization_id?: string
          rate_limit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_verifications: {
        Row: {
          balance: number
          balance_verification_enabled: boolean
          brand_id: string | null
          created_at: string
          device_id: string | null
          id: string
          method: string
          organization_id: string
          smart_verification_enabled: boolean
          type: string
          updated_at: string
        }
        Insert: {
          balance?: number
          balance_verification_enabled?: boolean
          brand_id?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          method?: string
          organization_id: string
          smart_verification_enabled?: boolean
          type?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          balance_verification_enabled?: boolean
          brand_id?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          method?: string
          organization_id?: string
          smart_verification_enabled?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_verifications_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_verifications_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_settings: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_settings_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          is_active: boolean
          is_default: boolean
          logo_url: string | null
          name: string
          organization_id: string
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          logo_url?: string | null
          name: string
          organization_id: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          logo_url?: string | null
          name?: string
          organization_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          exchange_rate: number
          id: string
          is_active: boolean
          name: string
          organization_id: string
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          exchange_rate?: number
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          symbol?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          exchange_rate?: number
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "currencies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: Json | null
          brand_id: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          created_from: string | null
          email: string
          id: string
          metadata: Json | null
          name: string | null
          organization_id: string
          phone: string | null
          postcode: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          brand_id?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          created_from?: string | null
          email: string
          id?: string
          metadata?: Json | null
          name?: string | null
          organization_id: string
          phone?: string | null
          postcode?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          brand_id?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          created_from?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          name?: string | null
          organization_id?: string
          phone?: string | null
          postcode?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          brand_id: string | null
          config: Json | null
          created_at: string
          device_api_level: string | null
          device_brand: string | null
          device_model: string | null
          device_type: string
          device_version: string | null
          id: string
          is_active: boolean
          last_seen_at: string | null
          name: string
          organization_id: string
          otp: string | null
          otp_expires_at: string | null
          phone_number: string | null
          status: string
          updated_at: string
          webhook_key: string | null
        }
        Insert: {
          brand_id?: string | null
          config?: Json | null
          created_at?: string
          device_api_level?: string | null
          device_brand?: string | null
          device_model?: string | null
          device_type?: string
          device_version?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          name: string
          organization_id: string
          otp?: string | null
          otp_expires_at?: string | null
          phone_number?: string | null
          status?: string
          updated_at?: string
          webhook_key?: string | null
        }
        Update: {
          brand_id?: string | null
          config?: Json | null
          created_at?: string
          device_api_level?: string | null
          device_brand?: string | null
          device_model?: string | null
          device_type?: string
          device_version?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          name?: string
          organization_id?: string
          otp?: string | null
          otp_expires_at?: string | null
          phone_number?: string | null
          status?: string
          updated_at?: string
          webhook_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          brand_id: string | null
          created_at: string
          domain: string
          id: string
          is_primary: boolean
          organization_id: string
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          domain: string
          id?: string
          is_primary?: boolean
          organization_id: string
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          domain?: string
          id?: string
          is_primary?: boolean
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "domains_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          brand_id: string | null
          content: string
          created_at: string
          id: string
          is_active: boolean
          order_column: number
          organization_id: string
          title: string
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          order_column?: number
          organization_id: string
          title: string
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          order_column?: number
          organization_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faqs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faqs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gateways: {
        Row: {
          brand_id: string | null
          config: Json | null
          created_at: string
          currency: string
          description: string | null
          display_name: string
          fixed_charge: number
          fixed_discount: number
          gateway_group: string
          gateway_mode: string
          gateway_parameters: Json | null
          gateway_type: Database["public"]["Enums"]["gateway_type"]
          has_qr_code: boolean
          id: string
          image_url: string | null
          is_active: boolean
          max_amount: number
          min_amount: number
          organization_id: string
          percent_charge: number
          percent_discount: number
          qr_code: string | null
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          config?: Json | null
          created_at?: string
          currency?: string
          description?: string | null
          display_name: string
          fixed_charge?: number
          fixed_discount?: number
          gateway_group?: string
          gateway_mode?: string
          gateway_parameters?: Json | null
          gateway_type: Database["public"]["Enums"]["gateway_type"]
          has_qr_code?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_amount?: number
          min_amount?: number
          organization_id: string
          percent_charge?: number
          percent_discount?: number
          qr_code?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          config?: Json | null
          created_at?: string
          currency?: string
          description?: string | null
          display_name?: string
          fixed_charge?: number
          fixed_discount?: number
          gateway_group?: string
          gateway_mode?: string
          gateway_parameters?: Json | null
          gateway_type?: Database["public"]["Enums"]["gateway_type"]
          has_qr_code?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_amount?: number
          min_amount?: number
          organization_id?: string
          percent_charge?: number
          percent_discount?: number
          qr_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gateways_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gateways_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          discount: number
          id: string
          invoice_id: string
          organization_id: string
          quantity: number
          updated_at: string
          vat: number
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string
          discount?: number
          id?: string
          invoice_id: string
          organization_id: string
          quantity?: number
          updated_at?: string
          vat?: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          discount?: number
          id?: string
          invoice_id?: string
          organization_id?: string
          quantity?: number
          updated_at?: string
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          brand_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          due_date: string | null
          id: string
          invoice_number: string
          items: Json
          notes: string | null
          organization_id: string
          paid_at: string | null
          private_notes: string | null
          redirect_url: string | null
          shipping_amount: number | null
          status: Database["public"]["Enums"]["invoice_status"]
          track_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          brand_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          items?: Json
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          private_notes?: string | null
          redirect_url?: string | null
          shipping_amount?: number | null
          status?: Database["public"]["Enums"]["invoice_status"]
          track_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          brand_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          items?: Json
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          private_notes?: string | null
          redirect_url?: string | null
          shipping_amount?: number | null
          status?: Database["public"]["Enums"]["invoice_status"]
          track_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      license_settings: {
        Row: {
          created_at: string
          default_currency: string
          default_expiry_days: number
          id: string
          organization_id: string
          premium_price: number
          regular_price: number
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          default_currency?: string
          default_expiry_days?: number
          id?: string
          organization_id: string
          premium_price?: number
          regular_price?: number
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          default_currency?: string
          default_expiry_days?: number
          id?: string
          organization_id?: string
          premium_price?: number
          regular_price?: number
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "license_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          activated_by_org_id: string | null
          api_domains: string[]
          authorized_domains: string[]
          created_at: string
          customer_email: string
          customer_name: string
          expires_at: string | null
          id: string
          last_synced_at: string | null
          license_key: string
          license_type: Database["public"]["Enums"]["license_type"]
          max_domains: number
          notes: string | null
          organization_id: string
          payment_status: Database["public"]["Enums"]["license_payment_status"]
          price_amount: number
          price_currency: string
          product: string
          status: Database["public"]["Enums"]["license_status"]
          updated_at: string
        }
        Insert: {
          activated_by_org_id?: string | null
          api_domains?: string[]
          authorized_domains?: string[]
          created_at?: string
          customer_email: string
          customer_name: string
          expires_at?: string | null
          id?: string
          last_synced_at?: string | null
          license_key: string
          license_type?: Database["public"]["Enums"]["license_type"]
          max_domains?: number
          notes?: string | null
          organization_id: string
          payment_status?: Database["public"]["Enums"]["license_payment_status"]
          price_amount?: number
          price_currency?: string
          product?: string
          status?: Database["public"]["Enums"]["license_status"]
          updated_at?: string
        }
        Update: {
          activated_by_org_id?: string | null
          api_domains?: string[]
          authorized_domains?: string[]
          created_at?: string
          customer_email?: string
          customer_name?: string
          expires_at?: string | null
          id?: string
          last_synced_at?: string | null
          license_key?: string
          license_type?: Database["public"]["Enums"]["license_type"]
          max_domains?: number
          notes?: string | null
          organization_id?: string
          payment_status?: Database["public"]["Enums"]["license_payment_status"]
          price_amount?: number
          price_currency?: string
          product?: string
          status?: Database["public"]["Enums"]["license_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "licenses_activated_by_org_id_fkey"
            columns: ["activated_by_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mfs_transactions: {
        Row: {
          amount: number
          balance: number
          brand_id: string | null
          created_at: string
          device_id: string | null
          id: string
          note: string | null
          organization_id: string
          payment_method: string
          phone_number: string
          ref: string | null
          status: string
          transaction_id: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          balance?: number
          brand_id?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          note?: string | null
          organization_id: string
          payment_method?: string
          phone_number?: string
          ref?: string | null
          status?: string
          transaction_id?: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          balance?: number
          brand_id?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          note?: string | null
          organization_id?: string
          payment_method?: string
          phone_number?: string
          ref?: string | null
          status?: string
          transaction_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mfs_transactions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mfs_transactions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mfs_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_channels: {
        Row: {
          brand_id: string | null
          channel_type: Database["public"]["Enums"]["notification_channel_type"]
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          channel_type: Database["public"]["Enums"]["notification_channel_type"]
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          channel_type?: Database["public"]["Enums"]["notification_channel_type"]
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_channels_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json
          id: string
          read_at: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orderboxes: {
        Row: {
          brand_id: string | null
          created_at: string
          id: string
          key: string
          label: string
          organization_id: string
          track_id: string
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          id?: string
          key: string
          label: string
          organization_id: string
          track_id: string
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          id?: string
          key?: string
          label?: string
          organization_id?: string
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orderboxes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orderboxes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      payment_links: {
        Row: {
          amount: number
          brand_id: string | null
          branding: Json | null
          created_at: string
          currency: string
          expires_at: string | null
          form_data: Json | null
          id: string
          is_active: boolean
          organization_id: string
          product_description: string | null
          quantity: number | null
          redirect_url: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          brand_id?: string | null
          branding?: Json | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          form_data?: Json | null
          id?: string
          is_active?: boolean
          organization_id: string
          product_description?: string | null
          quantity?: number | null
          redirect_url?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          brand_id?: string | null
          branding?: Json | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          form_data?: Json | null
          id?: string
          is_active?: boolean
          organization_id?: string
          product_description?: string | null
          quantity?: number | null
          redirect_url?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          id: string
          organization_id: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          status: Database["public"]["Enums"]["refund_status"]
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          organization_id: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          organization_id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_data: {
        Row: {
          amount: number | null
          brand_id: string | null
          created_at: string
          device_id: string | null
          id: string
          message: string
          organization_id: string
          parsed_at: string | null
          provider: string | null
          sender: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount?: number | null
          brand_id?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          message: string
          organization_id: string
          parsed_at?: string | null
          provider?: string | null
          sender: string
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number | null
          brand_id?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          message?: string
          organization_id?: string
          parsed_at?: string | null
          provider?: string | null
          sender?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_data_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_data_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      theme_settings: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          name: string
          organization_id: string
          theme: string
          updated_at: string
          value: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
          theme?: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          theme?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "theme_settings_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theme_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_id: string | null
          gateway_id: string | null
          id: string
          metadata: Json | null
          organization_id: string
          payment_link_id: string | null
          reference: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          gateway_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          payment_link_id?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          gateway_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          payment_link_id?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_link_id_fkey"
            columns: ["payment_link_id"]
            isOneToOne: false
            referencedRelation: "payment_links"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          attempt: number
          created_at: string
          event_type: string
          id: string
          next_retry_at: string | null
          organization_id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          url: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          event_type: string
          id?: string
          next_retry_at?: string | null
          organization_id: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          url: string
        }
        Update: {
          attempt?: number
          created_at?: string
          event_type?: string
          id?: string
          next_retry_at?: string | null
          organization_id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_all_orgs_admin: {
        Args: never
        Returns: {
          created_at: string
          id: string
          logo_url: string
          member_count: number
          name: string
          slug: string
          website: string
        }[]
      }
      get_all_users_admin: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          last_sign_in_at: string
          org_id: string
          org_name: string
          phone: string
          role: string
          user_id: string
        }[]
      }
      get_public_gateways: {
        Args: { org_id: string }
        Returns: {
          brand_id: string
          currency: string
          display_name: string
          fixed_charge: number
          fixed_discount: number
          gateway_group: string
          gateway_type: string
          has_qr_code: boolean
          id: string
          image_url: string
          max_amount: number
          min_amount: number
          percent_charge: number
          percent_discount: number
          qr_code: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "super_admin" | "merchant_admin" | "staff" | "viewer"
      gateway_type:
        | "stripe"
        | "paypal"
        | "bkash"
        | "nagad"
        | "razorpay"
        | "bank_transfer"
        | "crypto"
        | "rocket"
        | "upay"
        | "mcash"
        | "tap"
        | "ipay"
        | "okwallet"
        | "cellfin"
        | "pathaopay"
        | "telecash"
        | "aamarpay"
        | "sslcommerz"
        | "shurjopay"
        | "eps_gateway"
        | "paystation"
        | "binance"
        | "oxapay"
        | "payeer"
        | "payoneer"
        | "wise"
        | "taptapsend"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
      license_payment_status: "pending" | "paid" | "manual" | "free"
      license_status: "active" | "inactive" | "expired" | "revoked"
      license_type: "regular" | "premium"
      notification_channel_type:
        | "email"
        | "telegram"
        | "discord"
        | "slack"
        | "webhook"
      refund_status: "pending" | "approved" | "rejected"
      transaction_status: "pending" | "completed" | "failed" | "refunded"
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
      app_role: ["super_admin", "merchant_admin", "staff", "viewer"],
      gateway_type: [
        "stripe",
        "paypal",
        "bkash",
        "nagad",
        "razorpay",
        "bank_transfer",
        "crypto",
        "rocket",
        "upay",
        "mcash",
        "tap",
        "ipay",
        "okwallet",
        "cellfin",
        "pathaopay",
        "telecash",
        "aamarpay",
        "sslcommerz",
        "shurjopay",
        "eps_gateway",
        "paystation",
        "binance",
        "oxapay",
        "payeer",
        "payoneer",
        "wise",
        "taptapsend",
      ],
      invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
      license_payment_status: ["pending", "paid", "manual", "free"],
      license_status: ["active", "inactive", "expired", "revoked"],
      license_type: ["regular", "premium"],
      notification_channel_type: [
        "email",
        "telegram",
        "discord",
        "slack",
        "webhook",
      ],
      refund_status: ["pending", "approved", "rejected"],
      transaction_status: ["pending", "completed", "failed", "refunded"],
    },
  },
} as const
