import { Fragment, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Banknote, Check, ChevronLeft, CircleDollarSign, Loader2, LockKeyhole, MapPin, Minus, Plus, Trash2, PlusCircle, ShieldCheck, Smartphone, UtensilsCrossed, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getLocalUser, useSession } from "@/hooks/use-session";
import {
  clearSelected,
  removeFromCart,
  setAllSelected,
  setCartQty,
  toggleCartSelected,
  useCart,
} from "@/lib/cart";
import {
  PAYMENTS,
  loadAddresses,
  loadAddressesLocal,
  saveAddress,
  type Address,
  type PaymentMethod,
} from "@/lib/orders";
import {
  createOrder,
  getLastOrderBill,
  getLastOrderCode,
  saveProfile,
  type OrderType,
} from "@/lib/account";
import {
  branchHours,
  fetchBranches,
  isOpenNow,
  rememberBranchId,
  rememberedBranchId,
  resolveBranchId,
  type Branch,
} from "@/lib/branches";
import { normalizeCoupon, previewCoupon, type CouponState } from "@/lib/coupons";
import { ApiError } from "@/lib/api/client";
import type { OrderBill } from "@/lib/account";
import { OrderReceiptDialog, SoldOutDialog } from "@/components/kennedy/OrderOutcomeDialogs";
import { LuxuryOtpWidget } from "@/components/kennedy/LuxuryOtpWidget";
import {
  formatPkPhoneInput,
  normalizePkPhone,
  validateCity,
  validateName,
  validatePkPhone,
  validateStreet,
} from "@/lib/validation";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart & Checkout — Kennedy Moon Grill Narowal" },
      {
        name: "description",
        content:
          "Review your Kennedy order, share your live delivery location and pay with JazzCash, EasyPaisa or cash on delivery.",
      },
      { property: "og:title", content: "Your Cart — Kennedy Moon Grill" },
      {
        property: "og:description",
        content: "One place to add items, share your location and place the order.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartPage,
});

type FieldKey = "name" | "phone" | "street" | "area" | "city" | "notes";

const MotionButton = motion.create(Button);

