import type { PhoneNumber, SmsLog, SendResult } from "../types";

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delivery-api`;
const HEADERS = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

export async function getNumbers(): Promise<PhoneNumber[]> {
  const res = await fetch(`${BASE_URL}/numbers`, { headers: HEADERS });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to fetch numbers");
  return json.data || [];
}

export async function saveNumber(number: string, label?: string): Promise<PhoneNumber> {
  const res = await fetch(`${BASE_URL}/numbers`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ number, label }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to save number");
  return json.data;
}

export async function deleteNumber(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/numbers/${id}`, {
    method: "DELETE",
    headers: HEADERS,
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || "Failed to delete number");
  }
}

export async function sendSms(phoneNumber: string, buttonLabel: string): Promise<SendResult> {
  const res = await fetch(`${BASE_URL}/send-sms`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ phone_number: phoneNumber, button_label: buttonLabel }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to send SMS");
  return json;
}

export async function getLogs(): Promise<SmsLog[]> {
  const res = await fetch(`${BASE_URL}/logs`, { headers: HEADERS });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to fetch logs");
  return json.data || [];
}

export async function clearLogs(): Promise<void> {
  const res = await fetch(`${BASE_URL}/logs`, {
    method: "DELETE",
    headers: HEADERS,
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || "Failed to clear logs");
  }
}
