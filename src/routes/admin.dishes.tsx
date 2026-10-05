import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  UtensilsCrossed,
  Plus,
  Search,
  Check,
  X,
  Edit2,
  Trash2,
  Sparkles,
  Flame,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api/client";
import { invalidateMenuCache } from "@/lib/menu";
import { Field, LuxSearch, Panel, fieldClass } from "@/components/admin/bits";

export const Route = createFileRoute("/admin/dishes")({
  ssr: false,
  component: DishesManagementPage,
});

interface DishSize {
  id?: number;
  size: string;
  price: number;
}

interface DishItem {
  id: number;
  name: string;
  slug?: string;
  category_name?: string;
  category?: number | { id: number; name: string };
  price: number;
  image_url?: string;
  description?: string;
  is_available: boolean;
  is_featured?: boolean;
  is_archived?: boolean;
  heat_level?: string;
  prep_time_minutes?: number;
  sizes?: DishSize[];
}

function DishesManagementPage() {
  const [dishes, setDishes] = useState<DishItem[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "unavailable">("all");

  // Edit / Create Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<DishItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState(1200);
  const [formCategory, setFormCategory] = useState<number | "">("");
  const [formDesc, setFormDesc] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formAvailable, setFormAvailable] = useState(true);
  const [formFeatured, setFormFeatured] = useState(false);
  const [formHeat, setFormHeat] = useState("Mild");
  const [formPrepTime, setFormPrepTime] = useState(25);
  const [saving, setSaving] = useState(false);

  // Load dishes and categories
  const loadData = async () => {
    try {
      setLoading(true);
      const [dishRes, catRes] = await Promise.all([
        api.get<any[]>("/admin/menu/dishes/").catch(() => api.get<any[]>("/menu/dishes/")),
        api.get<any[]>("/admin/menu/categories/").catch(() => api.get<any[]>("/menu/categories/")).catch(() => []),
      ]);

      let loadedCategories: { id: number; name: string; slug: string }[] = [];
      if (Array.isArray(catRes) && catRes.length > 0) {
        loadedCategories = catRes.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug || c.name.toLowerCase().replace(/\s+/g, "-"),
        }));
        setCategories(loadedCategories);
      }

      if (Array.isArray(dishRes)) {
        setDishes(
          dishRes.map((d) => ({
            id: d.id,
            name: d.name,
            slug: d.slug,
            category_name: typeof d.category === "object" ? d.category?.name : d.category_name || "Mains",
            category: typeof d.category === "object" ? d.category?.id : d.category,
            price: Number(d.base_price ?? d.price) || 0,
            image_url: d.image_url || d.image,
            description: d.description || d.desc || "",
            is_available: d.is_available ?? true,
            is_featured: d.is_featured ?? false,
            heat_level: d.heat_label || d.heat_level || d.heat || "Medium",
            prep_time_minutes: d.prep_time_minutes || d.time || 25,
            sizes: d.sizes?.map((s: any) => ({
              id: s.id,
              size: s.size,
              price: Number(s.price),
            })) || [],
          }))
        );
      }
    } catch (err) {
      toast.error("Failed to load menu dishes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Quick toggle availability (In stock vs Sold Out)
  const toggleAvailability = async (dish: DishItem) => {
    const nextState = !dish.is_available;
    // Optimistic update
    setDishes((prev) =>
      prev.map((d) => (d.id === dish.id ? { ...d, is_available: nextState } : d))
    );

    try {
      await api.patch(`/admin/menu/dishes/${dish.id}/`, {
        is_available: nextState,
      });
      invalidateMenuCache();
      toast.success(
        nextState ? `"${dish.name}" is now Available` : `"${dish.name}" marked as Sold Out`,
        {
          description: nextState
            ? "Customers can now order this dish."
            : "Customers will see this dish as unavailable on the menu.",
        }
      );
    } catch {
      // Revert on error
      setDishes((prev) =>
        prev.map((d) => (d.id === dish.id ? { ...d, is_available: !nextState } : d))
      );
      toast.error("Could not update dish availability");
    }
  };

  // Open modal for new dish or edit
  const openEditModal = (dish?: DishItem) => {
    const defaultCatId = categories[0]?.id || "";
    if (dish) {
      const catId = typeof dish.category === "object" ? (dish.category as any)?.id : dish.category;
      setEditingDish(dish);
      setFormName(dish.name);
      setFormPrice(dish.price);
      setFormCategory(catId || defaultCatId);
      setFormDesc(dish.description || "");
      setFormImage(dish.image_url || "");
      setFormAvailable(dish.is_available);
      setFormFeatured(dish.is_featured || false);
      setFormHeat(dish.heat_level || "Medium");
      setFormPrepTime(dish.prep_time_minutes || 25);
    } else {
      setEditingDish(null);
      setFormName("");
      setFormPrice(1200);
      setFormCategory(defaultCatId);
      setFormDesc("");
      setFormImage("");
      setFormAvailable(true);
      setFormFeatured(false);
      setFormHeat("Medium");
      setFormPrepTime(25);
    }
    setModalOpen(true);
  };

  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Dish name is required");
      return;
    }

    setSaving(true);
    const resolvedCat = formCategory !== "" ? Number(formCategory) : (categories[0]?.id || 1);
    const payload: Record<string, any> = {
      name: formName.trim(),
      base_price: Number(formPrice) || 1200,
      price: Number(formPrice) || 1200,
      category: resolvedCat,
      category_id: resolvedCat,
      description: formDesc.trim(),
      image_url: formImage.trim(),
      is_available: formAvailable,
      is_featured: formFeatured,
      heat_label: formHeat,
      heat_level: formHeat,
      prep_time_minutes: Number(formPrepTime) || 25,
    };

    try {
      if (editingDish) {
        await api.patch(`/admin/menu/dishes/${editingDish.id}/`, payload);
        toast.success(`Dish "${formName}" Updated!`);
      } else {
        await api.post("/admin/menu/dishes/", payload);
        toast.success(`Dish "${formName}" Created!`);
      }
      invalidateMenuCache();
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      const errDetail = err?.data ? JSON.stringify(err.data) : (err instanceof Error ? err.message : "Error saving dish.");
      toast.error("Failed to save dish", {
        description: errDetail,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveDish = async (dish: DishItem) => {
    if (!window.confirm(`Are you sure you want to remove "${dish.name}" from the active menu?`)) {
      return;
    }

    try {
      await api.delete(`/admin/menu/dishes/${dish.id}/`);
      invalidateMenuCache();
      setDishes((prev) => prev.filter((d) => d.id !== dish.id));
      toast.success(`Dish "${dish.name}" archived`);
    } catch {
      toast.error("Failed to archive dish");
    }
  };

  // Filtered rows
  const filteredDishes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return dishes.filter((d) => {
      const matchSearch =
        !term ||
        d.name.toLowerCase().includes(term) ||
        (d.category_name && d.category_name.toLowerCase().includes(term));
      const matchCategory =
        categoryFilter === "all" ||
        d.category_name?.toLowerCase() === categoryFilter.toLowerCase();
      const matchAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" && d.is_available) ||
        (availabilityFilter === "unavailable" && !d.is_available);
      return matchSearch && matchCategory && matchAvailability;
    });
  }, [dishes, search, categoryFilter, availabilityFilter]);

  const totalCount = dishes.length;
  const availableCount = dishes.filter((d) => d.is_available).length;
  const soldOutCount = totalCount - availableCount;
  const featuredCount = dishes.filter((d) => d.is_featured).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-lux/70">
            Menu Operations
          </p>
          <h1 className="mt-1 font-hero text-3xl tracking-wide sm:text-4xl text-lux">
            Dishes & Culinary Catalogue
          </h1>
          <p className="mt-1 text-sm text-slate-dim">
            Control live menu pricing, sizing variants, and toggle in-stock availability instantly.
          </p>
        </div>

        <Button variant="ghost"
          type="button"
          onClick={() => openEditModal()}
          className="admin-primary-action"
        >
          <Plus className="h-4 w-4" /> Add New Dish
        </Button>
      </header>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Panel bodyClassName="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-dim">
              Total Dishes
            </span>
            <span className="block font-hero num-lux text-2xl text-frost mt-0.5">{totalCount}</span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lux/10 text-lux border border-lux/20">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
        </Panel>

        <Panel bodyClassName="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-dim">
              Available (In Stock)
            </span>
            <span className="block font-hero num-lux text-2xl text-jade mt-0.5">{availableCount}</span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-jade/10 text-jade border border-jade/20">
            <Check className="h-5 w-5" />
          </div>
        </Panel>

        <Panel bodyClassName="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-dim">
              Sold Out (Off Menu)
            </span>
            <span className="block font-hero num-lux text-2xl text-ruby mt-0.5">{soldOutCount}</span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ruby/10 text-ruby border border-ruby/20">
            <EyeOff className="h-5 w-5" />
          </div>
        </Panel>

        <Panel bodyClassName="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-dim">
              Chef Specials
            </span>
            <span className="block font-hero num-lux text-2xl text-lux mt-0.5">{featuredCount}</span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lux/10 text-lux border border-lux/20">
            <Sparkles className="h-5 w-5" />
          </div>
        </Panel>
      </div>

      {/* Filter / Search Bar */}
      <Panel bodyClassName="p-4">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <Field label="Search Dishes">
            <LuxSearch
              value={search}
              onChange={setSearch}
              placeholder="Search by dish name or category"
              ariaLabel="Search dishes"
            />
          </Field>

          <Field label="Category Filter">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={fieldClass}
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status Filter">
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value as any)}
              className={fieldClass}
            >
              <option value="all">All Dishes</option>
              <option value="available">Available (In Stock)</option>
              <option value="unavailable">Sold Out (Unavailable)</option>
            </select>
          </Field>
        </div>
      </Panel>

      {/* Dish Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-lux">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredDishes.length === 0 ? (
        <Panel bodyClassName="p-12 text-center">
          <UtensilsCrossed className="mx-auto h-10 w-10 text-lux/40" />
          <h3 className="mt-3 text-sm font-bold text-frost">No dishes match your filters</h3>
          <p className="mt-1 text-xs text-slate-dim">
            Try adjusting your search query or reset the category filters.
          </p>
        </Panel>
      ) : (
        <div className="admin-dish-grid grid gap-4">
          {filteredDishes.map((dish) => (
            <motion.div
              key={dish.id}
              layout
              data-available={dish.is_available}
              className="admin-dish-card group relative overflow-hidden"
            >
              {/* Dish Top Image & Badges */}
              <div className="admin-dish-image relative w-full overflow-hidden">
                {dish.image_url ? (
                  <img
                    src={dish.image_url}
                    alt={dish.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-ink text-mist">
                    <UtensilsCrossed className="h-12 w-12" />
                  </div>
                )}
                

                {/* Badges */}
                <div className="admin-dish-badges absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="admin-dish-badge rounded-md px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-lux backdrop-blur-md">
                    {dish.category_name || "Mains"}
                  </span>
                  {dish.is_featured && (
                    <span className="flex items-center gap-1 rounded-full border border-amber-lux/30 bg-panel px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-lux backdrop-blur-md">
                      <Sparkles className="h-3 w-3" /> Special
                    </span>
                  )}
                </div>

                {/* Quick Availability Badge */}
                <div className="admin-dish-stock">
                  <Button variant="ghost"
                    type="button"
                    onClick={() => toggleAvailability(dish)}
                    title={dish.is_available ? "Click to mark as Sold Out" : "Click to mark as Available"}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md transition ${
                      dish.is_available
                        ? "border border-jade/40 bg-jade/20 text-jade hover:bg-jade/30"
                        : "border border-ruby/50 bg-ruby/30 text-ruby hover:bg-ruby/40"
                    }`}
                  >
                    {dish.is_available ? (
                      <>
                        <Check className="h-3 w-3" /> In Stock
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3" /> Sold Out
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-hero text-lg font-bold text-frost group-hover:text-lux transition">
                      {dish.name}
                    </h3>
                    <p className="line-clamp-2 text-xs text-slate-dim mt-0.5">
                      {dish.description || "Authentic specialty cooked over charcoal flame."}
                    </p>
                  </div>
                </div>

                {/* Heat & Time attributes */}
                <div className="flex items-center gap-3 text-[11px] text-mist">
                  <span className="flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5 text-flame" /> {dish.heat_level}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-lux" /> {dish.prep_time_minutes} min
                  </span>
                </div>

                {/* Sizing & Pricing breakdown */}
                <div className="admin-dish-price border border-line bg-ink p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-dim">
                      Base Price
                    </span>
                    <span className="font-hero num-lux text-lg text-lux font-black">
                      Rs {dish.price}
                    </span>
                  </div>
                  {dish.sizes && dish.sizes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 border-t border-line pt-1.5">
                      {dish.sizes.map((s, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-ink px-2 py-0.5 text-[10px] font-mono text-mist"
                        >
                          {s.size}: <strong className="text-lux">Rs {s.price}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="admin-dish-actions flex items-center justify-between pt-1 border-t border-line">
                  <Button variant="ghost"
                    type="button"
                    onClick={() => toggleAvailability(dish)}
                    className="text-[11px] font-black uppercase tracking-wider text-slate-dim hover:text-lux transition"
                  >
                    {dish.is_available ? "Set Sold Out" : "Set Available"}
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost"
                      type="button"
                      onClick={() => openEditModal(dish)}
                      className="rounded-xl border border-lux/20 p-2 text-lux hover:bg-lux/10 transition"
                      title="Edit dish"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost"
                      type="button"
                      onClick={() => handleArchiveDish(dish)}
                      className="rounded-xl border border-ruby/30 p-2 text-ruby hover:bg-ruby/10 transition"
                      title="Archive dish"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit / Create Dish Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 admin-modal-overlay"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="admin-modal relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto p-6"
            >
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lux/20 text-lux border border-lux/30">
                    <UtensilsCrossed className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-hero text-lg font-bold text-lux">
                      {editingDish ? `Edit: ${editingDish.name}` : "Add New Dish"}
                    </h2>
                    <p className="text-xs text-mist">
                      Configure dish pricing, availability, and description.
                    </p>
                  </div>
                </div>
                <Button variant="ghost"
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full p-1.5 text-mist hover:bg-ink hover:text-frost"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <form onSubmit={handleSaveDish} className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-[0.14em] text-lux mb-1">
                      Dish Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Mutton Shinwari Karahi"
                      className="w-full rounded-xl border border-line bg-ink py-2 px-3 text-xs text-frost focus:border-lux focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-[0.14em] text-lux mb-1">
                      Category
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(Number(e.target.value) || "")}
                      className="w-full rounded-xl border border-line bg-ink py-2 px-3 text-xs text-frost focus:border-lux focus:outline-none"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-[0.14em] text-lux mb-1">
                      Base Price (PKR)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-line bg-ink py-2 px-3 text-xs text-frost focus:border-lux focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-[0.14em] text-lux mb-1">
                      Heat Level
                    </label>
                    <select
                      value={formHeat}
                      onChange={(e) => setFormHeat(e.target.value)}
                      className="w-full rounded-xl border border-line bg-ink py-2 px-3 text-xs text-frost focus:border-lux focus:outline-none"
                    >
                      <option value="Mild">Mild</option>
                      <option value="Medium">Medium</option>
                      <option value="Hot">Hot</option>
                      <option value="Extra Hot">Extra Hot</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-[0.14em] text-lux mb-1">
                      Prep Time (min)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={formPrepTime}
                      onChange={(e) => setFormPrepTime(Number(e.target.value) || 25)}
                      className="w-full rounded-xl border border-line bg-ink py-2 px-3 text-xs text-frost focus:border-lux focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.14em] text-lux mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-xl border border-line bg-ink py-2 px-3 text-xs text-frost focus:border-lux focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.14em] text-lux mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Authentic charcoal-cooked karahi with black pepper and fresh green chilies."
                    className="w-full rounded-xl border border-line bg-ink p-2.5 text-xs text-frost focus:border-lux focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAvailable}
                      onChange={(e) => setFormAvailable(e.target.checked)}
                      className="h-4 w-4 rounded border-lux text-flame focus:ring-lux"
                    />
                    <span className="text-xs font-bold text-frost">Available (In Stock)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formFeatured}
                      onChange={(e) => setFormFeatured(e.target.checked)}
                      className="h-4 w-4 rounded border-lux text-flame focus:ring-lux"
                    />
                    <span className="text-xs font-bold text-lux">Chef Special / Featured</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <Button variant="ghost"
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl border border-line px-4 py-2 font-display text-xs font-black uppercase tracking-wider text-mist hover:bg-ink"
                  >
                    Cancel
                  </Button>
                  <Button variant="ghost"
                    type="submit"
                    disabled={saving}
                    className="admin-primary-action"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? "Saving…" : "Save Dish"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
