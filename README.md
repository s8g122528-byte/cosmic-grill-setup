# OrderFlow Studio

hii clone this "https://github.com/tayyab402197-cyber/fancy-input-flow" repo and help me to buidl ui  studymy case i frist shougght tio build ita s aprdocut badn then deisgned hte bakenad ui cgrealty buit i have no makeing my producta sss saas product but backend is local and fronteis is online you tell what backed laready have but  not planed at ui  i will give you some conext forgot to rwaily you may remove him compley and lsitem to my instruc   iise  in folder /doc  there are scripts .md wher ai puuzle why railyway dont but you know grealty thati have upgreade my backe dat lcoal i will give you conext understadn adn plan the ui for it in chnks by chunks first comapre what purpose dont or part of ui is no buil or deisgn accoding to u adn then plan and then i will prcesss to tel contnuee to design the upgreadion version of my backend  "Kennedy — Master Frontend Guide for Lovable (Verified Backend Contract)

Ye document sirf verified information use karta hai — live curl tests aur cross-checked reports se. Jahan "UNCONFIRMED" likha hai, wahan defensively code likhna (dono possible field names try karna), kyunki backend abhi khud reconcile kar raha hai.

0. Read First — Corrections from an earlier draft spec

Ek pehla FRONTEND_BUILD_SPEC.md tha jisme kuch endpoints galat the. Ye corrected values hain, inhi ko trust karo:

Rider endpoints: /api/rider/duty-status/, /api/rider/earnings/, /api/rider/profile/, /api/rider/location-share/ — /auth/ prefix NAHI hai in mein

Coupon: /api/orders/apply-coupon/ (orders app ke andar, menu ke andar nahi)

Order response ka price field: total (grand_total nahi)

Analytics field names: UNCONFIRMED abhi — response parse karte waqt data.avg_order_value ?? data.average_order_value jaisa fallback likho

WebSocket real-time tracking: abhi tak backend mein confirm nahi hua ke ye actually bana bhi hai ya nahi. Abhi ke liye polling use karo (jaisa neeche section 7 mein hai), WebSocket code mat likhna jab tak explicit confirmation na aaye

1. Tech Stack & Environment

VITE_API_BASE_URL=<Railway backend URL, no trailing slash>
VITE_DEFAULT_TENANT_SLUG=moon-grill-narowal


Sab API calls ek centralized client.ts se guzarni chahiye — koi bhi component seedha fetch() na kare. Har request mein automatically ye headers jaayein:

Content-Type: application/json
X-Tenant-Slug: <active tenant slug>
Authorization: Bearer <access_token>   (jab authenticated ho)


401 handling: POST /api/auth/refresh/ se silently retry karo ek baar; dobara fail ho to /login pe redirect.

2. Multi-Tenancy — Har Cheez Ka Foundation

Abhi ek hi live tenant hai (moon-grill-narowal), lekin frontend kabhi bhi hardcode na kare — tenant slug ek global context/state se aaye, header mein automatically inject ho. Ye Phase FE-1 ka sabse pehla kaam hai — baaki kuch bhi is ke bina galat foundation pe banega.

3. Roles & Route Guards

7 roles hain: customer, kitchen, rider, admin, owner, manager, cashier.

