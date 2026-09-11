import { supabase } from "@/integrations/supabase/client";
import type {
  AdminActivityEntry,
  AdminAuditEntry,
  AdminBusinessDetail,
  AdminBusinessList,
  AdminMetrics,
  AdminSupportIssue,
} from "@/types/admin";

/**
 * Every call below is a database function that verifies the signed-in user is an
 * authorised SokoFlow administrator. Authorisation is enforced server-side; the
 * client can never widen its own access.
 */
export const adminService = {
  /** True only when the signed-in user appears in the admin list (RLS protected). */
  async isAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  },

  async metrics(): Promise<AdminMetrics> {
    const { data, error } = await supabase.rpc("admin_platform_metrics");
    if (error) throw error;
    return data as unknown as AdminMetrics;
  },

  async listBusinesses(params: {
    search?: string;
    status?: string;
    onboarding?: string;
    health?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  }): Promise<AdminBusinessList> {
    const { data, error } = await supabase.rpc("admin_list_businesses", {
      ...(params.search ? { p_search: params.search } : {}),
      p_status: params.status ?? "all",
      p_onboarding: params.onboarding ?? "all",
      p_health: params.health ?? "all",
      p_sort: params.sort ?? "last_active",
      p_limit: params.limit ?? 25,
      p_offset: params.offset ?? 0,
    });
    if (error) throw error;
    return data as unknown as AdminBusinessList;
  },

  async businessDetail(userId: string): Promise<AdminBusinessDetail> {
    const { data, error } = await supabase.rpc("admin_business_detail", {
      p_user_id: userId,
    });
    if (error) throw error;
    return data as unknown as AdminBusinessDetail;
  },

  async updateAccountStatus(userId: string, status: string) {
    const { error } = await supabase.rpc("admin_update_account_status", {
      p_user_id: userId,
      p_status: status,
    });
    if (error) throw error;
  },

  async createIssue(input: {
    userId: string;
    title: string;
    category: string;
    description?: string;
    internalNote?: string;
  }) {
    const { error } = await supabase.rpc("admin_create_support_issue", {
      p_user_id: input.userId,
      p_title: input.title,
      p_category: input.category,
      p_description: input.description ?? "",
      ...(input.internalNote ? { p_internal_note: input.internalNote } : {}),
    });
    if (error) throw error;
  },

  async updateIssue(issueId: string, status?: string, internalNote?: string) {
    const { error } = await supabase.rpc("admin_update_support_issue", {
      p_issue_id: issueId,
      ...(status ? { p_status: status } : {}),
      ...(internalNote ? { p_internal_note: internalNote } : {}),
    });
    if (error) throw error;
  },

  async listIssues(status?: string): Promise<AdminSupportIssue[]> {
    const { data, error } = await supabase.rpc("admin_list_support_issues", {
      p_status: status ?? "all",
      p_limit: 100,
    });
    if (error) throw error;
    return (data ?? []) as unknown as AdminSupportIssue[];
  },

  async auditLog(): Promise<AdminAuditEntry[]> {
    const { data, error } = await supabase.rpc("admin_list_audit_log", { p_limit: 150 });
    if (error) throw error;
    return (data ?? []) as unknown as AdminAuditEntry[];
  },

  async platformActivity(): Promise<AdminActivityEntry[]> {
    const { data, error } = await supabase.rpc("admin_platform_activity", { p_limit: 80 });
    if (error) throw error;
    return (data ?? []) as unknown as AdminActivityEntry[];
  },

  async logView(userId: string) {
    const { error } = await supabase.rpc("admin_log_action", {
      _action: "ADMIN_VIEWED_BUSINESS",
      _target: userId,
      _metadata: {},
    });
    if (error) console.error(error);
  },
};
