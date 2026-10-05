import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, ShoppingBag, Utensils, User, Phone, MapPin, CreditCard, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { syncLiveBackendData } from "@/lib/admin-store";
import { formatPkPhoneInput, normalizePkPhone } from "@/lib/validation";

interface AdminCreateOrderModalProps {
  open: boolean;
  onClose: () => void;
}

interface DishOption {
  id: number;
  name: string;
  price: number;
  category?: string;
  image?: string;
  sizes?: { id: number; size: string; price: number }[];
}

export function AdminCreateOrderModal({ open, onClose }: AdminCreateOrderModalProps) {
  const [orderType, setOrderType] = useState<"delivery" | "takeaway" | "dine_in">("delivery");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("Model Town");
  const [city, setCity] = useState("Narowal");
  const [payment, setPayment] = useState<"cod" | "jazzcash" | "easypaisa">("cod");
  const [initialStatus, setInitialStatus] = useState<"confirmed" | "kitchen" | "delivered">("confirmed");
  const [priority, setPriority] = useState<"normal" | "rush" | "vip">("normal");

  const [availableDishes, setAvailableDishes] = useState<DishOption[]>([]);
  const [selectedDishId, setSelectedDishId] = useState<number | "custom">("custom");
  const [customDishName, setCustomDishName] = useState("Shinwari Chicken Karahi");
  const [selectedSize, setSelectedSize] = useState("Regular");
  const [price, setPrice] = useState(1450);
  const [qty, setQty] = useState(1);
  const [internalNotes, setInternalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const dishes = await api.get<any[]>("/menu/dishes/");
        if (Array.isArray(dishes) && dishes.length > 0) {
          const mapped: DishOption[] = dishes.map((d) => ({
            id: d.id,
            name: d.name,
            price: Number(d.price) || 1200,
            category: d.category_name,
            image: d.image_url,
            sizes: d.sizes?.map((s: any) => ({
              id: s.id,
              size: s.size,
              price: Number(s.price),
            })),
          }));
          setAvailableDishes(mapped);
          if (mapped[0]) {
            setSelectedDishId(mapped[0].id);
            setCustomDishName(mapped[0].name);
            setPrice(mapped[0].price);
          }
        }
      } catch {
        /* fallback to defaults */
      }
    })();
  }, [open]);

  const handleDishChange = (val: string) => {
    if (val === "custom") {
      setSelectedDishId("custom");
      setCustomDishName("");
      setPrice(1200);
      setSelectedSize("Regular");
      return;
    }
    const id = Number(val);
    setSelectedDishId(id);
    const found = availableDishes.find((d) => d.id === id);
    if (found) {
      setCustomDishName(found.name);
      setPrice(found.price);
      if (found.sizes && found.sizes.length > 0) {
        setSelectedSize(found.sizes[0]!.size);
        setPrice(found.sizes[0]!.price);
      } else {
        setSelectedSize("Regular");
      }
    }
  };

  const handleSizeChange = (sz: string) => {
    setSelectedSize(sz);
    if (selectedDishId !== "custom") {
      const found = availableDishes.find((d) => d.id === selectedDishId);
      const szObj = found?.sizes?.find((s) => s.size === sz);
      if (szObj) {
        setPrice(szObj.price);
      }
    }
  };

  const subtotal = price * qty;
  const deliveryFee = orderType === "delivery" ? (subtotal >= 2000 ? 0 : 120) : 0;
  const codFee = orderType === "delivery" && payment === "cod" ? 150 : 0;
  const total = subtotal + deliveryFee + codFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDishName.trim()) {
      toast.error("Dish name is required");
      return;
    }

    setSubmitting(true);
    try {
      const isWalkIn = orderType !== "delivery";
      const cleanPhone = customerPhone.trim() ? normalizePkPhone(customerPhone) : "03001234567";
      const finalName = customerName.trim() || (isWalkIn ? "Walk-in Counter Customer" : "Customer");

      const addressPayload = {
        label: isWalkIn ? "Counter / Takeaway" : "Home",
        name: finalName,
        phone: cleanPhone,
        street: isWalkIn ? "Kennedy Counter" : (street.trim() || "Main Bazaar"),
        area: isWalkIn ? "Counter" : (area.trim() || "Narowal"),
        city: city.trim() || "Narowal",
        notes: internalNotes.trim(),
        lat: 32.1024,
        lng: 74.8732,
        order_type: orderType,
      };

      const payload = {
        dish_name: customDishName.trim(),
        size: selectedSize,
        qty: qty,
        order_type: orderType,
        payment: payment,
        status: initialStatus,
        priority: priority,
        internal_notes: internalNotes.trim(),
        address: addressPayload,
        customer_name: finalName,
        customer_phone: cleanPhone,
        ...(typeof selectedDishId === "number" ? { dish_id: selectedDishId } : {}),
      };

      const created = await api.post<any>("/orders/", payload);
      toast.success("Order Created Successfully!", {
        description: `Order #${created.id} (${created.order_code}) created in ${initialStatus} status.`,
      });

      // Synchronize live admin store
      await syncLiveBackendData();
      onClose();
    } catch (err) {
      toast.error("Failed to create order", {
        description: err instanceof Error ? err.message : "Server rejected the order creation.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-lux/30 bg-[#161413] p-6 text-cream shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lux/10 text-lux border border-lux/30">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-hero text-xl font-bold tracking-wide text-lux">
                    Create New Order (POS / Desk)
                  </h2>
                  <p className="text-xs text-cream/60">
                    Place staff orders directly for walk-in counter, phone orders or dine-in.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-cream/50 hover:bg-white/10 hover:text-cream transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Order Type Buttons */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-lux/80 mb-1.5">
                  Order Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "delivery", label: "Home Delivery" },
                    { id: "takeaway", label: "Takeaway / Counter" },
                    { id: "dine_in", label: "Dine-In" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setOrderType(t.id as any)}
                      className={`rounded-xl border py-2.5 text-xs font-black uppercase tracking-[0.12em] transition ${
                        orderType === t.id
                          ? "border-lux bg-lux/20 text-lux shadow-sm"
                          : "border-white/10 bg-black/30 text-cream/60 hover:border-white/20"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-lux/80 mb-1">
                    Customer Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-cream/40" />
                    <input
                      type="text"
                      placeholder="e.g. Tariq Mehmood"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-xs text-cream placeholder:text-cream/30 focus:border-lux focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-lux/80 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-cream/40" />
                    <input
                      type="text"
                      placeholder="03xx xxxxxxx"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(formatPkPhoneInput(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-xs text-cream placeholder:text-cream/30 focus:border-lux focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Address details if delivery */}
              {orderType === "delivery" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-lux/80 mb-1">
                      Street / House
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-cream/40" />
                      <input
                        type="text"
                        placeholder="House # / Street, Mohalla"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-xs text-cream placeholder:text-cream/30 focus:border-lux focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-lux/80 mb-1">
                      Area / Zone
                    </label>
                    <input
                      type="text"
                      placeholder="Model Town"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 px-3 text-xs text-cream placeholder:text-cream/30 focus:border-lux focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Dish Selection & Sizing */}
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-lux">
                    Dish & Menu Selection
                  </span>
                  <span className="text-[10px] text-cream/50">Kennedy Moon Grill Menu</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-cream/60 mb-1 uppercase font-bold">
                      Select Dish
                    </label>
                    <select
                      value={selectedDishId}
                      onChange={(e) => handleDishChange(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#1e1c1a] py-2 px-3 text-xs text-cream focus:border-lux focus:outline-none"
                    >
                      {availableDishes.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} — Rs {d.price}
                        </option>
                      ))}
                      <option value="custom">+ Custom / Manual Dish</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-cream/60 mb-1 uppercase font-bold">
                      Dish Name (Display)
                    </label>
                    <input
                      type="text"
                      value={customDishName}
                      onChange={(e) => setCustomDishName(e.target.value)}
                      placeholder="Dish Name"
                      className="w-full rounded-xl border border-white/10 bg-[#1e1c1a] py-2 px-3 text-xs text-cream focus:border-lux focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-cream/60 mb-1 uppercase font-bold">
                      Size Variant
                    </label>
                    <input
                      type="text"
                      value={selectedSize}
                      onChange={(e) => handleSizeChange(e.target.value)}
                      placeholder="Regular / Half / Full"
                      className="w-full rounded-xl border border-white/10 bg-[#1e1c1a] py-2 px-3 text-xs text-cream focus:border-lux focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-cream/60 mb-1 uppercase font-bold">
                      Unit Price (PKR)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-white/10 bg-[#1e1c1a] py-2 px-3 text-xs text-cream focus:border-lux focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-cream/60 mb-1 uppercase font-bold">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={qty}
                      onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full rounded-xl border border-white/10 bg-[#1e1c1a] py-2 px-3 text-xs text-cream focus:border-lux focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Status, Priority & Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-lux/80 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={initialStatus}
                    onChange={(e) => setInitialStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 px-3 text-xs text-cream focus:border-lux focus:outline-none"
                  >
                    <option value="confirmed">Confirmed (To Kitchen)</option>
                    <option value="kitchen">Cooking in Kitchen</option>
                    <option value="delivered">Delivered (Completed)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-lux/80 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 px-3 text-xs text-cream focus:border-lux focus:outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="rush">Rush (Express)</option>
                    <option value="vip">VIP Guest</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-lux/80 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={payment}
                    onChange={(e) => setPayment(e.target.value as any)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 px-3 text-xs text-cream focus:border-lux focus:outline-none"
                  >
                    <option value="cod">Cash on Delivery (COD)</option>
                    <option value="jazzcash">JazzCash Mobile Wallet</option>
                    <option value="easypaisa">EasyPaisa Mobile Wallet</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-lux/80 mb-1">
                  Internal Staff Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra spicy, table #4, customer wants mint raita"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 py-2 px-3 text-xs text-cream placeholder:text-cream/30 focus:border-lux focus:outline-none"
                />
              </div>

              {/* Bill Summary Banner */}
              <div className="flex items-center justify-between rounded-2xl border border-lux/30 bg-lux/10 p-3.5">
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-lux">
                    Order Bill Total
                  </span>
                  <span className="text-xs text-cream/70">
                    Subtotal: Rs {subtotal} {deliveryFee > 0 && `· Delivery: Rs ${deliveryFee}`} {codFee > 0 && `· COD Fee: Rs ${codFee}`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-hero text-2xl font-black text-lux">
                    Rs {total}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/20 px-4 py-2.5 font-display text-xs font-black uppercase tracking-[0.14em] text-cream/70 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl border border-lux/40 bg-gradient-to-r from-flame to-[#D94824] px-6 py-2.5 font-display text-xs font-black uppercase tracking-[0.16em] text-cream shadow-[0_8px_24px_rgba(184,42,20,0.4)] hover:brightness-110 active:scale-95 disabled:opacity-50 transition"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-lux" />
                  )}
                  {submitting ? "Placing Order…" : `Place Order · Rs ${total}`}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
