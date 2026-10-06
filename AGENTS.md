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

Menu reference styling is scoped under `.foodio-menu` with semantic tokens in the global stylesheet, so other storefront and console sections retain their themes.
Generated menu cutouts are selected by dish name within the menu presentation only; unmatched dishes retain their original images so backend records, detail pages, and cart behavior stay unchanged.
Takiii uses one guest conversation persisted in browser storage; its current chat and microphone interactions remain presentation-only until server integration is requested.
Phone verification uses the shared six-cell OTP component across checkout and phone sign-in so autofill, paste, and visual states stay consistent.
Checkout presentation styles are scoped under checkout-prefixed classes; payment selection reuses existing payment data and verification locks remain visible after session changes so server contracts stay unchanged.

Admin dot-grid decoration is scoped to `.admin-caddy-shell` on the shared console wrapper; rider and storefront backgrounds remain unchanged.
Dish motion uses position-only layout transitions and reduced-motion guards to prevent content scaling and hidden cards.
