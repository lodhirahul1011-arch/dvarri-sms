import type { PhoneNumber } from "../types";

const RECIPIENT_STORAGE_KEY = "dvaarikart-active-recipient";

interface StoredRecipient {
  number: string;
  label: string;
  saved_at: string;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getStoredRecipient(): PhoneNumber | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(RECIPIENT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredRecipient;
    if (!parsed.number) {
      return null;
    }

    return {
      id: "local-recipient",
      number: parsed.number,
      label: parsed.label || "",
      is_active: true,
      created_at: parsed.saved_at || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveStoredRecipient(number: string, label = ""): PhoneNumber {
  const savedAt = new Date().toISOString();
  const payload: StoredRecipient = {
    number,
    label,
    saved_at: savedAt,
  };

  if (canUseStorage()) {
    window.localStorage.setItem(RECIPIENT_STORAGE_KEY, JSON.stringify(payload));
  }

  return {
    id: "local-recipient",
    number,
    label,
    is_active: true,
    created_at: savedAt,
  };
}

export function clearStoredRecipient() {
  if (canUseStorage()) {
    window.localStorage.removeItem(RECIPIENT_STORAGE_KEY);
  }
}
