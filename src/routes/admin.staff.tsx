import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  ChefHat,
  ShoppingBag,
  BadgeCheck,
  Bike,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { Panel } from "@/components/admin/bits";
import { currentTenantSlug } from "@/lib/tenant";

export const Route = createFileRoute("/admin/staff")({
  ssr: false,
  component: AdminStaffPage,
});

type StaffMember = {
  id: number;
  username: string;
  full_name: string;
  phone: string;
  role: string;
  is_active: boolean;
  branch_id: number | null;
  branch_name: string | null;
  created_at: string;
};

const ROLE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  kitchen:  { label: "Kitchen",  icon: <ChefHat className="w-4 h-4" />,    color: "text-amber-lux bg-amber-lux/10 border-amber-lux/20" },
  cashier:  { label: "Cashier",  icon: <ShoppingBag className="w-4 h-4" />, color: "text-azure bg-azure/10 border-azure/20" },
  manager:  { label: "Manager",  icon: <BadgeCheck className="w-4 h-4" />,  color: "text-lux bg-lux/10 border-lux/20" },
  rider:    { label: "Rider",    icon: <Bike className="w-4 h-4" />,        color: "text-jade bg-jade/10 border-jade/20" },
  admin:    { label: "Admin",    icon: <ShieldCheck className="w-4 h-4" />, color: "text-ruby bg-ruby/10 border-ruby/20" },
  owner:    { label: "Owner",    icon: <ShieldCheck className="w-4 h-4" />, color: "text-amber-lux bg-amber-lux/10 border-amber-lux/20" },
};

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? { label: role, icon: null, color: "text-mist bg-ink border-line" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${meta.color}`}>
      {meta.icon}{meta.label}
    </span>
  );
}

function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New staff form
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("kitchen");

  // Temp password reveal
  const [newCred, setNewCred] = useState<{ username: string; temp_password: string; role: string } | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [copied, setCopied] = useState(false);

  const tenantSlug = currentTenantSlug();

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<StaffMember[]>("/admin/staff/");
      setStaff(data);
    } catch {
      toast.error("Staff list load karne mein masla aaya.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleCreate = async () => {
    if (!phone.trim()) { toast.error("Phone number required."); return; }
    setSubmitting(true);
    try {
      const res = await api.post<{ id: number; username: string; role: string; temp_password: string }>(
        "/admin/staff/",
        { full_name: fullName, phone, role },
      );
      setNewCred(res);
      setShowForm(false);
      setFullName(""); setPhone(""); setRole("kitchen");
      fetchStaff();
      toast.success("Staff member bana diya! Temporary password neeche hai.");
    } catch (e: any) {
      toast.error(e?.error || "Staff member banana fail ho gaya.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: number, name: string) => {
    if (!confirm(`Kya aap '${name || id}' ko deactivate karna chahte hain?`)) return;
    try {
      await api.delete(`/admin/staff/${id}/`);
      toast.success("Staff member deactivate ho gaya.");
      fetchStaff();
    } catch {
      toast.error("Deactivate fail ho gaya.");
    }
  };

  const copyPassword = () => {
    if (newCred) {
      navigator.clipboard.writeText(`Username: ${newCred.username}\nPassword: ${newCred.temp_password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-lux/10 border border-lux/20 text-lux">
            <Users className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-frost">Staff Management</h1>
            <p className="text-sm text-slate-dim">Cashiers, kitchen staff, managers aur riders create aur manage karein.</p>
          </div>
        </div>
        <Button variant="ghost"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lux hover:bg-lux/90 text-console-on-primary font-bold text-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Staff
        </Button>
      </div>

      {/* Temp Password Banner — shown once after creation */}
      {newCred && (
        <div className="bg-amber-lux/10 border border-amber-lux/30 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-lux shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-lux mb-2">
                ⚠️ Temporary Password — ek baar dikhaya jata hai!
              </p>
              <div className="flex items-center gap-3 bg-panel rounded-xl px-4 py-3 border border-amber-lux/20">
                <div className="flex-1 font-mono text-sm">
                  <span className="text-slate-dim">Username: </span>
                  <span className="text-frost">{newCred.username}</span>
                  <br />
                  <span className="text-slate-dim">Password: </span>
                  <span className="text-amber-lux tracking-wider">
                    {showPass ? newCred.temp_password : "••••••••"}
                  </span>
                </div>
                <Button variant="ghost" onClick={() => setShowPass(!showPass)} className="text-slate-dim hover:text-frost">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" onClick={copyPassword} className="text-slate-dim hover:text-amber-lux">
                  {copied ? <Check className="w-4 h-4 text-jade" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-slate-dim mt-2">Staff member pehli login par password change karne par majboor hoga.</p>
            </div>
            <Button variant="ghost" onClick={() => setNewCred(null)} className="text-slate-dim hover:text-frost text-lg font-bold">&times;</Button>
          </div>
        </div>
      )}

      {/* Add Staff Form */}
      {showForm && (
        <Panel>
          <h2 className="text-base font-bold text-frost mb-5">New Staff Member</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-xs font-bold text-slate-dim mb-1.5">Full Name</label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Hamza Khan"
                className="w-full bg-panel border border-line text-frost rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-lux/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-dim mb-1.5">Phone (will be username)</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 03001234567"
                className="w-full bg-panel border border-line text-frost rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-lux/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-dim mb-1.5">Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full bg-panel border border-line text-frost rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-lux/50"
              >
                <option value="kitchen">Kitchen Staff</option>
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
                <option value="rider">Rider</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost"
              onClick={handleCreate}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lux hover:bg-lux/90 text-console-on-primary font-bold text-sm transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Create Account
            </Button>
            <Button variant="ghost"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl text-slate-dim hover:text-frost border border-line text-sm transition-colors"
            >
              Cancel
            </Button>
          </div>
        </Panel>
      )}

      {/* Staff Table */}
      <Panel>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-dim gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-lux" />
            <span>Loading staff...</span>
          </div>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-dim gap-3">
            <Users className="w-10 h-10 opacity-30" />
            <p className="text-sm">Koi staff member nahi mila. Upar se naiya staff add karein.</p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-slate-dim text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Phone</th>
                  <th className="text-left py-3 px-4">Role</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Branch</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id} className="border-b border-line hover:bg-ink transition-colors">
                    <td className="py-3 px-4 font-medium text-frost">{s.full_name || s.username}</td>
                    <td className="py-3 px-4 font-mono text-mist">{s.phone || s.username}</td>
                    <td className="py-3 px-4"><RoleBadge role={s.role} /></td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${s.is_active ? "text-jade bg-jade/10" : "text-ruby bg-ruby/10"}`}>
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-dim">{s.branch_name || "—"}</td>
                    <td className="py-3 px-4 text-right">
                      {s.is_active && !["owner", "admin"].includes(s.role) && (
                        <Button variant="ghost"
                          onClick={() => handleDeactivate(s.id, s.full_name)}
                          className="p-1.5 rounded-lg text-slate-dim hover:text-ruby hover:bg-ruby/10 transition-colors"
                          title="Deactivate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
