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
    PostgrestVersion: "14.17"
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
