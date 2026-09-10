export type AdminHealth = "healthy" | "needs_attention" | "onboarding" | "inactive" | "suspended";

export type AdminAccountStatus =
  | "invited"
  | "registered"
  | "onboarding"
  | "active"
  | "inactive"
  | "suspended";

export type AdminBusinessRow = {
  user_id: string;
  business_name: string | null;
  business_type: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  city: string | null;
  country: string | null;
  currency: string;
  sales_channels: string[] | null;
  description: string | null;
  logo_url: string | null;
  onboarding_completed: boolean;
  profile_completion: number;
  account_status: AdminAccountStatus;
  plan: string;
  subscription_status: string;
  billing_status: string;
  created_at: string;
  products: number;
  customers: number;
  orders: number;
  orders_week: number;
  orders_month: number;
  order_value: number;
  outstanding: number;
  first_order_at: string | null;
  last_order_at: string | null;
  last_activity_at: string | null;
  last_active_at: string;
  first_product_at: string | null;
  first_customer_at: string | null;
  first_completed_order_at: string | null;
  returned_after_first_order: boolean | null;
  health: AdminHealth;
};

export type AdminMetrics = {
  beta: { mode: boolean; target_businesses: number };
  thresholds: { healthy_days: number; inactive_days: number };
  businesses: {
    total: number;
    active: number;
    onboarding: number;
    needs_attention: number;
    inactive: number;
    suspended: number;
    beta_plan: number;
    onboarding_completed: number;
    with_first_order: number;
    without_first_order: number;
    multiple_orders: number;
  };
  usage: {
    products: number;
    customers: number;
    orders: number;
    orders_week: number;
    orders_month: number;
    order_value: number;
    outstanding: number;
  };
  rates: {
    onboarding_completion: number;
    first_order_conversion: number;
    first_order_conversion_onboarded: number;
    active_percentage: number;
  };
  retention: { day1: number; day7: number; day30: number };
};

export type AdminSupportIssue = {
  id: string;
  business_user_id: string;
  title: string;
  category: string;
  description: string | null;
  status: "open" | "in_progress" | "resolved";
  internal_note: string | null;
  created_by: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  business_name?: string | null;
  owner_name?: string | null;
};

export type AdminActivityEntry = {
  id: string;
  action: string;
  entity_type: string;
  message: string;
  created_at: string;
  business_user_id?: string;
  business_name?: string | null;
};

export type AdminAuditEntry = {
  id: string;
  action: string;
  target_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  target_business: string | null;
  admin_name: string | null;
};

export type AdminBusinessDetail = {
  business: AdminBusinessRow;
  issues: AdminSupportIssue[];
  activity: AdminActivityEntry[];
};

export type AdminBusinessList = {
  rows: AdminBusinessRow[];
  total: number;
  limit: number;
  offset: number;
};

export const ADMIN_HEALTH_LABEL: Record<AdminHealth, string> = {
  healthy: "Healthy",
  needs_attention: "Needs attention",
  onboarding: "Onboarding",
  inactive: "Inactive",
  suspended: "Suspended",
};

export const ADMIN_ACCOUNT_STATUSES: AdminAccountStatus[] = [
  "invited",
  "registered",
  "onboarding",
  "active",
  "inactive",
  "suspended",
];

export const ADMIN_ISSUE_CATEGORIES = [
  "account",
  "onboarding",
  "orders",
  "inventory",
  "payments",
  "technical",
  "other",
] as const;
