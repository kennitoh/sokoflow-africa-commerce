-- ============ ADMIN ROLE MECHANISM ============
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin','superadmin')),
  created_at timestamptz not null default now()
);
grant select on public.admin_users to authenticated;
grant all on public.admin_users to service_role;
alter table public.admin_users enable row level security;

create or replace function public.is_platform_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = _user_id)
$$;

revoke all on function public.is_platform_admin(uuid) from public, anon;
grant execute on function public.is_platform_admin(uuid) to authenticated;

-- Admins may read the admin list. No INSERT/UPDATE/DELETE policy exists,
-- so no client (admin or merchant) can grant or revoke admin rights.
create policy "Admins can view admin list"
  on public.admin_users for select to authenticated
  using (public.is_platform_admin(auth.uid()));

create or replace function public.admin_assert()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Unauthorized: authentication required'; end if;
  if not public.is_platform_admin(v_uid) then raise exception 'Forbidden: administrator access required'; end if;
  return v_uid;
end;
$$;
revoke all on function public.admin_assert() from public, anon;
grant execute on function public.admin_assert() to authenticated;

-- ============ CONFIGURABLE SETTINGS ============
create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
grant all on public.admin_settings to service_role;
grant select on public.admin_settings to authenticated;
alter table public.admin_settings enable row level security;
create policy "Admins read settings" on public.admin_settings for select to authenticated
  using (public.is_platform_admin(auth.uid()));

insert into public.admin_settings (key, value) values
  ('health_thresholds', '{"healthy_days": 7, "inactive_days": 14}'::jsonb),
  ('beta', '{"mode": true, "target_businesses": 10}'::jsonb)
on conflict (key) do nothing;

create or replace function public.admin_threshold(_name text, _fallback integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (value ->> _name)::integer from public.admin_settings where key = 'health_thresholds'), _fallback)
$$;
revoke all on function public.admin_threshold(text, integer) from public, anon;

-- ============ BUSINESS ACCOUNTS (beta / future subscription) ============
create table if not exists public.business_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  account_status text not null default 'registered'
    check (account_status in ('invited','registered','onboarding','active','inactive','suspended')),
  -- future-ready, intentionally inert during beta
  plan text not null default 'beta' check (plan in ('beta','basic','pro','enterprise')),
  subscription_status text not null default 'none'
    check (subscription_status in ('none','trialing','active','past_due','cancelled')),
  trial_start date,
  trial_end date,
  billing_status text not null default 'disabled'
    check (billing_status in ('disabled','pending','current','delinquent')),
  invited_at timestamptz,
  first_order_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant all on public.business_accounts to service_role;
grant select on public.business_accounts to authenticated;
alter table public.business_accounts enable row level security;

create policy "Admins read business accounts" on public.business_accounts for select to authenticated
  using (public.is_platform_admin(auth.uid()));
-- Merchants may read their own account record (status only surface); they cannot change it.
create policy "Owners read their account" on public.business_accounts for select to authenticated
  using (auth.uid() = user_id);

create trigger business_accounts_set_updated_at
  before update on public.business_accounts
  for each row execute function public.set_updated_at();

