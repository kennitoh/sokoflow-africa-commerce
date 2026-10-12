-- Slugs: URL-safe and unique across all businesses
ALTER TABLE public.stores
  ADD CONSTRAINT stores_slug_format CHECK (slug IS NULL OR slug ~ '^[a-z0-9]([a-z0-9-]{1,46}[a-z0-9])$');
CREATE UNIQUE INDEX IF NOT EXISTS stores_slug_unique ON public.stores (slug);
CREATE INDEX IF NOT EXISTS products_public_catalog_idx ON public.products (user_id) WHERE published_to_web AND status = 'active';

-- A published store must have a slug
ALTER TABLE public.stores
  ADD CONSTRAINT stores_published_needs_slug CHECK (NOT is_published OR slug IS NOT NULL);

-- Public read model: returns only approved storefront fields
CREATE OR REPLACE FUNCTION public.public_storefront(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store public.stores%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_contact jsonb;
  v_products jsonb;
BEGIN
  IF p_slug IS NULL OR p_slug !~ '^[a-z0-9]([a-z0-9-]{1,46}[a-z0-9])$' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_store FROM public.stores WHERE slug = p_slug AND is_published LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_store.user_id;
  v_contact := COALESCE(v_store.settings -> 'public_contact', '{}'::jsonb);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', p.id, 'name', p.name, 'description', p.description,
      'category', p.category, 'price', p.price, 'image_url', p.image_url
    ) ORDER BY p.created_at DESC), '[]'::jsonb)
  INTO v_products
  FROM public.products p
  WHERE p.user_id = v_store.user_id AND p.published_to_web AND p.status = 'active';

  RETURN jsonb_build_object(
    'slug', v_store.slug,
    'name', COALESCE(NULLIF(v_profile.business_name, ''), v_store.name),
    'description', v_profile.description,
    'logo_url', v_profile.logo_url,
    'currency', COALESCE(v_profile.currency, 'KES'),
    'whatsapp', CASE WHEN (v_contact ->> 'whatsapp')::boolean THEN v_profile.whatsapp END,
    'phone', CASE WHEN (v_contact ->> 'phone')::boolean THEN v_profile.phone END,
    'email', CASE WHEN (v_contact ->> 'email')::boolean THEN v_profile.email END,
    'city', CASE WHEN (v_contact ->> 'location')::boolean THEN v_profile.city END,
    'country', CASE WHEN (v_contact ->> 'location')::boolean THEN v_profile.country END,
    'instagram_url', CASE WHEN (v_contact ->> 'social')::boolean THEN v_profile.instagram_url END,
    'facebook_url', CASE WHEN (v_contact ->> 'social')::boolean THEN v_profile.facebook_url END,
    'tiktok_url', CASE WHEN (v_contact ->> 'social')::boolean THEN v_profile.tiktok_url END,
    'products', v_products
  );
END;
$$;
REVOKE ALL ON FUNCTION public.public_storefront(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_storefront(text) TO anon, authenticated;

-- Image visibility check used by storage policy (only currently published images)
CREATE OR REPLACE FUNCTION public.storefront_image_visible(p_bucket text, p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_bucket = 'product-images' THEN EXISTS (
      SELECT 1 FROM public.products p JOIN public.stores s ON s.user_id = p.user_id
      WHERE p.image_url = p_name AND p.published_to_web AND p.status = 'active' AND s.is_published)
    WHEN p_bucket = 'business-logos' THEN EXISTS (
      SELECT 1 FROM public.profiles pr JOIN public.stores s ON s.user_id = pr.id
      WHERE pr.logo_url = p_name AND s.is_published)
    ELSE false END
$$;
REVOKE ALL ON FUNCTION public.storefront_image_visible(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storefront_image_visible(text, text) TO anon, authenticated;

CREATE POLICY "Published storefront images are viewable"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id IN ('product-images', 'business-logos') AND public.storefront_image_visible(bucket_id, name));