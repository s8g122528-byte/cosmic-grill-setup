# Storefront and checkout UX refresh

## What will change
- Replace the menu's sideways category strip with a tidy wrapping filter selector that remains fully visible on phones. Recolor “Our Menu” and its accent to the existing flame-red, cream, and charcoal theme.
- Restyle the Takiii launcher as a compact magical food-caddy control using the current theme, with restrained glow, spark, and listening cues. Guest chat, saved conversation, and UI-only microphone behavior remain unchanged.
- Rebuild `/cart` as a guided caddy checkout: clear progress, compact cart rows, fulfillment choice, customer/delivery details, verification, payment, and order summary in a predictable sequence.
- Keep phone verification directly attached to the phone field. After sending, show six separate animated OTP cells; after success, show a locked verified-number state and prevent editing.
- Turn payment methods into clear selectable options with icons, active checkmarks, and short transitions.
- Add an obvious back-to-home control at the top of sign-in and registration, while keeping direct Sign in / Create account links available.
- Apply the same six-cell OTP interaction to phone sign-in so checkout and login feel consistent.

## Interaction and accessibility
- Preserve all existing API calls, cart behavior, pricing, branches, coupons, order placement, login, and registration logic.
- Keep keyboard input, paste, autofill, focus movement, visible errors, loading states, and reduced-motion support working for OTP and payment controls.
- Use the existing storefront colors and type, with no new unrelated theme.

## Verification
- Test menu filtering and Takiii opening/sending.
- Test cart layout with representative items, OTP send/entry/verified presentation where safely reachable, and payment switching.
- Test Home ↔ Sign in ↔ Create account navigation.
- Check desktop and phone layouts, then confirm a clean build and no page errors.