create or replace function public.ensure_business_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_accounts (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger profiles_ensure_business_account
  after insert on public.profiles
  for each row execute function public.ensure_business_account();

insert into public.business_accounts (user_id)
select p.id from public.profiles p
on conflict (user_id) do nothing;

-- ============ SUPPORT ISSUES (internal only) ============
create table if not exists public.admin_support_issues (
  id uuid primary key default gen_random_uuid(),
  business_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'other'
    check (category in ('account','onboarding','orders','inventory','payments','technical','other')),
  description text,
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  internal_note text,
  created_by uuid not null references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists admin_support_issues_business_idx on public.admin_support_issues (business_user_id, created_at desc);
grant all on public.admin_support_issues to service_role;
alter table public.admin_support_issues enable row level security;
-- No grants to authenticated: reachable only through admin SECURITY DEFINER functions.

create trigger admin_support_issues_set_updated_at
  before update on public.admin_support_issues
  for each row execute function public.set_updated_at();

-- ============ ADMIN AUDIT LOG ============
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_user_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
grant all on public.admin_audit_log to service_role;
alter table public.admin_audit_log enable row level security;
-- No grants to authenticated: admin functions only.

create or replace function public.admin_log_action(_action text, _target uuid, _metadata jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_admin uuid := public.admin_assert();
begin
  insert into public.admin_audit_log (admin_user_id, action, target_user_id, metadata)
  values (v_admin, _action, _target, coalesce(_metadata, '{}'::jsonb));
end;
$$;
revoke all on function public.admin_log_action(text, uuid, jsonb) from public, anon;
grant execute on function public.admin_log_action(text, uuid, jsonb) to authenticated;

-- ============ HELPFUL INDEXES FOR AGGREGATION ============
create index if not exists products_user_idx on public.products (user_id);
create index if not exists customers_user_idx on public.customers (user_id);
create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists activity_log_user_created_idx on public.activity_log (user_id, created_at desc);

-- ============ CORE BUSINESS SNAPSHOT ============
create or replace function public.admin_business_rows()
returns table (
  user_id uuid,
  business_name text,
  business_type text,
  owner_name text,
  owner_email text,
  owner_phone text,
  city text,
  country text,
  currency text,
  sales_channels text[],
  description text,
  logo_url text,
  onboarding_completed boolean,
  profile_completion integer,
  account_status text,
  plan text,
  subscription_status text,
  billing_status text,
  created_at timestamptz,
  products bigint,
  customers bigint,
  orders bigint,
  orders_week bigint,
  orders_month bigint,
  order_value numeric,
  outstanding numeric,
  first_order_at timestamptz,
  last_order_at timestamptz,
  last_activity_at timestamptz,
  last_active_at timestamptz,
  first_product_at timestamptz,
  first_customer_at timestamptz,
  first_completed_order_at timestamptz,
  returned_after_first_order boolean,
  health text
)
language sql
stable
security definer
set search_path = public
as $$
  with agg_products as (
    select user_id, count(*) as c, min(created_at) as first_at from public.products group by user_id
  ), agg_customers as (
    select user_id, count(*) as c, min(created_at) as first_at from public.customers group by user_id
  ), agg_orders as (
    select
      user_id,
      count(*) as c,
      count(*) filter (where created_at >= now() - interval '7 days') as c_week,
      count(*) filter (where created_at >= date_trunc('month', now())) as c_month,
      sum(total) filter (where status <> 'cancelled') as value,
      sum(greatest(total - amount_paid, 0)) filter (where status <> 'cancelled' and payment_status <> 'refunded') as outstanding,
      min(created_at) as first_at,
      max(created_at) as last_at,
      min(created_at) filter (where status = 'delivered') as first_completed_at
    from public.orders group by user_id
  ), agg_activity as (
    select user_id, max(created_at) as last_at from public.activity_log group by user_id
  ), base as (
    select
      p.id as user_id,
      p.business_name,
      p.business_type,
      p.full_name as owner_name,
      coalesce(p.email, u.email) as owner_email,
      coalesce(p.phone, p.whatsapp) as owner_phone,
      p.city, p.country, p.currency, p.sales_channels, p.description, p.logo_url,
      p.onboarding_completed,
      (
        (case when coalesce(p.business_name,'') <> '' then 1 else 0 end) +
        (case when coalesce(p.business_type,'') <> '' then 1 else 0 end) +
        (case when coalesce(p.phone, p.whatsapp) is not null then 1 else 0 end) +
        (case when coalesce(p.city,'') <> '' then 1 else 0 end) +
        (case when coalesce(p.country,'') <> '' then 1 else 0 end) +
        (case when coalesce(p.description,'') <> '' then 1 else 0 end) +
        (case when p.logo_url is not null then 1 else 0 end) +
        (case when coalesce(array_length(p.sales_channels, 1), 0) > 0 then 1 else 0 end)
      ) * 100 / 8 as profile_completion,
      coalesce(ba.account_status, 'registered') as account_status,
      coalesce(ba.plan, 'beta') as plan,
      coalesce(ba.subscription_status, 'none') as subscription_status,
      coalesce(ba.billing_status, 'disabled') as billing_status,
      coalesce(u.created_at, p.created_at) as created_at,
      coalesce(pr.c, 0) as products,
      coalesce(cu.c, 0) as customers,
      coalesce(o.c, 0) as orders,
      coalesce(o.c_week, 0) as orders_week,
      coalesce(o.c_month, 0) as orders_month,
      coalesce(o.value, 0) as order_value,
      coalesce(o.outstanding, 0) as outstanding,
      o.first_at as first_order_at,
      o.last_at as last_order_at,
      ac.last_at as last_activity_at,
      greatest(p.updated_at, coalesce(o.last_at, p.updated_at), coalesce(ac.last_at, p.updated_at)) as last_active_at,
      pr.first_at as first_product_at,
      cu.first_at as first_customer_at,
      o.first_completed_at as first_completed_order_at,
      (o.c > 1 or (o.first_at is not null and coalesce(ac.last_at, o.last_at) > o.first_at + interval '1 hour')) as returned_after_first_order
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.business_accounts ba on ba.user_id = p.id
    left join agg_products pr on pr.user_id = p.id
    left join agg_customers cu on cu.user_id = p.id
    left join agg_orders o on o.user_id = p.id
    left join agg_activity ac on ac.user_id = p.id
  )
  select b.*,
    case
      when b.account_status = 'suspended' then 'suspended'
      when b.last_active_at < now() - make_interval(days => public.admin_threshold('inactive_days', 14)) then 'inactive'
      when not b.onboarding_completed then 'onboarding'
      when b.orders = 0 then 'needs_attention'
      when b.last_active_at >= now() - make_interval(days => public.admin_threshold('healthy_days', 7)) then 'healthy'
      else 'needs_attention'
    end as health
  from base b
$$;
revoke all on function public.admin_business_rows() from public, anon, authenticated;

-- ============ ADMIN QUERIES ============
create or replace function public.admin_platform_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  perform public.admin_assert();
  select jsonb_build_object(
    'beta', (select value from public.admin_settings where key = 'beta'),
    'thresholds', (select value from public.admin_settings where key = 'health_thresholds'),
    'businesses', jsonb_build_object(
      'total', count(*),
      'active', count(*) filter (where health = 'healthy'),
      'onboarding', count(*) filter (where health = 'onboarding'),
      'needs_attention', count(*) filter (where health = 'needs_attention'),
      'inactive', count(*) filter (where health = 'inactive'),
      'suspended', count(*) filter (where health = 'suspended'),
      'beta_plan', count(*) filter (where plan = 'beta'),
      'onboarding_completed', count(*) filter (where onboarding_completed),
      'with_first_order', count(*) filter (where orders > 0),
      'without_first_order', count(*) filter (where orders = 0),
      'multiple_orders', count(*) filter (where orders > 1)
    ),
    'usage', jsonb_build_object(
      'products', coalesce(sum(products), 0),
      'customers', coalesce(sum(customers), 0),
      'orders', coalesce(sum(orders), 0),
      'orders_week', coalesce(sum(orders_week), 0),
      'orders_month', coalesce(sum(orders_month), 0),
      'order_value', coalesce(sum(order_value), 0),
      'outstanding', coalesce(sum(outstanding), 0)
    ),
    'rates', jsonb_build_object(
      'onboarding_completion', case when count(*) = 0 then 0
        else round(count(*) filter (where onboarding_completed) * 100.0 / count(*), 1) end,
      'first_order_conversion', case when count(*) = 0 then 0
        else round(count(*) filter (where orders > 0) * 100.0 / count(*), 1) end,
      'first_order_conversion_onboarded', case when count(*) filter (where onboarding_completed) = 0 then 0
        else round(count(*) filter (where onboarding_completed and orders > 0) * 100.0
             / count(*) filter (where onboarding_completed), 1) end,
      'active_percentage', case when count(*) = 0 then 0
        else round(count(*) filter (where health = 'healthy') * 100.0 / count(*), 1) end
    ),
    'retention', jsonb_build_object(
      'day1', count(*) filter (where last_active_at >= now() - interval '24 hours'),
      'day7', count(*) filter (where last_active_at >= now() - interval '7 days'),
      'day30', count(*) filter (where last_active_at >= now() - interval '30 days')
    )
  ) into v_result
  from public.admin_business_rows();
  return v_result;
end;
$$;
revoke all on function public.admin_platform_metrics() from public, anon;
grant execute on function public.admin_platform_metrics() to authenticated;

create or replace function public.admin_list_businesses(
  p_search text default null,
  p_status text default null,
  p_onboarding text default null,
  p_health text default null,
  p_sort text default 'last_active',
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
  v_total bigint;
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  perform public.admin_assert();

  with filtered as (
    select * from public.admin_business_rows() r
    where (v_search is null or (
        coalesce(r.business_name,'') ilike '%' || v_search || '%'
        or coalesce(r.owner_name,'') ilike '%' || v_search || '%'
        or coalesce(r.owner_email,'') ilike '%' || v_search || '%'
        or coalesce(r.owner_phone,'') ilike '%' || v_search || '%'))
      and (coalesce(p_status,'all') = 'all' or r.account_status = p_status)
      and (coalesce(p_onboarding,'all') = 'all'
           or (p_onboarding = 'completed' and r.onboarding_completed)
           or (p_onboarding = 'incomplete' and not r.onboarding_completed))
      and (coalesce(p_health,'all') = 'all' or r.health = p_health)
  ), counted as (
    select count(*) as total from filtered
  ), page as (
    select * from filtered
    order by
      case when p_sort = 'orders' then orders end desc nulls last,
      case when p_sort = 'created' then created_at end desc nulls last,
      case when p_sort = 'name' then lower(coalesce(business_name, owner_email)) end asc nulls last,
      case when p_sort not in ('orders','created','name') then last_active_at end desc nulls last,
      created_at desc
    limit v_limit offset v_offset
  )
  select coalesce(jsonb_agg(to_jsonb(page)), '[]'::jsonb), (select total from counted)
  into v_rows, v_total
  from page;

  return jsonb_build_object('rows', v_rows, 'total', coalesce(v_total, 0),
    'limit', v_limit, 'offset', v_offset);
end;
$$;
revoke all on function public.admin_list_businesses(text, text, text, text, text, integer, integer) from public, anon;
grant execute on function public.admin_list_businesses(text, text, text, text, text, integer, integer) to authenticated;

create or replace function public.admin_business_detail(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_row jsonb; v_issues jsonb; v_activity jsonb;
begin
  perform public.admin_assert();

  select to_jsonb(r) into v_row from public.admin_business_rows() r where r.user_id = p_user_id;
  if v_row is null then raise exception 'Business not found'; end if;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.created_at desc), '[]'::jsonb) into v_issues
  from public.admin_support_issues i where i.business_user_id = p_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'action', a.action, 'entity_type', a.entity_type,
      'message', a.message, 'created_at', a.created_at
    ) order by a.created_at desc), '[]'::jsonb) into v_activity
  from (
    select * from public.activity_log where user_id = p_user_id order by created_at desc limit 20
  ) a;

  return jsonb_build_object('business', v_row, 'issues', v_issues, 'activity', v_activity);