function CartPage() {
  const navigate = useNavigate();
  const { items, selected, selectedSubtotal: subtotal } = useCart();
  const { isSignedIn, isLoading } = useSession();

  const [form, setForm] = useState({
    label: "Home",
    name: "",
    phone: "",
    street: "",
    area: "",
    city: "Narowal",
    notes: "",
  });
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [payment, setPayment] = useState<PaymentMethod>("jazzcash");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [placing, setPlacing] = useState(false);

  // Seamless Guest WhatsApp OTP checkout
  const [otpVerified, setOtpVerified] = useState(false);

  // Branches (SLICE 2.4) — hidden entirely when the backend serves none.
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(() => rememberedBranchId());

  useEffect(() => {
    void fetchBranches().then((list) => {
      if (!list.length) return;
      setBranches(list);
      setBranchId((cur) => {
        const keep = cur && list.some((b) => b.id === cur) ? cur : null;
        const next = keep ?? (list.find((b) => b.is_active !== false) ?? list[0])?.id ?? null;
        if (next) rememberBranchId(next);
        return next;
      });
    });
  }, []);

  const activeBranch = useMemo(
    () => branches.find((b) => b.id === branchId) ?? null,
    [branches, branchId],
  );

  const chooseBranch = (id: number) => {
    setBranchId(id);
    rememberBranchId(id);
  };

  // Discount code (SLICE 2.5) — preview when the backend offers it, otherwise
  // the code simply rides along with the order.
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponState>({ status: "none" });

  const applyCoupon = async () => {
    const code = normalizeCoupon(couponInput);
    if (!code) return;
    setCoupon({ status: "checking", code });
    const next = await previewCoupon(code, subtotal);
    setCoupon(next);
    if (next.status === "invalid") toast.error(next.message);
    else if (next.status === "applied")
      toast.success(`Code ${next.code} applied · Rs ${next.discount} off`);
    else toast.success(`Code ${code} added — the discount shows on your bill`);
  };

  const clearCoupon = () => {
    setCoupon({ status: "none" });
    setCouponInput("");
  };

  // Saved addresses (repeat orders should not retype anything)
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<string>("new");

  useEffect(() => {
    const local = loadAddressesLocal();
    if (local.length) {
      setAddresses(local);
      setSelectedAddr(String((local.find((a) => a.is_default) ?? local[0])!.id ?? "new"));
    }
    void loadAddresses()
      .then((list) => {
        if (!list.length) return;
        setAddresses(list);
        setSelectedAddr((cur) =>
          cur !== "new" && list.some((a) => String(a.id) === cur)
            ? cur
            : String((list.find((a) => a.is_default) ?? list[0])!.id ?? "new"),
        );
      })
      .catch(() => undefined);
  }, []);

  const savedAddress = useMemo(
    () => addresses.find((a) => String(a.id) === selectedAddr) ?? null,
    [addresses, selectedAddr],
  );
  const usingNew = selectedAddr === "new" || !savedAddress;

  /** Takeaway and dine-in need no address at all (v2.4 contract). */
  const needsAddress = orderType === "delivery";

  const errors = useMemo(() => {
    const e: Partial<Record<FieldKey, string>> = {};
    if (needsAddress && usingNew) {
      const checks = [
        ["name", validateName(form.name)],
        ["phone", validatePkPhone(form.phone)],
        ["street", validateStreet(form.street)],
        ["city", validateCity(form.city)],
      ] as const;
      for (const [key, check] of checks) if (!check.ok) e[key] = check.message;
    } else if (!needsAddress && !isSignedIn) {
      const checks = [
        ["name", validateName(form.name)],
        ["phone", validatePkPhone(form.phone)],
      ] as const;
      for (const [key, check] of checks) if (!check.ok) e[key] = check.message;
    }
    return e;
  }, [form, usingNew, needsAddress, isSignedIn]);

  const activeCoords = coords ??
    (savedAddress?.lat && savedAddress?.lng ? { lat: savedAddress.lat, lng: savedAddress.lng } : null);

  // Display only — the bill that counts comes back with the order.
  const fee = needsAddress ? (PAYMENTS.find((p) => p.id === payment)?.fee ?? 0) : 0;
  const delivery = !needsAddress || subtotal >= 2000 || subtotal === 0 ? 0 : 120;
  const discount = coupon.status === "applied" ? Math.min(coupon.discount, subtotal) : 0;
  const total = Math.max(0, subtotal + delivery + fee - discount);

  const firstFieldError = (["name", "phone", "street", "city"] as const)
    .map((k) => errors[k])
    .find(Boolean);

  const blockReason: string | null = isLoading
    ? "Checking your account…"
    : selected.length === 0
      ? "Tick at least one item above"
      : firstFieldError
        ? firstFieldError
        : !isSignedIn && !otpVerified
          ? "Verify your phone number with OTP first"
          : branches.length > 0 && !activeBranch
            ? "Pick a branch to order from"
            : activeBranch && !isOpenNow(activeBranch)
              ? `${activeBranch.name} is closed right now`
              : null;

  const checkoutStep = !isSignedIn && !otpVerified ? 2 : 3;
  const paymentIcon = (method: PaymentMethod) => {
    if (method === "cod") return Banknote;
    if (method === "easypaisa") return Smartphone;
    return WalletCards;
  };

  const shareLocation = () => {
    if (!navigator.geolocation) {
      toast.error("This browser can't share your location");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success("Location shared", {
          description: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
        });
      },
      () => {
        setLocating(false);
        toast.info("Using standard Narowal delivery location");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const [soldOut, setSoldOut] = useState<string[] | null>(null);
  const [receipt, setReceipt] = useState<{
    code: string | null;
    bill: OrderBill | null;
    note: string;
  } | null>(null);

  const placeOrder = async () => {
    if (blockReason) {
      setTouched({ name: true, phone: true, street: true, city: true });
      toast.error("Almost there", { description: blockReason });
      return;
    }

    setPlacing(true);
    try {
      let user = getLocalUser();

      // Guest checkout: phone must be verified via real WhatsApp OTP before placing order
      if (!user && !isSignedIn) {
        if (!otpVerified) {
          toast.error("Phone verification required", {
            description: "Please verify your phone number via WhatsApp OTP first.",
          });
          setPlacing(false);
          return;
        }
        // otpVerified=true means LuxuryOtpWidget already called verifyPhoneCode and stored the user.
        // Re-fetch from local storage (the widget saves it on success).
        user = getLocalUser();
        if (!user) {
          toast.error("Session error", {
            description: "Verification expired. Please verify your phone again.",
          });
          setOtpVerified(false);
          setPlacing(false);
          return;
        }
      }

      // Default to Narowal city center if browser geolocation is blocked/denied
      const defaultCoords = { lat: 32.1024, lng: 74.8732 };
      const resolvedCoords = activeCoords ?? defaultCoords;

      const address: Address = usingNew
        ? {
            label: form.label || "Home",
            name: form.name.trim(),
            phone: normalizePkPhone(form.phone),
            street: form.street.trim(),
            area: form.area.trim() || "Central",
            city: form.city.trim() || "Narowal",
            notes: form.notes.trim(),
            ...resolvedCoords,
          }
        : { ...savedAddress!, ...resolvedCoords };

      const first = selected[0]!;
      const chosenBranchId = branchId ?? (await resolveBranchId().catch(() => null));

      await createOrder({
        userId: user?.id,
        orderType,
        branchId: chosenBranchId,
        ...(coupon.status === "applied" || coupon.status === "pending"
          ? { couponCode: coupon.code }
          : {}),
        items: selected.map((i) => ({
          dish_slug: i.slug,
          dish_id: i.dish?.id,
          size: i.size,
          size_id: i.sizeId,
          qty: i.qty,
        })),
        dishName:
          selected.length > 1
            ? `${first.dish.name} + ${selected.length - 1} more`
            : first.dish.name,
        dishImage: first.dish.image,
        size: first.size,
        qty: selected.reduce((n, i) => n + i.qty, 0),
        total,
        payment,
        ...(needsAddress ? { address } : {}),
      });

      // Remember this address for the next order
      if (needsAddress && usingNew)
        await saveAddress({ id: crypto.randomUUID(), ...address }).catch(() => undefined);

      if (user?.id && needsAddress) {
        await saveProfile({
          id: user.id,
          full_name: address.name,
          phone: address.phone,
        }).catch(() => undefined);
      }

      clearSelected();
      setReceipt({
        code: getLastOrderCode(),
        bill: getLastOrderBill(),
        note:
          orderType === "delivery"
            ? "This is the final bill from the kitchen. Live rider tracking has started."
            : "This is the final bill from the kitchen. We'll call when it's ready.",
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const names = Object.values(err.fields).flat().filter((s) => s && s !== "insufficient_stock");
        setSoldOut(names);
        return;
      }
      toast.error("We couldn't place your order", {
        description: err instanceof Error ? err.message : "Please try again in a moment.",
      });
    } finally {
      setPlacing(false);
    }
  };

  const fieldClass = (key: FieldKey) =>
    `mt-1 w-full rounded-xl border-2 bg-cream px-3 py-2.5 font-body text-sm text-charcoal outline-none ${
      touched[key] && errors[key]
        ? "border-flame focus:border-flame"
        : "border-charcoal/12 focus:border-flame"
    }`;

  return (
    <main className="checkout-stage min-h-screen bg-cream pb-20">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-display text-xs font-extrabold uppercase tracking-[0.18em] text-charcoal/70 hover:text-flame"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Keep browsing
        </Link>

        <div className="mt-4 flex flex-col gap-5 border-b border-charcoal/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 font-display text-[11px] font-extrabold uppercase tracking-[0.16em] text-flame"><UtensilsCrossed className="h-4 w-4" aria-hidden="true" /> Kennedy checkout caddy</span>
            <h1 className="mt-1 font-display text-3xl font-extrabold uppercase text-charcoal sm:text-5xl">Your order, guided</h1>
            <p className="mt-2 max-w-xl font-body text-sm text-charcoal/65">We’ll keep every choice together and show what still needs attention.</p>
          </div>
          <ol className="checkout-progress" aria-label="Checkout progress">
            {["Cart", "Verify", "Pay"].map((label, index) => {
              const number = index + 1;
              const complete = number < checkoutStep;
              const active = number === checkoutStep;
              return <li key={label} className={complete ? "is-complete" : active ? "is-active" : ""}><span>{complete ? <Check aria-hidden="true" /> : number}</span>{label}</li>;
            })}
          </ol>
        </div>

        {items.length === 0 ? (
          <p className="mt-6 font-body text-sm text-charcoal/70">
            Your cart is empty —{" "}
            <Link to="/" className="font-semibold text-flame">
              see the menu
            </Link>
            .
          </p>
        ) : (
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,.8fr)]">
            {/* items + checkout form */}
            <div>
              <div className="mb-3 flex items-center justify-between rounded-lg border border-charcoal/10 bg-cream-deep/45 px-4 py-2.5">
                <span className="font-body text-xs text-charcoal/70">
                  {selected.length} of {items.length} items selected
                </span>
                <button
                  type="button"
                  onClick={() => setAllSelected(selected.length !== items.length)}
                  className="font-display text-[11px] font-extrabold uppercase tracking-[0.16em] text-flame"
                >
                  {selected.length === items.length ? "Unselect all" : "Select all"}
                </button>
              </div>
              <div className="space-y-3">
                {items.map((i) => (
                  <div
                    key={`${i.slug}-${i.size}`}
                    className={`checkout-item flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      i.selected ? "border-flame/35 bg-flame/5" : "border-charcoal/10 bg-cream-deep/35"
                    }`}
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={i.selected}
                      aria-label={`Select ${i.dish.name}`}
                      onClick={() => toggleCartSelected(i.slug, i.size)}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                        i.selected ? "border-flame bg-flame text-cream" : "border-charcoal/25"
                      }`}
                    >
                      {i.selected && <Check className="h-4 w-4" aria-hidden="true" />}
                    </button>
                    <img
                      src={i.dish.image}
                      alt={i.dish.name}
                      className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" decoding="async" />

                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-extrabold uppercase text-charcoal">
                        {i.dish.name}
                      </p>
                      <p className="font-body text-xs text-charcoal/60">
                        {i.size} · Rs {i.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-cream p-1">
                      <button
                        type="button"
                        aria-label="Decrease"
                        onClick={() => setCartQty(i.slug, i.size, i.qty - 1)}
                        className="rounded-full p-1.5"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <span className="w-5 text-center font-display text-sm font-extrabold">
                        {i.qty}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase"
                        onClick={() => setCartQty(i.slug, i.size, Math.min(20, i.qty + 1))}
                        className="rounded-full p-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${i.dish.name}`}
                      onClick={() => removeFromCart(i.slug, i.size)}
                      className="rounded-full p-2 text-charcoal/50 hover:text-flame"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              <h2 className="mt-8 font-display text-lg font-extrabold uppercase text-charcoal">
                How do you want it?
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(
                  [
                    ["delivery", "Delivery", "To your door"],
                    ["takeaway", "Takeaway", "Collect yourself"],
                    ["dine_in", "Dine in", "Eat at the branch"],
                  ] as const
                ).map(([key, label, note]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={orderType === key}
                    onClick={() => setOrderType(key)}
                    className={`checkout-choice rounded-lg border-2 p-3 text-left ${
                      orderType === key ? "is-selected border-flame bg-flame/5" : "border-charcoal/12"
                    }`}
                  >
                    <span className="block font-display text-xs font-extrabold uppercase text-charcoal">
                      {label}
                    </span>
                    <span className="block font-body text-[11px] text-charcoal/60">{note}</span>
                  </button>
                ))}
              </div>

              {branches.length > 0 && (
                <>
                  <h2 className="mt-8 font-display text-lg font-extrabold uppercase text-charcoal">
                    Which branch?
                  </h2>
                  <div className="mt-3 space-y-2">
                    {branches.map((b) => {
                      const open = isOpenNow(b);
                      const hours = branchHours(b);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          aria-pressed={branchId === b.id}
                          onClick={() => chooseBranch(b.id)}
                          className={`flex w-full items-start justify-between gap-3 rounded-2xl border-2 p-3 text-left ${
                            branchId === b.id ? "border-flame bg-flame/5" : "border-charcoal/12"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block font-display text-sm font-extrabold uppercase text-charcoal">
                              {b.name}
                            </span>
                            {b.address && (
                              <span className="block truncate font-body text-[11px] text-charcoal/60">
                                {b.address}
                              </span>
                            )}
                            <span className="block font-body text-[11px] text-charcoal/50">
                              {hours ? `Open ${hours}` : "Open hours not listed"}
                              {needsAddress && b.delivery_radius_km
                                ? ` · delivers up to ${b.delivery_radius_km} km`
                                : ""}
                            </span>
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-1 font-body text-[10px] font-bold uppercase ${
                              open ? "bg-flame/10 text-flame" : "bg-charcoal/10 text-charcoal/60"
                            }`}
                          >
                            {open ? "Open" : "Closed"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {!needsAddress && (
                <>
                  <p className="mt-3 rounded-2xl bg-flame/5 px-4 py-3 font-body text-xs text-charcoal/70">
                    No address needed — pay at the counter, with no delivery or cash-handling
                    charge.
                  </p>

                  {!isSignedIn && (
                    <div className="mt-4 rounded-2xl border-2 border-charcoal/10 bg-cream p-4">
                      <h3 className="font-display text-sm font-extrabold uppercase text-charcoal">
                        Customer Details &amp; Mobile Verification
                      </h3>
                      <p className="mt-0.5 text-xs text-charcoal/60 font-body">
                        Enter your mobile number to receive your pickup ticket and order status updates.
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <label className="block">
                          <span className="font-body text-[11px] uppercase tracking-widest text-charcoal/50">
                            Full Name
                          </span>
                          <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. Mian Ahmed"
                            className={fieldClass("name")}
                          />
                          {touched.name && errors.name && (
                            <span className="mt-1 block font-body text-[11px] font-semibold text-flame">
                              {errors.name}
                            </span>
                          )}
                        </label>
                        <label className="block">
                          <span className="font-body text-[11px] uppercase tracking-widest text-charcoal/50">
                            Mobile Number
                          </span>
                          <input
                            type="tel"
                            inputMode="tel"
                            maxLength={15}
                            placeholder="0300 1234567"
                            value={form.phone}
                            disabled={otpVerified}
                            onChange={(e) => {
                              setForm({ ...form, phone: formatPkPhoneInput(e.target.value) });
                              if (otpVerified) setOtpVerified(false);
                            }}
                            className={`${fieldClass("phone")}${otpVerified ? " cursor-not-allowed opacity-70 bg-green-50/60" : ""}`}
                          />
                          {touched.phone && errors.phone && (
                            <span className="mt-1 block font-body text-[11px] font-semibold text-flame">
                              {errors.phone}
                            </span>
                          )}
                        </label>
                      </div>

                      <LuxuryOtpWidget
                        phone={form.phone}
                        name={form.name}
                        isVerified={otpVerified}
                        onVerified={(account) => {
                          setOtpVerified(true);
                          if (account?.name && !form.name) {
                            setForm((f) => ({ ...f, name: account.name }));
                          }
                        }}
                      />
                    </div>
                  )}
                </>
              )}

              {needsAddress && (
                <h2 className="mt-8 font-display text-lg font-extrabold uppercase text-charcoal">
                  Delivery details
                </h2>
              )}

              {needsAddress && addresses.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="font-body text-[11px] uppercase tracking-widest text-charcoal/50">
                    Deliver to a saved address
                  </p>
                  {addresses.map((a) => (
                    <button
                      key={String(a.id)}
                      type="button"
                      onClick={() => setSelectedAddr(String(a.id))}
                      className={`flex w-full items-start gap-3 rounded-2xl border-2 p-3 text-left ${
                        String(a.id) === selectedAddr ? "border-flame bg-flame/5" : "border-charcoal/12"
                      }`}
                    >
                      <span
                        className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
                          String(a.id) === selectedAddr ? "border-flame bg-flame" : "border-charcoal/25"
                        }`}
                      />
                      <span className="min-w-0">
                        <span className="block font-display text-xs font-extrabold uppercase text-charcoal">
                          {a.label} · {a.name}
                        </span>
                        <span className="block font-body text-xs text-charcoal/65">
                          {a.street}, {a.area}, {a.city} · {a.phone}
                        </span>
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedAddr("new")}
                    className={`flex w-full items-center gap-2 rounded-2xl border-2 border-dashed p-3 font-display text-[11px] font-extrabold uppercase tracking-[0.16em] ${
                      usingNew ? "border-flame text-flame" : "border-charcoal/25 text-charcoal/70"
                    }`}
                  >
                    <PlusCircle className="h-4 w-4" aria-hidden="true" />
                    Use a new address
                  </button>
                </div>
              )}

              {needsAddress && usingNew && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["name", "Full name"],
                      ["phone", "Phone number"],
                      ["street", "House / street"],
                      ["area", "Area"],
                      ["city", "City"],
                      ["notes", "Notes for the rider (optional)"],
                    ] as const
                  ).map(([key, label]) => (
                    <Fragment key={key}>
                    <div className={key === "notes" ? "sm:col-span-2" : ""}>
                      <label className="block font-body text-[11px] uppercase tracking-widest text-charcoal/60 font-bold">
                        {label}
                      </label>
                      <div className={key === "phone" ? "relative" : ""}>
                      <input
                        value={form[key]}
                        {...(key === "phone"
                          ? {
                              type: "tel",
                              inputMode: "tel" as const,
                              maxLength: 15,
                              placeholder: "0300 1234567",
                              autoComplete: "tel",
                              disabled: otpVerified && !isSignedIn,
                              readOnly: otpVerified && !isSignedIn,
                            }
                          : {})}
                        aria-invalid={Boolean(touched[key] && errors[key])}
                        onBlur={() => setTouched((t) => ({ ...t, [key]: true }))}
                        onChange={(e) => {
                          const val = key === "phone" ? formatPkPhoneInput(e.target.value) : e.target.value;
                          setForm((f) => ({ ...f, [key]: val }));
                          if (key === "phone" && otpVerified) setOtpVerified(false);
                        }}
                        className={`${fieldClass(key)}${key === "phone" && otpVerified && !isSignedIn ? " cursor-not-allowed border-flame/25 bg-flame/5 pr-10" : ""}`}
                      />
                      {key === "phone" && otpVerified && !isSignedIn && <LockKeyhole className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-flame" aria-hidden="true" />}
                      </div>
                      {touched[key] && errors[key] && (
                        <span className="mt-1 block font-body text-[11px] font-semibold text-flame">
                          {errors[key]}
                        </span>
                      )}
                    </div>
                    {key === "phone" && !isSignedIn && (
                      <div className="sm:col-span-2 -mt-1">
                        <LuxuryOtpWidget
                          phone={form.phone}
                          name={form.name}
                          isVerified={otpVerified}
                          onVerified={(account) => {
                            setOtpVerified(true);
                            if (account?.name && !form.name) setForm((f) => ({ ...f, name: account.name }));
                          }}
                        />
                      </div>
                    )}
                    </Fragment>
                  ))}
                </div>
              )}

              {needsAddress && (
              <button
                type="button"
                onClick={shareLocation}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 py-3 font-display text-xs font-extrabold uppercase tracking-[0.16em] ${
                  activeCoords
                    ? "border-flame bg-flame/10 text-flame"
                    : "border-dashed border-charcoal/25 text-charcoal/70"
                }`}
              >
                {locating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                )}
                {locating
                  ? "Finding you…"
                  : activeCoords
                    ? `Location shared · ${activeCoords.lat.toFixed(4)}, ${activeCoords.lng.toFixed(4)}`
                    : "Share my live location (required)"}
              </button>
              )}
            </div>

            {/* summary */}
            <aside className="checkout-summary h-fit rounded-xl border border-charcoal/10 bg-cream-deep/55 p-5 lg:sticky lg:top-6">
              <div className="flex items-center justify-between gap-3">
                <div><span className="font-body text-[10px] font-bold uppercase tracking-[0.14em] text-flame">Caddy step 3</span><h2 className="font-display text-lg font-extrabold uppercase text-charcoal">Choose payment</h2></div>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-charcoal text-cream"><CircleDollarSign className="h-5 w-5" aria-hidden="true" /></span>
              </div>
              <div className="mt-3 space-y-2">
                {PAYMENTS.map((p) => {
                  const PaymentIcon = paymentIcon(p.id);
                  const selectedPayment = payment === p.id;
                  return (
                  <MotionButton
                    key={p.id}
                    type="button"
                    onClick={() => setPayment(p.id)}
                    whileTap={{ scale: 0.985 }}
                    animate={{ x: selectedPayment ? 3 : 0 }}
                    className={`payment-choice flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left ${
                      selectedPayment ? "is-selected border-flame bg-flame/5" : "border-charcoal/12 bg-cream/55"
                    }`}
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${selectedPayment ? "bg-flame text-cream" : "bg-charcoal/8 text-charcoal"}`}><PaymentIcon className="h-5 w-5" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-sm font-extrabold uppercase text-charcoal">
                        {p.label}
                      </span>
                      <span className="block font-body text-xs text-charcoal/60">{p.note}</span>
                    </span>
                    {p.fee > 0 && (
                      <span className="font-body text-xs text-charcoal/60">+Rs {p.fee}</span>
                    )}
                    <AnimatePresence>{selectedPayment && <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-flame text-cream"><Check className="h-4 w-4" aria-hidden="true" /></motion.span>}</AnimatePresence>
                  </MotionButton>
                );})}
              </div>

              {/* SLICE 2.5 — discount code */}
              <div className="mt-5">
                <label
                  htmlFor="coupon"
                  className="font-display text-xs font-extrabold uppercase tracking-[0.18em] text-charcoal"
                >
                  Discount code
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="coupon"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void applyCoupon();
                      }
                    }}
                    placeholder="e.g. MOON10"
                    autoComplete="off"
                    disabled={coupon.status === "applied" || coupon.status === "pending"}
                    className="min-w-0 flex-1 rounded-xl border-2 border-charcoal/12 bg-cream px-3 py-2.5 font-body text-sm uppercase tracking-wide text-charcoal outline-none focus:border-flame disabled:opacity-60"
                  />
                  {coupon.status === "applied" || coupon.status === "pending" ? (
                    <button
                      type="button"
                      onClick={clearCoupon}
                      className="rounded-xl border-2 border-charcoal/12 px-4 font-display text-xs font-extrabold uppercase tracking-[0.14em] text-charcoal/70"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void applyCoupon()}
                      disabled={coupon.status === "checking" || !couponInput.trim()}
                      className="flex items-center gap-1.5 rounded-xl bg-charcoal px-4 font-display text-xs font-extrabold uppercase tracking-[0.14em] text-cream disabled:opacity-50"
                    >
                      {coupon.status === "checking" && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      )}
                      Apply
                    </button>
                  )}
                </div>
                {coupon.status === "invalid" && (
                  <p className="mt-1.5 font-body text-[11px] font-semibold text-flame" role="status">
                    {coupon.message}
                  </p>
                )}
                {coupon.status === "pending" && (
                  <p className="mt-1.5 font-body text-[11px] text-charcoal/60" role="status">
                    {coupon.code} will be checked when you place the order.
                  </p>
                )}
                {coupon.status === "applied" && (
                  <p className="mt-1.5 font-body text-[11px] font-semibold text-charcoal" role="status">
                    {coupon.label ?? `${coupon.code} applied`} · Rs {coupon.discount} off
                  </p>
                )}
              </div>

              <p className="mt-5 flex items-center gap-2 font-body text-[11px] uppercase tracking-[0.14em] text-charcoal/50"><ShieldCheck className="h-4 w-4 text-flame" aria-hidden="true" />
                Estimate · the kitchen confirms the final bill
              </p>
              <dl className="mt-2 space-y-2 font-body text-sm">
                <div className="flex justify-between">
                  <dt className="text-charcoal/60">Subtotal</dt>
                  <dd className="text-charcoal">Rs {subtotal}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-charcoal/60">Delivery</dt>
                  <dd className="text-charcoal">{delivery ? `Rs ${delivery}` : "Free"}</dd>
                </div>
                {fee > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-charcoal/60">COD fee</dt>
                    <dd className="text-charcoal">Rs {fee}</dd>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-charcoal/60">Discount</dt>
                    <dd className="font-semibold text-charcoal">− Rs {discount}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-charcoal/10 pt-2">
                  <dt className="font-display font-extrabold uppercase text-charcoal">Total</dt>
                  <dd className="font-display text-xl font-extrabold text-flame">Rs {total}</dd>
                </div>
              </dl>

              <button
                type="button"
                disabled={placing || Boolean(blockReason)}
                aria-busy={placing}
                {...(blockReason ? { title: blockReason } : {})}
                onClick={() => void placeOrder()}
                className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-flame py-4 font-display text-sm font-extrabold uppercase tracking-[0.16em] text-cream shadow-[0_14px_30px_rgba(180,40,20,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {placing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {placing
                  ? "Placing your order…"
                  : `Place order · Rs ${total}`}
              </button>

              <p
                className={`mt-2 text-center font-body text-[11px] ${
                  blockReason ? "font-semibold text-flame" : "text-charcoal/50"
                }`}
                role={blockReason ? "status" : undefined}
              >
                {blockReason ?? "Live rider tracking opens on your profile right after you order."}
              </p>
            </aside>
          </div>
        )}
      </div>
      <SoldOutDialog open={soldOut !== null} items={soldOut ?? []} onClose={() => setSoldOut(null)} />
      <OrderReceiptDialog
        open={receipt !== null}
        code={receipt?.code ?? null}
        bill={receipt?.bill ?? null}
        note={receipt?.note ?? ""}
        onClose={() => {
          setReceipt(null);
          void navigate({ to: "/profile" });
        }}
      />
    </main>
  );
}
