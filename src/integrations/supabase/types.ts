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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          message: string
          metadata: Json
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          message: string
          metadata?: Json
          user_id?: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          message?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          metadata: Json
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          metadata?: Json
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      admin_support_issues: {
        Row: {
          business_user_id: string
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          internal_note: string | null
          resolved_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          business_user_id: string
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          internal_note?: string | null
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          business_user_id?: string
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          internal_note?: string | null
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      business_accounts: {
        Row: {
          account_status: string
          billing_status: string
          created_at: string
          first_order_at: string | null
          id: string
          invited_at: string | null
          plan: string
          subscription_status: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          billing_status?: string
          created_at?: string
          first_order_at?: string | null
          id?: string
          invited_at?: string | null
          plan?: string
          subscription_status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          billing_status?: string
          created_at?: string
          first_order_at?: string | null
          id?: string
          invited_at?: string | null
          plan?: string
          subscription_status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          email: string | null
          external_id: string | null
          external_source: string | null
          id: string
          instagram: string | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          instagram?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          instagram?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total: number
          unit_price: number
          user_id: string
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          total?: number
          unit_price?: number
          user_id?: string
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total?: number
          unit_price?: number
          user_id?: string
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_paid: number
          channel: Database["public"]["Enums"]["sales_channel"]
          created_at: string
          customer_id: string | null
          customer_name: string | null
          delivery_address: string | null
          delivery_date: string | null
          delivery_fee: number
          discount: number
          external_id: string | null
          external_source: string | null
          id: string
          notes: string | null
          order_number: string
          order_seq: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          status: Database["public"]["Enums"]["order_status"]
          stock_restored_at: string | null
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          channel?: Database["public"]["Enums"]["sales_channel"]
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          delivery_fee?: number
          discount?: number
          external_id?: string | null
          external_source?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          order_seq?: number
          payment_status?: Database["public"]["Enums"]["payment_status"]
          status?: Database["public"]["Enums"]["order_status"]
          stock_restored_at?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount_paid?: number
          channel?: Database["public"]["Enums"]["sales_channel"]
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          delivery_fee?: number
          discount?: number
          external_id?: string | null
          external_source?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          order_seq?: number
          payment_status?: Database["public"]["Enums"]["payment_status"]
          status?: Database["public"]["Enums"]["order_status"]
          stock_restored_at?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number | null
          product_id: string
          sku: string | null
          stock: number
          updated_at: string
          user_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price?: number | null
          product_id: string
          sku?: string | null
          stock?: number
          updated_at?: string
          user_id?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number | null
          product_id?: string
          sku?: string | null
          stock?: number
          updated_at?: string
          user_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          cost: number | null
          created_at: string
          description: string | null
          external_id: string | null
          external_source: string | null
          id: string
          image_url: string | null
          low_stock_threshold: number
          name: string
          price: number
          published_to_web: boolean
          sku: string | null
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          name: string
          price?: number
          published_to_web?: boolean
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          category?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          name?: string
          price?: number
          published_to_web?: boolean
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          business_name: string | null
          business_type: string | null
          city: string | null
          country: string | null
          created_at: string
          currency: string
          description: string | null
          email: string | null
          facebook_url: string | null
          full_name: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          onboarding_completed: boolean
          phone: string | null
          sales_channels: string[]
          tiktok_url: string | null
          timezone: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          email?: string | null
          facebook_url?: string | null
          full_name?: string | null
          id: string
          instagram_url?: string | null
          logo_url?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          sales_channels?: string[]
          tiktok_url?: string | null
          timezone?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          email?: string | null
          facebook_url?: string | null
          full_name?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          sales_channels?: string[]
          tiktok_url?: string | null
          timezone?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          change: number
          created_at: string
          id: string
          note: string | null
          order_id: string | null
          product_id: string
          reason: Database["public"]["Enums"]["stock_reason"]
          user_id: string
          variant_id: string | null
        }
        Insert: {
          change: number
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string | null
          product_id: string
          reason?: Database["public"]["Enums"]["stock_reason"]
          user_id?: string
          variant_id?: string | null
        }
        Update: {
          change?: number
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string | null
          product_id?: string
          reason?: Database["public"]["Enums"]["stock_reason"]
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          custom_domain: string | null
          external_website_url: string | null
          id: string
          integration_provider: string | null
          is_published: boolean
          name: string
          settings: Json
          slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_domain?: string | null
          external_website_url?: string | null
          id?: string
          integration_provider?: string | null
          is_published?: boolean
          name: string
          settings?: Json
          slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          custom_domain?: string | null
          external_website_url?: string | null
          id?: string
          integration_provider?: string | null
          is_published?: boolean
          name?: string
          settings?: Json
          slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_assert: { Args: never; Returns: string }
      admin_business_detail: { Args: { p_user_id: string }; Returns: Json }
      admin_business_rows: {
        Args: never
        Returns: {
          account_status: string
          billing_status: string
          business_name: string
          business_type: string
          city: string
          country: string
          created_at: string
          currency: string
          customers: number
          description: string
          first_completed_order_at: string
          first_customer_at: string
          first_order_at: string
          first_product_at: string
          health: string
          last_active_at: string
          last_activity_at: string
          last_order_at: string
          logo_url: string
          onboarding_completed: boolean
          order_value: number
          orders: number
          orders_month: number
          orders_week: number
          outstanding: number
          owner_email: string
          owner_name: string
          owner_phone: string
          plan: string
          products: number
          profile_completion: number
          returned_after_first_order: boolean
          sales_channels: string[]
          subscription_status: string
          user_id: string
        }[]
      }
      admin_create_support_issue: {
        Args: {
          p_category: string
          p_description: string
          p_internal_note?: string
          p_title: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_list_audit_log: { Args: { p_limit?: number }; Returns: Json }
      admin_list_businesses: {
        Args: {
          p_health?: string
          p_limit?: number
          p_offset?: number
          p_onboarding?: string
          p_search?: string
          p_sort?: string
          p_status?: string
        }
        Returns: Json
      }
      admin_list_support_issues: {
        Args: { p_limit?: number; p_status?: string }
        Returns: Json
      }
      admin_log_action: {
        Args: { _action: string; _metadata?: Json; _target: string }
        Returns: undefined
      }
      admin_platform_activity: { Args: { p_limit?: number }; Returns: Json }
      admin_platform_metrics: { Args: never; Returns: Json }
      admin_threshold: {
        Args: { _fallback: number; _name: string }
        Returns: number
      }
      admin_update_account_status: {
        Args: { p_status: string; p_user_id: string }
        Returns: Json
      }
      admin_update_support_issue: {
        Args: {
          p_internal_note?: string
          p_issue_id: string
          p_status?: string
        }
        Returns: Json
      }
      cancel_order: {
        Args: { p_order_id: string }
        Returns: {
          amount_paid: number
          channel: Database["public"]["Enums"]["sales_channel"]
          created_at: string
          customer_id: string | null
          customer_name: string | null
          delivery_address: string | null
          delivery_date: string | null
          delivery_fee: number
          discount: number
          external_id: string | null
          external_source: string | null
          id: string
          notes: string | null
          order_number: string
          order_seq: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          status: Database["public"]["Enums"]["order_status"]
          stock_restored_at: string | null
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_order: {
        Args: { p_items: Json; p_order: Json }
        Returns: {
          amount_paid: number
          channel: Database["public"]["Enums"]["sales_channel"]
          created_at: string
          customer_id: string | null
          customer_name: string | null
          delivery_address: string | null
          delivery_date: string | null
          delivery_fee: number
          discount: number
          external_id: string | null
          external_source: string | null
          id: string
          notes: string | null
          order_number: string
          order_seq: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          status: Database["public"]["Enums"]["order_status"]
          stock_restored_at: string | null
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      derive_payment_status: {
        Args: { p_amount_paid: number; p_total: number }
        Returns: Database["public"]["Enums"]["payment_status"]
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      order_status:
        | "pending"
        | "confirmed"
        | "packed"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      payment_status: "unpaid" | "partial" | "paid" | "refunded"
      product_status: "active" | "draft" | "archived"
      sales_channel:
        | "whatsapp"
        | "instagram"
        | "facebook"
        | "tiktok"
        | "walk_in"
        | "website"
        | "marketplace"
        | "api"
      stock_reason:
        | "manual"
        | "order"
        | "restock"
        | "return"
        | "adjustment"
        | "cancellation"
        | "reversal"
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
    Enums: {
      order_status: [
        "pending",
        "confirmed",
        "packed",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      payment_status: ["unpaid", "partial", "paid", "refunded"],
      product_status: ["active", "draft", "archived"],
      sales_channel: [
        "whatsapp",
        "instagram",
        "facebook",
        "tiktok",
        "walk_in",
        "website",
        "marketplace",
        "api",
      ],
      stock_reason: [
        "manual",
        "order",
        "restock",
        "return",
        "adjustment",
        "cancellation",
        "reversal",
      ],
    },
  },
} as const