end;
$$;
revoke all on function public.admin_business_detail(uuid) from public, anon;
grant execute on function public.admin_business_detail(uuid) to authenticated;

create or replace function public.admin_update_account_status(p_user_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_admin uuid := public.admin_assert(); v_row public.business_accounts;
begin
  if p_status not in ('invited','registered','onboarding','active','inactive','suspended') then
    raise exception 'Invalid account status';
  end if;

  insert into public.business_accounts (user_id, account_status)
  values (p_user_id, p_status)
  on conflict (user_id) do update set account_status = p_status
  returning * into v_row;

  insert into public.admin_audit_log (admin_user_id, action, target_user_id, metadata)
  values (v_admin, 'ADMIN_UPDATED_ACCOUNT_STATUS', p_user_id, jsonb_build_object('status', p_status));

  return to_jsonb(v_row);
end;
$$;
revoke all on function public.admin_update_account_status(uuid, text) from public, anon;
grant execute on function public.admin_update_account_status(uuid, text) to authenticated;

create or replace function public.admin_create_support_issue(
  p_user_id uuid, p_title text, p_category text, p_description text, p_internal_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_admin uuid := public.admin_assert(); v_row public.admin_support_issues;
begin
  if coalesce(trim(p_title), '') = '' then raise exception 'A title is required'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Business not found';
  end if;

  insert into public.admin_support_issues
    (business_user_id, title, category, description, internal_note, created_by)
  values (p_user_id, trim(p_title), coalesce(nullif(p_category,''), 'other'),
          nullif(p_description,''), nullif(p_internal_note,''), v_admin)
  returning * into v_row;

  insert into public.admin_audit_log (admin_user_id, action, target_user_id, metadata)
  values (v_admin, 'ADMIN_CREATED_SUPPORT_NOTE', p_user_id, jsonb_build_object('issue_id', v_row.id));

  return to_jsonb(v_row);
end;
$$;
revoke all on function public.admin_create_support_issue(uuid, text, text, text, text) from public, anon;
grant execute on function public.admin_create_support_issue(uuid, text, text, text, text) to authenticated;

create or replace function public.admin_update_support_issue(
  p_issue_id uuid, p_status text default null, p_internal_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_admin uuid := public.admin_assert(); v_row public.admin_support_issues;
begin
  if p_status is not null and p_status not in ('open','in_progress','resolved') then
    raise exception 'Invalid issue status';
  end if;

  update public.admin_support_issues
  set status = coalesce(p_status, status),
      internal_note = coalesce(nullif(p_internal_note, ''), internal_note),
      resolved_at = case when coalesce(p_status, status) = 'resolved' then coalesce(resolved_at, now()) else null end
  where id = p_issue_id
  returning * into v_row;

  if v_row.id is null then raise exception 'Support issue not found'; end if;

  insert into public.admin_audit_log (admin_user_id, action, target_user_id, metadata)
  values (v_admin,
    case when coalesce(p_status, v_row.status) = 'resolved' then 'ADMIN_RESOLVED_SUPPORT_ISSUE'
         else 'ADMIN_UPDATED_SUPPORT_ISSUE' end,
    v_row.business_user_id, jsonb_build_object('issue_id', v_row.id, 'status', v_row.status));

  return to_jsonb(v_row);
end;
$$;
revoke all on function public.admin_update_support_issue(uuid, text, text) from public, anon;
grant execute on function public.admin_update_support_issue(uuid, text, text) to authenticated;

create or replace function public.admin_list_support_issues(p_status text default null, p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_rows jsonb;
begin
  perform public.admin_assert();
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb) into v_rows
  from (
    select i.*, p.business_name, p.full_name as owner_name
    from public.admin_support_issues i
    left join public.profiles p on p.id = i.business_user_id
    where coalesce(p_status,'all') = 'all' or i.status = p_status
    order by i.created_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200)
  ) t;
  return v_rows;
end;
$$;
revoke all on function public.admin_list_support_issues(text, integer) from public, anon;
grant execute on function public.admin_list_support_issues(text, integer) to authenticated;

create or replace function public.admin_list_audit_log(p_limit integer default 100)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_rows jsonb;
begin
  perform public.admin_assert();
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb) into v_rows
  from (
    select l.id, l.action, l.target_user_id, l.metadata, l.created_at,
           p.business_name as target_business, ap.full_name as admin_name
    from public.admin_audit_log l
    left join public.profiles p on p.id = l.target_user_id
    left join public.profiles ap on ap.id = l.admin_user_id
    order by l.created_at desc
    limit least(greatest(coalesce(p_limit, 100), 1), 300)
  ) t;
  return v_rows;
end;
$$;
revoke all on function public.admin_list_audit_log(integer) from public, anon;
grant execute on function public.admin_list_audit_log(integer) to authenticated;

create or replace function public.admin_platform_activity(p_limit integer default 60)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_rows jsonb;
begin
  perform public.admin_assert();
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb) into v_rows
  from (
    select a.id, a.action, a.entity_type, a.message, a.created_at,
           a.user_id as business_user_id, p.business_name
    from public.activity_log a
    left join public.profiles p on p.id = a.user_id
    order by a.created_at desc
    limit least(greatest(coalesce(p_limit, 60), 1), 200)
  ) t;
  return v_rows;
end;
$$;
revoke all on function public.admin_platform_activity(integer) from public, anon;
grant execute on function public.admin_platform_activity(integer) to authenticated;