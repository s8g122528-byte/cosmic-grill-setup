import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Crown,
  DollarSign,
  Edit2,
  ExternalLink,
  FileText,
  Filter,
  Flame,
  Gem,
  Globe2,
  Info,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  PauseCircle,
  PlayCircle,
  PlusCircle,
  QrCode,
  Radio,
  Receipt,
  RefreshCw,
  Search,
  ServerCog,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api/client";
import { PLATFORM } from "@/lib/api/endpoints";
import { readAccount } from "@/lib/auth";

export const Route = createFileRoute("/platform")({
  ssr: false,
  beforeLoad: () => {
    const acct = readAccount();
    if (!acct || !acct.isSuperuser) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Kennedy SaaS — Platform Superuser Console" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlatformDashboard,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type PlatformStats = {
  tenants: { total: number; active: number; paused: number };
  orders: { today: number; total: number };
  revenue_pkr: { today: number; total: number };
  subscriptions: { trialing: number; active: number; past_due: number; cancelled: number };
  pending_invoices_count: number;
};

type PlatformTenant = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  subscription_status: "trialing" | "active" | "past_due" | "cancelled" | "none";
  plan_name: string;
  plan_slug: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  orders_today: number;
  orders_total: number;
  revenue_today: number;
  revenue_total: number;
  staff_count: number;
  branch_count: number;
};

type Invoice = {
  id: number;
  subscription: { tenant: { slug: string; name: string }; plan: { name: string } };
  amount_pkr: string;
  status: "pending" | "under_review" | "paid" | "rejected";
  period_start: string;
  period_end: string;
  jazzcash_transaction_id: string;
  payment_proof_url: string;
  paid_at: string | null;
  created_at: string;
  admin_notes: string;
};

// ─── Utility helpers ──────────────────────────────────────────────────────────

const pkr = (n: number) =>
  "₨ " + Math.round(n).toLocaleString("en-PK");

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtTime = (d: string | null) =>
  d
    ? new Date(d).toLocaleString("en-PK", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const PLAN_BADGE: Record<string, string> = {
  "free-trial": "bg-slate-700/60 text-slate-300 border-slate-600",
  "basic-plan": "bg-sky-900/60 text-sky-300 border-sky-700",
  "growth-plan": "bg-violet-900/60 text-violet-300 border-violet-700",
  "enterprise-plan": "bg-amber-900/60 text-amber-300 border-amber-600",
};

const SUB_STATUS_BADGE: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
  trialing: {
    cls: "bg-amber-900/50 text-amber-300 border-amber-600/50",
    label: "Trial",
    icon: <Clock className="w-3 h-3" />,
  },
  active: {
    cls: "bg-emerald-900/50 text-emerald-300 border-emerald-600/50",
    label: "Active",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  past_due: {
    cls: "bg-orange-900/50 text-orange-300 border-orange-600/50",
    label: "Past Due",
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  cancelled: {
    cls: "bg-red-900/50 text-red-400 border-red-700/50",
    label: "Cancelled",
    icon: <Ban className="w-3 h-3" />,
  },
  none: {
    cls: "bg-neutral-800/60 text-neutral-400 border-neutral-700",
    label: "No Sub",
    icon: <Info className="w-3 h-3" />,
  },
};

const INVOICE_STATUS: Record<string, { cls: string; label: string }> = {
  pending: { cls: "text-neutral-400 bg-neutral-800 border-neutral-700", label: "Pending" },
  under_review: { cls: "text-amber-300 bg-amber-900/40 border-amber-700/50", label: "Under Review" },
  paid: { cls: "text-emerald-300 bg-emerald-900/40 border-emerald-700/50", label: "Paid ✓" },
  rejected: { cls: "text-red-400 bg-red-900/30 border-red-700/50", label: "Rejected" },
};

// ─── Reusable small components ────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent = "amber",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: "amber" | "sky" | "emerald" | "violet" | "rose";
}) {
  const accentMap = {
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    sky: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };
  return (
    <div className="bg-[#1a1815] border border-[#2e2a24] rounded-2xl p-5 hover:border-amber-500/20 transition-colors group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-widest text-[#7a6e5e]">{label}</span>
        <span className={`p-2 rounded-lg border ${accentMap[accent]}`}>{icon}</span>
      </div>
      <div className="text-2xl font-black text-white tracking-tight">{value}</div>
      {sub && <div className="text-xs text-[#7a6e5e] mt-1 font-medium">{sub}</div>}
    </div>
  );
}

function SectionHeading({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">{icon}</span>
      <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
      {count !== undefined && (
        <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-[#2e2a24] text-[#9a8e7e] border border-[#3e3630] font-semibold">
          {count}
        </span>
      )}
    </div>
  );
}

function LuxInput({
  label,
  required,
  ...props
}: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest text-[#7a6e5e] mb-1.5">
        {label} {required && <span className="text-amber-400">*</span>}
      </label>
      <input
        {...props}
        className="w-full px-3.5 py-2.5 bg-[#0e0d0b] border border-[#2e2a24] rounded-lg text-sm text-white placeholder-[#4a4440] focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
      />
    </div>
  );
}

function LuxSelect({
  label,
  children,
  ...props
}: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest text-[#7a6e5e] mb-1.5">{label}</label>
      <select
        {...props}
        className="w-full px-3.5 py-2.5 bg-[#0e0d0b] border border-[#2e2a24] rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all appearance-none"
      >
        {children}
      </select>
    </div>
  );
}

// ─── Sub-panel: Subscription Modal ───────────────────────────────────────────

function SubscriptionModal({
  tenant,
  onClose,
  onSaved,
}: {
  tenant: PlatformTenant;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [newStatus, setNewStatus] = useState(tenant.subscription_status as string);
  const [newPlan, setNewPlan] = useState(tenant.plan_slug);
  const [extendDays, setExtendDays] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (newStatus !== tenant.subscription_status) payload.status = newStatus;
      if (newPlan !== tenant.plan_slug) payload.plan_slug = newPlan;
      if (extendDays && parseInt(extendDays) > 0) payload.extend_trial_days = parseInt(extendDays);
      if (!Object.keys(payload).length) { toast("Nothing changed."); onClose(); return; }
      await api.patch(PLATFORM.subscription(tenant.slug), payload);
      toast.success(`Subscription updated for ${tenant.name}`);
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update subscription");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#161413] border border-[#2e2a24] rounded-2xl w-full max-w-md shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between p-5 border-b border-[#2e2a24]">
          <div className="flex items-center gap-2.5">
            <Wallet className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white">Manage Subscription</h3>
          </div>
          <button onClick={onClose} className="text-[#7a6e5e] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-[#0e0d0b] border border-[#2e2a24] rounded-xl p-4 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-[#7a6e5e]">Restaurant</span>
              <span className="font-bold text-white">{tenant.name}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-[#7a6e5e]">Current Plan</span>
              <span className="text-amber-300 font-semibold">{tenant.plan_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7a6e5e]">Current Status</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${SUB_STATUS_BADGE[tenant.subscription_status]?.cls}`}>
                {SUB_STATUS_BADGE[tenant.subscription_status]?.label}
              </span>
            </div>
          </div>

          <LuxSelect label="Change Plan" value={newPlan} onChange={e => setNewPlan(e.target.value)}>
            <option value="free-trial">Free Trial (15 days)</option>
            <option value="basic-plan">Basic Plan — ₨6,000/mo</option>
            <option value="growth-plan">Growth Plan — ₨10,000/mo</option>
            <option value="enterprise-plan">Enterprise — Custom</option>
          </LuxSelect>

          <LuxSelect label="Override Status" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
            <option value="trialing">Trialing</option>
            <option value="active">Active (Paid)</option>
            <option value="past_due">Past Due</option>
            <option value="cancelled">Cancelled</option>
          </LuxSelect>

          <LuxInput
            label="Extend Trial (days)"
            type="number"
            min="1"
            max="365"
            placeholder="e.g. 15"
            value={extendDays}
            onChange={e => setExtendDays(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-[#2e2a24]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#7a6e5e] hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-400 text-[#0e0d0b] rounded-lg transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-panel: Invoice Verify Modal ─────────────────────────────────────────

function InvoiceVerifyModal({
  invoice,
  onClose,
  onDone,
}: {
  invoice: Invoice;
  onClose: () => void;
  onDone: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);

  const act = async (action: "approve" | "reject") => {
    setSubmitting(action);
    try {
      const res: any = await api.post(PLATFORM.verifyInvoice(invoice.id), { action, admin_notes: notes });
      toast.success(res.detail || `Invoice ${action}d`);
      onDone();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Action failed");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#161413] border border-[#2e2a24] rounded-2xl w-full max-w-md shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between p-5 border-b border-[#2e2a24]">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white">Invoice #{invoice.id} — Verification</h3>
          </div>
          <button onClick={onClose} className="text-[#7a6e5e] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-[#0e0d0b] border border-[#2e2a24] rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#7a6e5e]">Restaurant</span>
              <span className="font-bold text-white">{invoice.subscription?.tenant?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7a6e5e]">Plan</span>
              <span className="text-amber-300">{invoice.subscription?.plan?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7a6e5e]">Amount</span>
              <span className="font-bold text-emerald-400 text-base">{pkr(parseFloat(invoice.amount_pkr))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7a6e5e]">Period</span>
              <span className="text-neutral-300 text-xs">{fmtDate(invoice.period_start)} – {fmtDate(invoice.period_end)}</span>
            </div>
            {invoice.jazzcash_transaction_id && (
              <div className="flex justify-between">
                <span className="text-[#7a6e5e]">TXN ID</span>
                <span className="font-mono text-amber-300 text-xs">{invoice.jazzcash_transaction_id}</span>
              </div>
            )}
            {invoice.payment_proof_url && (
              <a
                href={invoice.payment_proof_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 text-xs mt-1 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Payment Proof
              </a>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#7a6e5e] mb-1.5">
              Admin Notes (optional)
            </label>
            <textarea
              rows={3}
              className="w-full px-3.5 py-2.5 bg-[#0e0d0b] border border-[#2e2a24] rounded-lg text-sm text-white placeholder-[#4a4440] focus:outline-none focus:border-amber-500/50 resize-none"
              placeholder="Reason for rejection or approval notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-[#2e2a24]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#7a6e5e] hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={() => act("reject")}
            disabled={!!submitting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-red-900/50 hover:bg-red-800/60 text-red-300 border border-red-700/50 rounded-lg transition-colors"
          >
            {submitting === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            Reject
          </button>
          <button
            onClick={() => act("approve")}
            disabled={!!submitting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors"
          >
            {submitting === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Approve & Activate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-panel: Onboard Restaurant Modal ─────────────────────────────────────

function OnboardModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (t: PlatformTenant) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    owner_username: "",
    owner_password: "",
    owner_phone: "",
    plan_slug: "free-trial",
  });
  const [saving, setSaving] = useState(false);
  const slugTouched = useRef(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (k === "name" && !slugTouched.current) {
      const auto = e.target.value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      setForm(f => ({ ...f, name: e.target.value, slug: auto }));
    } else {
      if (k === "slug") slugTouched.current = true;
      setForm(f => ({ ...f, [k]: e.target.value }));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug || !form.owner_username || !form.owner_password) {
      toast.error("Fill all required fields.");
      return;
    }
    setSaving(true);
    try {
      const created = await api.post<PlatformTenant>(PLATFORM.tenants, {
        ...form,
        slug: form.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      });
      toast.success(`🎉 ${created.name} onboarded successfully!`);
      onCreated(created);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create restaurant");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#161413] border border-[#2e2a24] rounded-2xl w-full max-w-lg shadow-2xl shadow-black/60 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[#2e2a24] sticky top-0 bg-[#161413] z-10">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white">Onboard New Restaurant</h3>
          </div>
          <button onClick={onClose} className="text-[#7a6e5e] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <LuxInput label="Restaurant Name" required placeholder="e.g. Royal Spice Karahi" value={form.name} onChange={set("name")} />
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#7a6e5e] mb-1.5">
              Tenant Slug <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. royal-spice-karahi"
              value={form.slug}
              onChange={set("slug")}
              className="w-full px-3.5 py-2.5 bg-[#0e0d0b] border border-[#2e2a24] rounded-lg text-sm font-mono text-amber-300 placeholder-[#4a4440] focus:outline-none focus:border-amber-500/50 transition-all"
            />
            <p className="text-xs text-[#5a5248] mt-1">Used as subdomain identifier. Lowercase, hyphens only.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <LuxInput label="Owner Username" required placeholder="royal_owner" value={form.owner_username} onChange={set("owner_username")} />
            <LuxInput label="Owner Password" required type="password" placeholder="••••••••" value={form.owner_password} onChange={set("owner_password")} />
          </div>

          <LuxInput label="Owner Phone (WhatsApp)" placeholder="03001234567" value={form.owner_phone} onChange={set("owner_phone")} />

          <LuxSelect label="Starting SaaS Plan" value={form.plan_slug} onChange={set("plan_slug")}>
            <option value="free-trial">🕐 Free Trial — 15 days, 50 orders/day</option>
            <option value="basic-plan">📦 Basic Plan — ₨6,000/mo, 100 orders/day</option>
            <option value="growth-plan">🚀 Growth Plan — ₨10,000/mo, 500 orders/day + AI</option>
            <option value="enterprise-plan">👑 Enterprise — Custom, Unlimited</option>
          </LuxSelect>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2e2a24]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[#7a6e5e] hover:text-white transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-amber-500 hover:bg-amber-400 text-[#0e0d0b] rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              Create Restaurant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sub-panel: WhatsApp Modal ───────────────────────────────────────────────

function PlatformWhatsAppModal({
  tenant,
  onClose,
}: {
  tenant: PlatformTenant;
  onClose: () => void;
}) {
  const [waData, setWaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);

  const loadWA = async () => {
    try {
      const res = await api.get<any>(`/whatsapp/qr/?tenant=${tenant.slug}`);
      setWaData(res);
    } catch (e: any) {
      toast.error("Failed to load WA status: " + (e?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWA();
    const interval = setInterval(loadWA, 4000);
    return () => clearInterval(interval);
  }, [tenant.slug]);

  const handleRestart = async () => {
    setRestarting(true);
    try {
      await api.post(`/whatsapp/restart/?tenant=${tenant.slug}`, {});
      toast.success("Gateway socket restarted. Generating fresh QR...");
      await loadWA();
    } catch (e: any) {
      toast.error("Restart failed: " + (e?.message || "Unknown error"));
    } finally {
      setRestarting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post(`/whatsapp/logout/?tenant=${tenant.slug}`, {});
      toast.success("Session disconnected.");
      await loadWA();
    } catch (e: any) {
      toast.error("Disconnect failed: " + (e?.message || "Unknown error"));
    }
  };

  const isConnected = waData?.is_connected === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#161413] border border-[#2e2a24] rounded-2xl w-full max-w-md shadow-2xl shadow-black/60 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[#2e2a24]">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-white leading-none">{tenant.name}</h3>
              <span className="text-[11px] text-[#7a6e5e] font-mono mt-0.5 block">WhatsApp Gateway Instance</span>
            </div>
          </div>
          <button onClick={onClose} className="text-[#7a6e5e] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-center">
          {loading ? (
            <div className="py-10 flex flex-col items-center gap-3 text-[#7a6e5e]">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              <span className="text-xs">Synchronizing Baileys socket...</span>
            </div>
          ) : isConnected ? (
            <div className="py-4 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white">WhatsApp Connected &amp; Live</h4>
              <p className="text-xs text-[#8a7e6e] max-w-xs mx-auto">
                Official number: <span className="font-mono text-amber-300 font-bold">+{waData?.phone || "Linked"}</span>.
                Customer OTPs and order updates route directly through this device.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 text-xs font-bold text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl hover:bg-red-900/50 transition-colors"
                >
                  Disconnect Instance
                </button>
              </div>
            </div>
          ) : waData?.qrcode ? (
            <div className="space-y-4">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Scan QR with Restaurant WhatsApp
                </span>
                <p className="text-[11px] text-[#8a7e6e]">
                  Linked Devices → Link a Device
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white border-2 border-amber-500/30 inline-block shadow-xl">
                <img src={waData.qrcode} alt="QR Code" className="w-52 h-52 object-contain mx-auto" />
              </div>

              {waData.pairing_code && (
                <div className="p-2.5 rounded-xl bg-[#0e0d0b] border border-[#2e2a24] text-xs">
                  <span className="text-[#7a6e5e] text-[10px] block">Pairing Code:</span>
                  <span className="font-mono font-bold text-amber-300 text-base">{waData.pairing_code}</span>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={handleRestart}
                  disabled={restarting}
                  className="px-3.5 py-1.5 text-xs font-bold bg-[#221f1b] hover:bg-[#2d2822] text-[#a09484] hover:text-white border border-[#2e2a24] rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${restarting ? "animate-spin" : ""}`} />
                  Reset Session
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
              <p className="text-xs text-[#7a6e5e]">Starting session for {tenant.slug}...</p>
              <button
                onClick={handleRestart}
                className="px-3.5 py-1.5 text-xs font-bold bg-amber-500/20 text-amber-300 rounded-lg hover:bg-amber-500/30"
              >
                Start Instance
              </button>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-[#2e2a24] flex justify-end bg-[#0e0d0b]">
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-bold text-[#7a6e5e] hover:text-white">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tenant Row ───────────────────────────────────────────────────────────────

function TenantRow({
  t,
  onToggle,
  onManageSub,
  onManageWa,
  isSubmitting,
}: {
  t: PlatformTenant;
  onToggle: () => void;
  onManageSub: () => void;
  onManageWa: () => void;
  isSubmitting: boolean;
}) {
  const subBadge = SUB_STATUS_BADGE[t.subscription_status] ?? SUB_STATUS_BADGE.none;
  const planBadgeCls = PLAN_BADGE[t.plan_slug] ?? PLAN_BADGE["free-trial"];

  const daysLeft =
    t.subscription_status === "trialing" && t.trial_ends_at
      ? Math.max(0, Math.ceil((new Date(t.trial_ends_at).getTime() - Date.now()) / 86400000))
      : null;

  return (
    <tr className="hover:bg-[#1e1c19]/60 transition-colors border-b border-[#2a2620]/80 last:border-0">
      {/* Restaurant */}
      <td className="py-4 px-5">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-8 rounded-full ${t.is_active ? "bg-emerald-500" : "bg-neutral-600"}`}
          />
          <div>
            <div className="font-bold text-white text-sm">{t.name}</div>
            <div className="text-xs text-[#5a5248] font-mono mt-0.5">/{t.slug}</div>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="py-4 px-4">
        <div className="flex flex-col gap-1.5">
          {t.is_active ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-900/40 text-emerald-400 border border-emerald-600/30 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-800/60 text-neutral-400 border border-neutral-700 w-fit">
              <PauseCircle className="w-3 h-3" />
              Paused
            </span>
          )}
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border w-fit ${subBadge.cls}`}>
            {subBadge.icon}
            {subBadge.label}
          </span>
        </div>
      </td>

      {/* Plan */}
      <td className="py-4 px-4">
        <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg border ${planBadgeCls}`}>
          {t.plan_name}
        </span>
        <div className="text-xs text-[#5a5248] mt-1.5">
          {daysLeft !== null ? (
            <span className={daysLeft <= 3 ? "text-red-400 font-semibold" : "text-amber-400"}>
              ⏳ {daysLeft}d trial left
            </span>
          ) : t.current_period_end ? (
            <span>Renews {fmtDate(t.current_period_end)}</span>
          ) : null}
        </div>
      </td>

      {/* Today */}
      <td className="py-4 px-4 text-right">
        <div className="text-sm font-bold text-white">{t.orders_today}</div>
        <div className="text-xs text-emerald-400 font-medium">{pkr(t.revenue_today)}</div>
        <div className="text-xs text-[#5a5248]">today</div>
      </td>

      {/* Lifetime */}
      <td className="py-4 px-4 text-right">
        <div className="text-sm font-bold text-white">{t.orders_total}</div>
        <div className="text-xs text-[#9a8e7e]">{pkr(t.revenue_total)}</div>
        <div className="text-xs text-[#5a5248]">{t.staff_count} staff · {t.branch_count} branch</div>
      </td>

      {/* Actions */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={onManageWa}
            className="text-xs px-2.5 py-1.5 rounded-lg font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors whitespace-nowrap"
          >
            <QrCode className="w-3 h-3 inline-block mr-1" />
            WhatsApp
          </button>
          <button
            onClick={onManageSub}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
          >
            <Wallet className="w-3 h-3 inline-block mr-1" />
            Subscription
          </button>
          <button
            onClick={onToggle}
            disabled={isSubmitting}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors whitespace-nowrap ${
              t.is_active
                ? "bg-red-900/30 text-red-400 border-red-700/30 hover:bg-red-900/50"
                : "bg-emerald-900/30 text-emerald-400 border-emerald-700/30 hover:bg-emerald-900/50"
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="w-3 h-3 animate-spin inline-block" />
            ) : t.is_active ? (
              <><PauseCircle className="w-3 h-3 inline-block mr-1" />Pause</>
            ) : (
              <><PlayCircle className="w-3 h-3 inline-block mr-1" />Resume</>
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

type ActiveView = "overview" | "tenants" | "invoices";

function PlatformDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [filterSub, setFilterSub] = useState("all");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("overview");

  // Modals
  const [subModal, setSubModal] = useState<PlatformTenant | null>(null);
  const [waModal, setWaModal] = useState<PlatformTenant | null>(null);
  const [invoiceModal, setInvoiceModal] = useState<Invoice | null>(null);
  const [showOnboard, setShowOnboard] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState("all");

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sRes, tRes] = await Promise.all([
        api.get<PlatformStats>(PLATFORM.stats),
        api.get<PlatformTenant[]>(PLATFORM.tenants),
      ]);
      setStats(sRes);
      setTenants(tRes);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load platform data");
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const filter = invoiceFilter !== "all" ? `?status=${invoiceFilter}` : "";
      const res = await api.get<Invoice[]>(`${PLATFORM.invoices}${filter}`);
      setInvoices(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load invoices");
    } finally {
      setInvoicesLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (activeView === "invoices") loadInvoices();
  }, [activeView, invoiceFilter]);

  const handleToggleActive = async (tenant: PlatformTenant) => {
    setSubmitting(tenant.slug);
    try {
      const res = await api.patch<PlatformTenant>(PLATFORM.tenantDetail(tenant.slug), {
        is_active: !tenant.is_active,
      });
      setTenants(prev => prev.map(t => (t.slug === tenant.slug ? res : t)));
      toast.success(`${tenant.name} is now ${res.is_active ? "▶ Live" : "⏸ Paused"}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    } finally {
      setSubmitting(null);
    }
  };

  const filteredTenants = tenants.filter(t => {
    const q = query.toLowerCase();
    const matchQ =
      t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q);
    const matchSub = filterSub === "all" || t.subscription_status === filterSub;
    return matchQ && matchSub;
  });

  const filteredInvoices = invoices.filter(inv => {
    if (invoiceFilter === "all") return true;
    return inv.status === invoiceFilter;
  });

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "tenants", label: "Restaurants", icon: <Building2 className="w-4 h-4" />, badge: tenants.length },
    {
      id: "invoices",
      label: "Invoices",
      icon: <Receipt className="w-4 h-4" />,
      badge: stats?.pending_invoices_count || undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0e0d0b] text-white font-sans">
      {/* ── Top Navigation Bar ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[#2a2620] bg-[#0e0d0b]/95 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Crown className="w-4 h-4 text-[#0e0d0b]" />
              </div>
              <div>
                <div className="text-sm font-black tracking-tight text-white leading-none">Kennedy</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 leading-none mt-0.5">
                  SaaS Platform
                </div>
              </div>
            </div>

            {/* Nav tabs */}
            <nav className="flex items-center gap-1 ml-4">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    activeView === item.id
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                      : "text-[#7a6e5e] hover:text-white hover:bg-[#1e1c19]"
                  }`}
                >
                  {item.icon}
                  {item.label}
                  {item.badge ? (
                    <span className="text-[10px] font-bold bg-amber-500 text-[#0e0d0b] rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAll}
              disabled={loading}
              className="p-2 rounded-lg text-[#7a6e5e] hover:text-white hover:bg-[#1e1c19] transition-colors border border-transparent hover:border-[#2a2620]"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={() => setShowOnboard(true)}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-bold bg-amber-500 hover:bg-amber-400 text-[#0e0d0b] rounded-lg shadow-lg shadow-amber-500/15 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Onboard Restaurant
            </button>

            <Link
              to="/admin"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#7a6e5e] hover:text-white bg-[#1a1815] hover:bg-[#242119] border border-[#2a2620] rounded-lg transition-colors"
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              Moon Grill Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">

        {/* ── OVERVIEW ──────────────────────────────────────────── */}
        {activeView === "overview" && (
          <>
            {/* Hero welcome */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white">
                  Platform Command Centre
                  <span className="ml-3 text-sm font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full align-middle">
                    Rafy — Superuser
                  </span>
                </h1>
                <p className="text-[#7a6e5e] mt-1.5 text-sm">
                  Full system control — multi-tenant SaaS billing, operations, subscriptions &amp; health.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#5a5248]">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                System Operational
              </div>
            </div>

            {/* KPI row */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-[#1a1815] border border-[#2e2a24] rounded-2xl p-5 h-28 animate-pulse" />
                ))}
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard
                  label="Total Restaurants"
                  value={stats.tenants.total}
                  sub={`${stats.tenants.active} live · ${stats.tenants.paused} paused`}
                  icon={<Building2 className="w-4 h-4" />}
                  accent="amber"
                />
                <KpiCard
                  label="Orders Today"
                  value={stats.orders.today.toLocaleString()}
                  sub={`${stats.orders.total.toLocaleString()} lifetime`}
                  icon={<Activity className="w-4 h-4" />}
                  accent="sky"
                />
                <KpiCard
                  label="Platform GMV Today"
                  value={pkr(stats.revenue_pkr.today)}
                  sub={`${pkr(stats.revenue_pkr.total)} lifetime`}
                  icon={<TrendingUp className="w-4 h-4" />}
                  accent="emerald"
                />
                <KpiCard
                  label="Active Subscriptions"
                  value={stats.subscriptions.active + stats.subscriptions.trialing}
                  sub={`${stats.subscriptions.active} paid · ${stats.subscriptions.trialing} trial`}
                  icon={<Zap className="w-4 h-4" />}
                  accent="violet"
                />
                <KpiCard
                  label="Pending Invoices"
                  value={stats.pending_invoices_count}
                  sub="Awaiting payment review"
                  icon={<FileText className="w-4 h-4" />}
                  accent={stats.pending_invoices_count > 0 ? "rose" : "amber"}
                />
                <KpiCard
                  label="Past Due"
                  value={stats.subscriptions.past_due}
                  sub="Need immediate action"
                  icon={<AlertTriangle className="w-4 h-4" />}
                  accent={stats.subscriptions.past_due > 0 ? "rose" : "amber"}
                />
                <KpiCard
                  label="Cancelled"
                  value={stats.subscriptions.cancelled}
                  sub="Churned tenants"
                  icon={<Ban className="w-4 h-4" />}
                  accent="rose"
                />
                <KpiCard
                  label="Total Branches"
                  value={tenants.reduce((s, t) => s + t.branch_count, 0)}
                  sub={`${tenants.reduce((s, t) => s + t.staff_count, 0)} total staff`}
                  icon={<Users className="w-4 h-4" />}
                  accent="sky"
                />
              </div>
            ) : null}

            {/* Subscription breakdown */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Subscription health */}
                <div className="bg-[#1a1815] border border-[#2e2a24] rounded-2xl p-5">
                  <SectionHeading icon={<Gem className="w-4 h-4" />} title="Subscription Health" />
                  <div className="space-y-3">
                    {[
                      { label: "Active (Paid)", value: stats.subscriptions.active, color: "bg-emerald-500", max: stats.tenants.total },
                      { label: "Trialing", value: stats.subscriptions.trialing, color: "bg-amber-500", max: stats.tenants.total },
                      { label: "Past Due", value: stats.subscriptions.past_due, color: "bg-orange-500", max: stats.tenants.total },
                      { label: "Cancelled", value: stats.subscriptions.cancelled, color: "bg-red-500", max: stats.tenants.total },
                    ].map(row => (
                      <div key={row.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#9a8e7e]">{row.label}</span>
                          <span className="font-bold text-white">{row.value}</span>
                        </div>
                        <div className="h-2 bg-[#2a2620] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${row.color} rounded-full transition-all`}
                            style={{ width: `${row.max ? (row.value / row.max) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="bg-[#1a1815] border border-[#2e2a24] rounded-2xl p-5">
                  <SectionHeading icon={<Zap className="w-4 h-4" />} title="Quick Actions" />
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Onboard Restaurant", icon: <Building2 className="w-4 h-4" />, action: () => setShowOnboard(true), color: "text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20" },
                      { label: "Review Invoices", icon: <FileText className="w-4 h-4" />, action: () => setActiveView("invoices"), color: "text-sky-400 bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/20" },
                      { label: "Manage Tenants", icon: <Building2 className="w-4 h-4" />, action: () => setActiveView("tenants"), color: "text-violet-400 bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20" },
                      { label: "Refresh Data", icon: <RefreshCw className="w-4 h-4" />, action: loadAll, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20" },
                    ].map(btn => (
                      <button
                        key={btn.label}
                        onClick={btn.action}
                        className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-sm font-semibold transition-all ${btn.color}`}
                      >
                        {btn.icon}
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tenant snapshot */}
            <div className="bg-[#1a1815] border border-[#2e2a24] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <SectionHeading icon={<Building2 className="w-4 h-4" />} title="Restaurant Snapshot" count={tenants.length} />
                <button
                  onClick={() => setActiveView("tenants")}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
                >
                  Manage All <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-3">
                {tenants.slice(0, 5).map(t => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-3 border-b border-[#2a2620]/60 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${t.is_active ? "bg-emerald-400 animate-pulse" : "bg-neutral-500"}`} />
                      <div>
                        <div className="text-sm font-bold text-white">{t.name}</div>
                        <div className="text-xs text-[#5a5248] font-mono">/{t.slug}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="text-xs text-[#7a6e5e]">Today's Revenue</div>
                        <div className="text-sm font-bold text-emerald-400">{pkr(t.revenue_today)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#7a6e5e]">Plan</div>
                        <div className={`text-xs font-bold px-2 py-0.5 rounded border ${PLAN_BADGE[t.plan_slug] ?? PLAN_BADGE["free-trial"]}`}>
                          {t.plan_name}
                        </div>
                      </div>
                      <button
                        onClick={() => setSubModal(t)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Health */}
            <div className="bg-[#1a1815] border border-[#2e2a24] rounded-2xl p-5">
              <SectionHeading icon={<ServerCog className="w-4 h-4" />} title="System Health" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "API Server", status: "operational", icon: <Globe2 className="w-4 h-4" /> },
                  { label: "Database", status: "operational", icon: <Package className="w-4 h-4" /> },
                  { label: "WebSocket", status: "operational", icon: <Activity className="w-4 h-4" /> },
                  { label: "Auth & Security", status: "operational", icon: <ShieldCheck className="w-4 h-4" /> },
                ].map(srv => (
                  <div key={srv.label} className="flex items-center gap-3 p-3 bg-[#0e0d0b] rounded-xl border border-[#2a2620]">
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                      {srv.icon}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{srv.label}</div>
                      <div className="text-xs text-emerald-400 font-medium capitalize flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                        {srv.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── TENANTS VIEW ──────────────────────────────────────── */}
        {activeView === "tenants" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-white">Restaurant Management</h2>
              <button
                onClick={() => setShowOnboard(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-400 text-[#0e0d0b] rounded-lg transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Onboard New
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#1a1815] border border-[#2e2a24] rounded-xl p-4">
              <div className="relative flex-1 min-w-0 w-full">
                <Search className="w-4 h-4 text-[#5a5248] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name or slug..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#0e0d0b] border border-[#2a2620] rounded-lg text-sm text-white placeholder-[#4a4440] focus:outline-none focus:border-amber-500/40"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Filter className="w-4 h-4 text-[#5a5248]" />
                <select
                  value={filterSub}
                  onChange={e => setFilterSub(e.target.value)}
                  className="px-3 py-2 bg-[#0e0d0b] border border-[#2a2620] rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/40"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="past_due">Past Due</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-[#1a1815] border border-[#2e2a24] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0e0d0b] border-b border-[#2a2620]">
                    <tr>
                      {["Restaurant", "Status", "Plan / Trial", "Today", "Lifetime", "Actions"].map(h => (
                        <th
                          key={h}
                          className={`py-3.5 px-4 text-xs font-bold uppercase tracking-widest text-[#5a5248] ${h === "Actions" || h === "Today" || h === "Lifetime" ? "text-right" : ""}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-[#5a5248]">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Loading restaurants...
                        </td>
                      </tr>
                    ) : filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-[#5a5248]">
                          No restaurants match your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map(t => (
                        <TenantRow
                          key={t.id}
                          t={t}
                          onToggle={() => handleToggleActive(t)}
                          onManageSub={() => setSubModal(t)}
                          onManageWa={() => setWaModal(t)}
                          isSubmitting={submitting === t.slug}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── INVOICES VIEW ─────────────────────────────────────── */}
        {activeView === "invoices" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-white">Invoice Management</h2>
              {stats?.pending_invoices_count ? (
                <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-sm font-bold">
                  <AlertCircle className="w-4 h-4" />
                  {stats.pending_invoices_count} pending review
                </span>
              ) : null}
            </div>

            {/* Invoice filter */}
            <div className="flex items-center gap-3 bg-[#1a1815] border border-[#2e2a24] rounded-xl p-4">
              <Filter className="w-4 h-4 text-[#5a5248]" />
              <span className="text-xs text-[#5a5248] font-semibold uppercase tracking-widest">Filter:</span>
              {["all", "under_review", "pending", "paid", "rejected"].map(s => (
                <button
                  key={s}
                  onClick={() => setInvoiceFilter(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors capitalize ${
                    invoiceFilter === s
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      : "text-[#7a6e5e] border-[#2a2620] hover:text-white hover:bg-[#1e1c19]"
                  }`}
                >
                  {s === "all" ? "All" : s === "under_review" ? "Under Review" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {invoicesLoading ? (
              <div className="flex items-center justify-center py-20 text-[#5a5248]">
                <Loader2 className="w-6 h-6 animate-spin mr-3" />
                Loading invoices...
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="bg-[#1a1815] border border-[#2e2a24] rounded-2xl p-12 text-center text-[#5a5248]">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No invoices found.
              </div>
            ) : (
              <div className="bg-[#1a1815] border border-[#2e2a24] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#0e0d0b] border-b border-[#2a2620]">
                      <tr>
                        {["#", "Restaurant", "Plan", "Amount", "Period", "Status", "Submitted", "Actions"].map(h => (
                          <th key={h} className="py-3.5 px-4 text-xs font-bold uppercase tracking-widest text-[#5a5248]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map(inv => {
                        const badge = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.pending;
                        return (
                          <tr key={inv.id} className="border-b border-[#2a2620]/60 last:border-0 hover:bg-[#1e1c19]/60 transition-colors">
                            <td className="py-3.5 px-4 font-mono text-[#7a6e5e] text-xs">#{inv.id}</td>
                            <td className="py-3.5 px-4 font-bold text-white text-sm">
                              {inv.subscription?.tenant?.name ?? "—"}
                              <div className="text-xs text-[#5a5248] font-mono mt-0.5">/{inv.subscription?.tenant?.slug ?? "—"}</div>
                            </td>
                            <td className="py-3.5 px-4 text-[#9a8e7e] text-xs">{inv.subscription?.plan?.name ?? "—"}</td>
                            <td className="py-3.5 px-4 font-bold text-emerald-400">{pkr(parseFloat(inv.amount_pkr))}</td>
                            <td className="py-3.5 px-4 text-xs text-[#7a6e5e]">
                              {fmtDate(inv.period_start)} – {fmtDate(inv.period_end)}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${badge.cls}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-[#5a5248]">{fmtTime(inv.created_at)}</td>
                            <td className="py-3.5 px-4">
                              {(inv.status === "under_review" || inv.status === "pending") && (
                                <button
                                  onClick={() => setInvoiceModal(inv)}
                                  className="text-xs px-3 py-1.5 rounded-lg font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
                                >
                                  Review →
                                </button>
                              )}
                              {inv.status === "paid" && (
                                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  Verified
                                </span>
                              )}
                              {inv.status === "rejected" && (
                                <span className="text-xs text-red-400 font-semibold flex items-center gap-1">
                                  <X className="w-3.5 h-3.5" />
                                  Rejected
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Modals ────────────────────────────────────────────────── */}
      {showOnboard && (
        <OnboardModal
          onClose={() => setShowOnboard(false)}
          onCreated={t => {
            setTenants(prev => [t, ...prev]);
            loadAll();
          }}
        />
      )}

      {subModal && (
        <SubscriptionModal
          tenant={subModal}
          onClose={() => setSubModal(null)}
          onSaved={loadAll}
        />
      )}

      {waModal && (
        <PlatformWhatsAppModal
          tenant={waModal}
          onClose={() => setWaModal(null)}
        />
      )}

      {invoiceModal && (
        <InvoiceVerifyModal
          invoice={invoiceModal}
          onClose={() => setInvoiceModal(null)}
          onDone={() => { loadAll(); loadInvoices(); }}
        />
      )}
    </div>
  );
}
