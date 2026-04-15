import type { PhoneNumber, SmsLog, SendResult } from "../types";

function getApiConfig() {
  const useLocalDevApi =
    import.meta.env.DEV &&
    import.meta.env.VITE_USE_SUPABASE_API !== "true" &&
    typeof window !== "undefined";

  if (useLocalDevApi) {
    return {
      baseUrl: `${window.location.origin}/__dev_api__/delivery-api`,
      headers: {
        "Content-Type": "application/json",
      },
    };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl) {
    throw new Error(
      "Missing VITE_SUPABASE_URL. Add it before running or deploying the frontend."
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      "Missing VITE_SUPABASE_ANON_KEY. Add it before running or deploying the frontend."
    );
  }

  return {
    baseUrl: `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/delivery-api`,
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  };
}

function parseApiError(payload: unknown, fallback: string): Error {
  if (payload && typeof payload === "object") {
    const body = payload as Record<string, unknown>;
    const message =
      typeof body.error === "string"
        ? body.error
        : typeof body.message === "string"
          ? body.message
          : fallback;

    const code = typeof body.code === "string" ? body.code : "";

    if (code === "NOT_FOUND") {
      return new Error(
        "Supabase project me `delivery-api` Edge Function deployed nahi hai. Ya to correct project ref use karo, ya current project par function deploy karo."
      );
    }

    return new Error(message);
  }

  return new Error(fallback);
}

async function parseJsonSafely(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export async function getNumbers(): Promise<PhoneNumber[]> {
  const { baseUrl, headers } = getApiConfig();

  const res = await fetch(`${baseUrl}/numbers`, {
    method: "GET",
    headers,
  });

  const json = await parseJsonSafely(res);
  if (!res.ok) throw parseApiError(json, "Failed to fetch numbers");

  return (json as { data?: PhoneNumber[] })?.data || [];
}

export async function saveNumber(number: string, label?: string): Promise<PhoneNumber> {
  const { baseUrl, headers } = getApiConfig();

  const res = await fetch(`${baseUrl}/numbers`, {
    method: "POST",
    headers,
    body: JSON.stringify({ number, label }),
  });

  const json = await parseJsonSafely(res);
  if (!res.ok) throw parseApiError(json, "Failed to save number");

  return (json as { data: PhoneNumber }).data;
}

export async function deleteNumber(id: string): Promise<void> {
  const { baseUrl, headers } = getApiConfig();

  const res = await fetch(`${baseUrl}/numbers/${id}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const json = await parseJsonSafely(res);
    throw parseApiError(json, "Failed to delete number");
  }
}

export async function sendSms(phoneNumber: string, buttonLabel: string): Promise<SendResult> {
  const { baseUrl, headers } = getApiConfig();

  const res = await fetch(`${baseUrl}/send-sms`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      phone_number: phoneNumber,
      button_label: buttonLabel,
    }),
  });

  const json = await parseJsonSafely(res);
  if (!res.ok) throw parseApiError(json, "Failed to send SMS");

  return json as SendResult;
}

export async function getLogs(): Promise<SmsLog[]> {
  const { baseUrl, headers } = getApiConfig();

  const res = await fetch(`${baseUrl}/logs`, {
    method: "GET",
    headers,
  });

  const json = await parseJsonSafely(res);
  if (!res.ok) throw parseApiError(json, "Failed to fetch logs");

  return (json as { data?: SmsLog[] })?.data || [];
}

export async function clearLogs(): Promise<void> {
  const { baseUrl, headers } = getApiConfig();

  const res = await fetch(`${baseUrl}/logs`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const json = await parseJsonSafely(res);
    throw parseApiError(json, "Failed to clear logs");
  }
}