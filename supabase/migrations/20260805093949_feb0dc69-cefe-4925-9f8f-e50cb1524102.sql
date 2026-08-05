-- ENUMS
create type public.order_status as enum ('pending','confirmed','packed','out_for_delivery','delivered','cancelled');
create type public.payment_status as enum ('unpaid','partial','paid','refunded');
create type public.sales_channel as enum ('whatsapp','instagram','facebook','tiktok','walk_in','website','marketplace','api');
create type public.product_status as enum ('active','draft','archived');
create type public.stock_reason as enum ('manual','order','restock','return','adjustment');

-- CUSTOMERS
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  phone text,
  whatsapp text,
  instagram text,
  email text,
  address text,
  city text,
  notes text,
  avatar_url text,
  external_id text,
  external_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "Owners manage their customers" on public.customers for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PRODUCTS
create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  sku text,
  category text,
  description text,
  price numeric(12,2) not null default 0,
  cost numeric(12,2),
  stock integer not null default 0,
  low_stock_threshold integer not null default 5,
  image_url text,
  status public.product_status not null default 'active',
  published_to_web boolean not null default false,
  external_id text,
  external_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "Owners manage their products" on public.products for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PRODUCT VARIANTS
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  value text,
  sku text,
  price numeric(12,2),
  stock integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.product_variants to authenticated;
grant all on public.product_variants to service_role;
alter table public.product_variants enable row level security;
create policy "Owners manage their variants" on public.product_variants for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ORDERS
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  order_seq integer not null default 0,
  order_number text not null default '',
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  channel public.sales_channel not null default 'whatsapp',
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  delivery_fee numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  delivery_address text,
  delivery_date date,
  notes text,
  external_id text,
  external_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "Owners manage their orders" on public.orders for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ORDER ITEMS
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_name text,
  unit_price numeric(12,2) not null default 0,
  quantity integer not null default 1,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "Owners manage their order items" on public.order_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- STOCK MOVEMENTS
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  change integer not null,
  reason public.stock_reason not null default 'manual',
  note text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.stock_movements to authenticated;
grant all on public.stock_movements to service_role;
alter table public.stock_movements enable row level security;
create policy "Owners manage their stock movements" on public.stock_movements for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ACTIVITY LOG
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.activity_log to authenticated;
grant all on public.activity_log to service_role;
alter table public.activity_log enable row level security;
create policy "Owners manage their activity" on public.activity_log for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- STORES (future website / storefront architecture, not surfaced in UI yet)
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  slug text unique,
  custom_domain text unique,
  external_website_url text,
  integration_provider text,
  is_published boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.stores to authenticated;
grant all on public.stores to service_role;
alter table public.stores enable row level security;
create policy "Owners manage their stores" on public.stores for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- INDEXES
create index customers_user_idx on public.customers (user_id, created_at desc);
create index products_user_idx on public.products (user_id, created_at desc);
create index variants_product_idx on public.product_variants (product_id);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (user_id, status);
create index orders_customer_idx on public.orders (customer_id);
create index order_items_order_idx on public.order_items (order_id);
create index stock_movements_product_idx on public.stock_movements (product_id, created_at desc);
create index activity_user_idx on public.activity_log (user_id, created_at desc);
create unique index orders_user_seq_idx on public.orders (user_id, order_seq);

-- UPDATED AT TRIGGERS
create trigger customers_set_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger stores_set_updated_at before update on public.stores for each row execute function public.set_updated_at();

-- ORDER NUMBER GENERATION
create or replace function public.set_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_seq integer;
begin
  if new.order_seq is null or new.order_seq = 0 then
    select coalesce(max(order_seq), 0) + 1 into next_seq from public.orders where user_id = new.user_id;
    new.order_seq := next_seq;
  end if;
  if new.order_number is null or new.order_number = '' then
    new.order_number := 'SF-' || lpad(new.order_seq::text, 4, '0');
  end if;
  return new;
end;
$$;
create trigger orders_set_order_number before insert on public.orders for each row execute function public.set_order_number();