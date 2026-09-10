revoke all on function public.ensure_business_account() from public, anon, authenticated;
revoke all on function public.admin_threshold(text, integer) from authenticated;

create policy "Admins read support issues"
  on public.admin_support_issues for select to authenticated
  using (public.is_platform_admin(auth.uid()));

create policy "Admins read audit log"
  on public.admin_audit_log for select to authenticated
  using (public.is_platform_admin(auth.uid()));