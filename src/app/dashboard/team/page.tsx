"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Users, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { confirmDanger, toastSuccess, toastError } from "@/lib/swal";
import { isHotelType, type StaffMember } from "@/types";

export default function TeamPage() {
  const { restaurant, role, loading } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ displayName: "", email: "", password: "" });
  const [editingTables, setEditingTables] = useState<string | null>(null);
  const [tablesInput, setTablesInput] = useState("");
  const [editingRooms, setEditingRooms] = useState<string | null>(null);
  const [roomsInput, setRoomsInput] = useState("");
  const isHotel = isHotelType(restaurant?.type);
  const showTables = restaurant?.type === "restaurant" || restaurant?.type === "both";
  const showRooms = isHotel;

  const fetchStaff = useCallback(async () => {
    const res = await fetch("/api/staff");
    const json = await res.json();
    if (json.ok) setStaff(json.staff);
  }, []);

  useEffect(() => {
    if (restaurant) fetchStaff();
  }, [restaurant, fetchStaff]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <span className="w-5 h-5 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
      </main>
    );
  }

  if (role === "waiter") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
        <p className="text-stone-500">Accès réservé au propriétaire.</p>
      </main>
    );
  }

  const waitersAllowed = restaurant?.isPartner
    || (restaurant?.featureOverrides as Record<string, unknown>)?.waiters === true
    || (restaurant?.plan !== "starter");

  if (restaurant && !waitersAllowed) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
        <div className="text-center max-w-md">
          <Users className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-stone-800 mb-2">
            Gestion des serveurs
          </h2>
          <p className="text-stone-500 text-sm mb-4">
            La gestion des serveurs est disponible à partir du plan Pro.
            Contactez-nous sur WhatsApp pour passer au plan supérieur.
          </p>
          <a
            href="https://wa.me/2250575343846?text=Bonjour%2C%20je%20souhaite%20passer%20au%20plan%20Pro."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#722F37] text-white rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-[#5a2530] transition-colors"
          >
            Passer au plan Pro
          </a>
        </div>
      </main>
    );
  }

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.ok) {
        setStaff((prev) => [...prev, json.waiter]);
        setForm({ displayName: "", email: "", password: "" });
        setShowAdd(false);
        void toastSuccess("Serveur créé !");
      } else {
        void toastError(json.error);
      }
    } catch {
      void toastError("Erreur réseau");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (w: StaffMember) => {
    const ok = await confirmDanger({
      title: `Supprimer ${w.displayName} ?`,
      text: "Son compte et ses assignations seront supprimés définitivement.",
      confirmText: "Supprimer",
    });
    if (!ok) return;
    const res = await fetch("/api/staff", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waiterId: w.id }),
    });
    const json = await res.json();
    if (json.ok) {
      setStaff((prev) => prev.filter((s) => s.id !== w.id));
      void toastSuccess("Serveur supprimé");
    } else {
      void toastError(json.error);
    }
  };

  const handleSaveTables = async (waiterId: string) => {
    const tables = tablesInput
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    const res = await fetch("/api/staff/tables", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waiterId, tables }),
    });
    const json = await res.json();
    if (json.ok) {
      setStaff((prev) =>
        prev.map((s) =>
          s.id === waiterId ? { ...s, assignedTables: tables } : s
        )
      );
      setEditingTables(null);
      void toastSuccess("Tables assignées !");
    } else {
      void toastError(json.error);
    }
  };

  const handleSaveRooms = async (waiterId: string) => {
    const rooms = roomsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch("/api/staff/tables", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waiterId, rooms }),
    });
    const json = await res.json();
    if (json.ok) {
      setStaff((prev) =>
        prev.map((s) =>
          s.id === waiterId ? { ...s, assignedRooms: rooms } : s
        )
      );
      setEditingRooms(null);
      void toastSuccess("Chambres assignées !");
    } else {
      void toastError(json.error);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 pb-20 md:pb-0">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
              Équipe
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              {isHotel ? "Gérez votre staff et leurs chambres" : "Gérez vos serveurs et leurs zones de tables"}
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-[#722F37] text-white rounded-full px-4 py-2.5 text-sm font-semibold hover:bg-[#5a2530] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>

        {/* Modal ajout */}
        {showAdd && (
          <div className="bg-white rounded-2xl border border-stone-200 p-5 mb-6 animate-fade-in-up shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-stone-900">Nouveau serveur</h3>
              <button onClick={() => setShowAdd(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Nom</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="Awa Koné"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-[#722F37] focus:outline-none focus:ring-2 focus:ring-[#722F37]/10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="awa@restaurant.com"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-[#722F37] focus:outline-none focus:ring-2 focus:ring-[#722F37]/10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Mot de passe</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 6 caractères"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-[#722F37] focus:outline-none focus:ring-2 focus:ring-[#722F37]/10"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={creating || !form.displayName || !form.email || !form.password}
                className="w-full bg-[#722F37] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#5a2530] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Créer le compte
              </button>
            </div>
          </div>
        )}

        {/* Liste */}
        {staff.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-5">
              <Users className="w-10 h-10 text-stone-400" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-1">Aucun serveur</h3>
            <p className="text-sm text-stone-500 max-w-xs mx-auto">
              Ajoutez vos serveurs pour qu'ils reçoivent les notifications de commande sur leur téléphone.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {staff.map((w) => (
              <div key={w.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm animate-fade-in-up">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#C8963E] to-[#a07832] flex items-center justify-center text-stone-950 font-bold text-lg">
                      {w.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-stone-900">{w.displayName}</div>
                      <div className="text-xs text-stone-500">{w.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(w)}
                    className="text-stone-400 hover:text-red-600 transition-colors p-1"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {showTables && (
                  <div className="mt-4 pt-3 border-t border-stone-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Tables assignées
                      </span>
                      {editingTables !== w.id && (
                        <button
                          onClick={() => {
                            setEditingTables(w.id);
                            setTablesInput(w.assignedTables.join(", "));
                          }}
                          className="text-xs text-stone-600 hover:text-stone-900 underline underline-offset-2"
                        >
                          Modifier
                        </button>
                      )}
                    </div>

                    {editingTables === w.id ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={tablesInput}
                          onChange={(e) => setTablesInput(e.target.value)}
                          placeholder="1, 2, 3, 4, 5"
                          className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm focus:border-[#722F37] focus:outline-none focus:ring-2 focus:ring-[#722F37]/10"
                        />
                        <button
                          onClick={() => handleSaveTables(w.id)}
                          className="bg-[#722F37] text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-[#5a2530] transition-colors"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setEditingTables(null)}
                          className="text-stone-400 hover:text-stone-700 px-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {w.assignedTables.length === 0 ? (
                          <span className="text-xs text-stone-400 italic">Aucune table assignée</span>
                        ) : (
                          w.assignedTables.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-stone-100 text-stone-700 text-sm font-semibold"
                            >
                              {t}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {showRooms && (
                  <div className="mt-4 pt-3 border-t border-stone-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Chambres assignées
                      </span>
                      {editingRooms !== w.id && (
                        <button
                          onClick={() => {
                            setEditingRooms(w.id);
                            setRoomsInput(w.assignedRooms.join(", "));
                          }}
                          className="text-xs text-stone-600 hover:text-stone-900 underline underline-offset-2"
                        >
                          Modifier
                        </button>
                      )}
                    </div>

                    {editingRooms === w.id ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={roomsInput}
                          onChange={(e) => setRoomsInput(e.target.value)}
                          placeholder="101, Suite Royale, Cocotier"
                          className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm focus:border-[#722F37] focus:outline-none focus:ring-2 focus:ring-[#722F37]/10"
                        />
                        <button
                          onClick={() => handleSaveRooms(w.id)}
                          className="bg-[#722F37] text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-[#5a2530] transition-colors"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setEditingRooms(null)}
                          className="text-stone-400 hover:text-stone-700 px-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {w.assignedRooms.length === 0 ? (
                          <span className="text-xs text-stone-400 italic">Aucune chambre assignée</span>
                        ) : (
                          w.assignedRooms.map((r) => (
                            <span
                              key={r}
                              className="inline-flex items-center justify-center px-3 h-8 rounded-lg bg-stone-100 text-stone-700 text-sm font-semibold"
                            >
                              {r}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
