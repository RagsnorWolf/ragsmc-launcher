import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "../components/Toasts";
import type { AccountEntry } from "../types";
import { Plus, Trash2, Check } from "lucide-react";

interface AccountViewProps {
  username: string;
  onSave: (name: string) => void;
  accounts: AccountEntry[];
  onAccountsChange: (accounts: AccountEntry[]) => void;
}

export default function AccountView({ username, onSave, accounts, onAccountsChange }: AccountViewProps) {
  const [name, setName] = useState(username);
  const [saved, setSaved] = useState(false);
  const [newName, setNewName] = useState("");

  const handleSave = () => {
    const clean = name.trim();
    if (!clean) return;
    onSave(clean);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddAccount = async () => {
    const clean = newName.trim();
    if (!clean) return;
    try {
      const entry = await invoke<AccountEntry>("add_account", { username: clean });
      const updated = await invoke<AccountEntry[]>("get_accounts");
      onAccountsChange(updated);
      onSave(entry.username);
      setNewName("");
      toast("success", `Cuenta "${entry.username}" agregada`);
    } catch (e) {
      toast("error", String(e));
    }
  };

  const handleSelectAccount = async (id: string) => {
    try {
      const updated = await invoke<AccountEntry[]>("select_account", { id });
      onAccountsChange(updated);
      const selected = updated.find((a) => a.id === id);
      if (selected) onSave(selected.username);
    } catch (e) {
      toast("error", String(e));
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm("¿Eliminar esta cuenta?")) return;
    try {
      const updated = await invoke<AccountEntry[]>("delete_account", { id });
      onAccountsChange(updated);
      const selected = updated.find((a) => a.selected);
      if (selected) onSave(selected.username);
      toast("success", "Cuenta eliminada");
    } catch (e) {
      toast("error", String(e));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold text-zinc-100 mb-6">Cuentas</h1>

        <div className="rounded-xl border border-white/10 bg-[#141414] p-6 mb-4">
          <h2 className="text-sm font-semibold text-zinc-200 mb-3">Cuenta actual</h2>
          <div className="flex items-center gap-4 mb-4">
            <span className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-xl font-bold flex items-center justify-center">
              {(username || "J").charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="text-base font-semibold text-zinc-100">{username || "Sin nombre"}</p>
              <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                OFFLINE
              </span>
            </div>
          </div>
          <label className="text-xs text-zinc-400 block mb-1.5">Nombre de jugador</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
            placeholder="RagsPlayer"
            spellCheck={false}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500/60 mb-3"
          />
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full h-10 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black text-sm font-bold transition-colors"
          >
            {saved ? "Guardado" : "Guardar nombre"}
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#141414] p-6 mb-4">
          <h2 className="text-sm font-semibold text-zinc-200 mb-3">Agregar cuenta</h2>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddAccount()}
              maxLength={16}
              placeholder="Nombre de jugador"
              spellCheck={false}
              className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500/60"
            />
            <button
              onClick={handleAddAccount}
              disabled={!newName.trim()}
              className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>
        </div>

        {accounts.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-[#141414] p-6">
            <h2 className="text-sm font-semibold text-zinc-200 mb-3">Cuentas ({accounts.length})</h2>
            <div className="space-y-2">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    acc.selected
                      ? "bg-green-500/10 border border-green-500/20"
                      : "bg-[#1a1a1a] border border-white/5 hover:border-white/10"
                  }`}
                >
                  <span className="w-9 h-9 rounded-full bg-zinc-700 text-zinc-200 text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {acc.username.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 truncate">{acc.username}</p>
                    <p className="text-[11px] text-zinc-500">{acc.type === "msa" ? "Microsoft" : "Offline"}</p>
                  </div>
                  {acc.selected ? (
                    <span className="flex items-center gap-1 text-xs text-green-400 font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      Activa
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSelectAccount(acc.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      Seleccionar
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteAccount(acc.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-zinc-600 mt-4">
          Cuentas offline: juegas sin iniciar sesión en Microsoft. Para servidores premium necesitas una cuenta de Microsoft.
        </p>
      </div>
    </div>
  );
}
