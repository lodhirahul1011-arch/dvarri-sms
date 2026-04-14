export function getSmsFailureMessage(apiResponse: unknown): string | null {
  if (!apiResponse) return null;

  if (typeof apiResponse === "string") {
    return apiResponse;
  }

  if (typeof apiResponse !== "object") {
    return null;
  }

  const response = apiResponse as Record<string, unknown>;
  const body =
    response.body && typeof response.body === "object"
      ? (response.body as Record<string, unknown>)
      : null;
  const error =
    typeof response.error === "string" ? response.error :
    typeof response.message === "string" ? response.message :
    typeof response.description === "string" ? response.description :
    typeof body?.error === "string" ? body.error :
    typeof body?.message === "string" ? body.message :
    typeof body?.description === "string" ? body.description :
    typeof response.body === "string" ? response.body :
    null;

  if (!error) {
    return null;
  }

  if (error.includes("SMS credentials not configured")) {
    return "Supabase Edge Function me SMS secrets missing hain. `SMS_API_KEY`, `SMS_SENDER_ID`, `SMS_TEMPLATE_ID`, aur `SMS_BASE_URL` Supabase secrets me set karo.";
  }

  if (error.includes("FAST2SMS_API_KEY not configured")) {
    return "Supabase Edge Function me legacy `FAST2SMS_API_KEY` secret missing hai.";
  }

  return error;
}