Route Allowed Roles /, /dish/:slug, /cart Public/Guest /profile, /addresses Authenticated (customer + staff) /kitchen kitchen, manager, admin, owner /rider/* rider only /admin/* cashier, manager, admin, owner /admin/staff admin, owner only /admin/billing owner, admin only /onboard Public (redirect to /admin if already owner)

Login response ka must_change_password: true milte hi turant /change-password pe force-redirect karo, koi aur route accessible na ho jab tak change na ho jaye.

4. Authentication

4.1 Password login (staff/returning users)

POST /api/auth/login/ → {username: phone, password} → response mein access, refresh, must_change_password, user: {id, role, full_name, tenant: {id,name,slug}}

4.2 Phone+OTP (customers — "invisible registration")

POST /api/auth/phone-otp/ → {phone} → {"message": "OTP sent successfully."}

POST /api/auth/phone-verify/ → {phone, code} → {access, refresh, is_new_customer, user}

Naya customer silently create hota hai agar phone pehli baar aaya ho — koi password nahi maangna.

4.3 Self-serve restaurant onboarding (/onboard)

3-step wizard: POST /api/onboard/initiate/ (phone) → POST /api/onboard/verify/ (phone+code) → POST /api/onboard/complete/ (verification_token + restaurant_name + owner_name + owner_password) → seedha access/refresh/tenant mil jata hai, /admin pe land karo 14-day trial ke sath.

5. Menu & Multi-Item Cart

interface Dish {
  id: number; name: string; slug: string; base_price: string;
  image_url: string; is_available: boolean; is_featured: boolean;
  sizes: {id: number; size: string; price: string}[];
}


GET /api/menu/categories/ (nested dishes), GET /api/menu/dishes/, GET /api/menu/dishes/{slug}/

Cart state — multiple dishes support karta hai:

interface CartItem {
  dish_id: number; dish_name: string; dish_image: string;
  size_id?: number; size_name?: string; unit_price: number; qty: number;
}


Critical rule: Frontend price sirf display ke liye hai — backend hamesha apni taraf se unit_price recalculate karta hai (get_effective_price). Client jo bhi price bheje, backend ignore karta hai. Kabhi ye assume mat karo ke jo cart mein dikha, wahi bill hoga — order response se hi final price lo.

6. Checkout — Order Creation

POST /api/orders/
{
  "branch_id": 1,
  "payment": "cod",
  "coupon_code": "RAMADAN20",
  "address": {"name": "...", "phone": "...", "street": "...", "city": "...", "lat": 32.09, "lng": 74.87},
  "items": [
    {"dish_id": 27, "size_id": 57, "qty": 2},
    {"dish_id": 30, "size_id": 66, "qty": 1}
  ]
}


Note: Ye multi-item format ab backend mein upgrade ho raha hai (pehle sirf single-dish support tha) — is upgrade ke complete hone ka confirmation lena pehle, warna cart submit fail hoga 400 ke sath.

Response (201):

{"id": 221, "order_code": "MG-...", "status": "confirmed", "subtotal": "...", "discount": "...", "delivery_fee": "...", "total": "...", "items": [{"dish_name": "...", "size": "...", "qty": 2, "unit_price": "...", "line_total": "..."}]}


Coupon apply (checkout se pehle preview ke liye): POST /api/orders/apply-coupon/ → {code, subtotal} → discount amount wapis milta hai.

Address logic: Agar customer ka phone verified hai aur unke saved addresses hain (GET /api/addresses/), checkout pe wo pehle dikhao, naya address form sirf tab jab koi na ho.

7. Order Tracking (abhi Polling — WebSocket unconfirmed)

Jab tak backend WebSocket route confirm nahi hota, polling use karo:

Customer tracking page: GET /api/orders/{id}/ har 3-5 seconds

Admin order feed: GET /api/orders/all/ har 10 seconds

Rider job board: GET /api/orders/rider-jobs/ har 10-15 seconds

Order status sequence: pending → confirmed → kitchen → packed → onway → delivered (ya kisi bhi point pe cancelled).

Delivered hone pe turant rating dialog dikhao: POST /api/orders/{id}/rate/ → {rating, comment}.

8. Admin Console Modules

Orders (/admin/orders): List (GET /api/orders/all/), status change (PATCH /api/orders/{id}/status/), assign rider (POST /api/orders/{id}/assign-rider/), controls — priority/ETA/notes (PATCH /api/orders/{id}/controls/)

Menu (/admin/menu): CRUD dishes/categories (/api/admin/menu/dishes/, /categories/), image upload (POST .../dishes/{id}/upload-image/ multipart), discounts (/api/admin/menu/discounts/)

Inventory (/admin/inventory): GET /api/inventory/, adjust (POST /api/inventory/{id}/adjust/), low-stock highlight jab current_stock <= reorder_threshold

Staff (/admin/staff, admin/owner only): Create (POST /api/admin/staff/ → {role, phone, full_name} → temp password wapis aata hai, admin ko dikhana copy karne ke liye)

Branches (/admin/branches): GET/POST /api/admin/branches/, PATCH /api/admin/branches/{id}/

Billing (/admin/billing, owner/admin only): Plan+status (GET /api/billing/subscription/), plans list (GET /api/billing/plans/), invoice proof submit (POST /api/billing/invoices/{id}/submit-proof/)

Analytics (/admin dashboard): GET /api/orders/analytics/ — field names unconfirmed abhi, defensively parse karo

9. Rider Console

Duty toggle: POST /api/rider/duty-status/ → {duty_status: "online"|"offline"|"busy"} (hamesha POST, kabhi PATCH nahi)

GPS share: POST /api/rider/location-share/ → {lat, lng}, har 10-15 sec jab online ho

Jobs: GET /api/orders/rider-jobs/, accept (PATCH /api/orders/{id}/status/ → onway), reject (POST /api/orders/{id}/reject/), complete (PATCH .../status/ → delivered)

Earnings: GET /api/rider/earnings/ → {cash_in_hand, total_earned, total_delivered_count, recent_deliveries}

Profile: GET/PATCH /api/rider/profile/

10. Design Direction

Ek hi Caddy design-token system use karo teeno surfaces mein (storefront, admin, rider) — abhi 3 alag visual languages hain jo merge karni hain. Storefront ki motion-heavy identity (GSAP animations) rakhi ja sakti hai, lekin color tokens/card components/nav pattern sab jagah consistent hone chahiye.

11. Build Order

Tenant context + auth foundation (phone-OTP, must_change_password, role redirects)

Menu + cart + checkout (multi-item)

Order tracking (polling)

Admin: orders, menu management

Inventory + staff + branches

Billing/onboarding UI

Design consistency pass (unify Caddy theme)

WebSocket upgrade (jab backend confirm ho jaye)

Important: Jahan bhi is document mein "UNCONFIRMED" likha hai, wahan Lovable ko error-tolerant code likhna chahiye (optional chaining, fallback values) taake exact field name galat hone pe bhi UI crash na ho, sirf khaali/zero value dikhaye."

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f21e4712-7926-430c-93cd-026848dfde8d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
"# kennedyio" 
