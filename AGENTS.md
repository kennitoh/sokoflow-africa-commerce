<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Public storefront data is served only through the SECURITY DEFINER `public_storefront(slug)` RPC and the `storefront_image_visible` storage policy; never add anon SELECT policies on stores/profiles/products, because those tables hold private owner data (cost, contacts).
- Guest checkout goes only through the SECURITY DEFINER public_checkout RPC (owner resolved from slug, DB prices, idempotency key per owner); confirmation via unguessable orders.public_token. Never grant anon create_order/cancel_order — keeps owner RPCs private.

- Guest checkout runs only through the server, which calls guarded_checkout (service role only) to apply abuse limits before public_checkout; never re-grant anon execute on either — keeps limits unbypassable.
- Required scheduled jobs are registered idempotently in project migrations so database rebuilds restore them.
