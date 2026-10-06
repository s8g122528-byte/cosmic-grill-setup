# Menu reference update
- [x] Add an admin-only animated dot-grid background and refine dish motion with reduced-motion guards; build reports OK.
- [ ] Verify the authenticated admin background and dish interactions visually. Blocked: external staff session unavailable; live admin redirects to sign-in.
- [x] Refresh cart layout, reference-style payment selector, compact OTP and verified phone lock. Verified real menu-to-cart navigation and all payment choices; mocked OTP send/verify tests pass. No real OTP or order was sent.
- [x] Generate five transparent, consistently sized menu food images.
- [x] Apply images only within the menu and add reduced-motion-safe image animation.
- [x] Verify all five transparent images load across 15 matching dishes; 22 cards, filtering and cart confirmation work without page errors.
- [x] Match supplied Foodio menu-one colors, typography, card geometry and responsive breakpoints.
- [x] Replace category pills with reference-themed category navigation; preserve filtering and cart behavior.
- [x] Verify live menu: 22 real dishes, category selection returns 4 dishes, cart confirmation appears, no page errors. Desktop screenshot confirmed. Narrow-screen card measurement confirmed at 390px; phone screenshot capture did not reliably settle. Some existing backend dish images are missing or repeated; left unchanged.
- [x] Recolor the menu to the hero biscuit palette: section cream, cards cream-deep, charcoal titles, flame price/capsule, gold cart button and heading underline, ember stars. Verified computed colors match the hero tokens and checked desktop plus 390px screenshots.

# Takiii guest chat refresh
- [x] Remove the hero menu shortcut buttons and leave that area open.
- [x] Restyle the floating Takiii launcher and chat panel in the storefront flame, cream, and charcoal theme.
- [x] Remove the login gate and provide one guest chat saved in this browser.
- [x] Add a microphone control as presentation-only UI without changing AI services.

# Homepage offer and menu-book UX
- [x] Replace cluttered offer copy with clear Crazy Deal and Today's Bonus ribbons.
- [x] Keep the existing menu-book concept while adding caddy guidance and systematic navigation.
- [x] Verify the full interaction and layout on desktop and phone; cover, next/previous progression, caddy status, and dish spread render without page errors.
- [x] Move the deal ribbons to sit directly after the hero and before the menu, with the two ribbons separated so no text is clipped.

# Storefront checkout and access UX
- [x] Replace the menu's horizontal category slider with a clear wrapping filter control and align the heading color with the storefront.
- [x] Give the Takiii launcher a more distinctive flame-themed animated treatment without changing its guest-only chat behavior.
- [x] Reorganize the cart into a guided caddy checkout with cleaner item, fulfillment, verification, payment, and summary states.
- [x] Place OTP entry beside its phone field, use six animated code cells, and lock verified numbers clearly.
- [x] Add obvious Home, Sign in, and Create account navigation across access screens.
- [x] Verify menu filtering, Takiii, cart verification states, payment selection, and access navigation on desktop and phone.