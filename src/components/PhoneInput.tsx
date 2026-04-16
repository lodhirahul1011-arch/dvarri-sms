import { useState } from "react";
import { Phone, Save, Trash2, CheckCircle } from "lucide-react";
import type { PhoneNumber } from "../types";
import { saveNumber, deleteNumber } from "../lib/api";

interface Props {
  activeNumber: PhoneNumber | null;
  onSaved: (n: PhoneNumber) => void;
  onDeleted: (id: string) => void;
}

export default function PhoneInput({ activeNumber, onSaved, onDeleted }: Props) {
  const [input, setInput] = useState(activeNumber?.number || "");
  const [label, setLabel] = useState(activeNumber?.label || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    const clean = input.trim().replace(/\D/g, "");
    if (clean.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const num = await saveNumber(clean, label);
      onSaved(num);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeNumber) return;
    setDeleting(true);
    try {
      await deleteNumber(activeNumber.id);
      onDeleted(activeNumber.id);
      setInput("");
      setLabel("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <Phone className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Recipient Number</h2>
          <p className="text-xs text-gray-500">Save mobile number to receive delivery SMS</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">+91</span>
            <input
              type="tel"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError("");
              }}
              placeholder="98765 43210"
              maxLength={12}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional)"
            className="w-40 px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-xl transition-all duration-150 active:scale-95"
          >
            {saved ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Number"}
              </>
            )}
          </button>
          {activeNumber && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-3 border border-red-100 hover:bg-red-50 disabled:opacity-50 text-red-500 rounded-xl transition-all duration-150 active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {activeNumber && (
        <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-700 font-medium">
            Active: +91 {activeNumber.number}
            {activeNumber.label && <span className="text-green-500 ml-1">({activeNumber.label})</span>}
          </span>
        </div>
      )}
    </div>
  );
}
