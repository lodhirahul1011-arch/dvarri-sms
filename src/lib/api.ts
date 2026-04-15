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
      } as Record<string, string>,
    };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();

  if (!supabaseUrl) {
    throw new Error(
      "Missing VITE_SUPABASE_URL. Add it before running or deploying the frontend."
    );
  }

  return {
    baseUrl: `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/delivery-api`,
    headers: {
      "Content-Type": "application/json",
    } as Record<string, string>,
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
        "delivery-api Edge Function current Supabase project me deployed nahi hai, ya request path function tak sahi nahi pahunch raha."
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

async function request<T>(path: string, options: RequestInit, fallbackError: string): Promise<T> {
  const { baseUrl, headers } = getApiConfig();

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Network error: ${error.message}`
        : "Network error while calling delivery API"
    );
  }

  const json = await parseJsonSafely(res);

  if (!res.ok) {
    throw parseApiError(json, fallbackError);
  }

  return json as T;
}

export async function getNumbers(): Promise<PhoneNumber[]> {
  const json = await request<{ data?: PhoneNumber[] }>(
    "/numbers",
    { method: "GET" },
    "Failed to fetch numbers"
  );

  return json?.data || [];
}

export async function saveNumber(number: string, label?: string): Promise<PhoneNumber> {
  const json = await request<{ data: PhoneNumber }>(
    "/numbers",
    {
      method: "POST",
      body: JSON.stringify({ number, label }),
    },
    "Failed to save number"
  );

  return json.data;
}

export async function deleteNumber(id: string): Promise<void> {
  await request<{ success?: boolean }>(
    `/numbers/${id}`,
    { method: "DELETE" },
    "Failed to delete number"
  );
}

export async function sendSms(phoneNumber: string, buttonLabel: string): Promise<SendResult> {
  return await request<SendResult>(
    "/send-sms",
    {
      method: "POST",
      body: JSON.stringify({
        phone_number: phoneNumber,
        button_label: buttonLabel,
      }),
    },
    "Failed to send SMS"
  );
}

export async function getLogs(): Promise<SmsLog[]> {
  const json = await request<{ data?: SmsLog[] }>(
    "/logs",
    { method: "GET" },
    "Failed to fetch logs"
  );

  return json?.data || [];
}

export async function clearLogs(): Promise<void> {
  await request<{ success?: boolean }>(
    "/logs",
    { method: "DELETE" },
    "Failed to clear logs"
  );
}
