import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, x-client-info, apikey",
};

const app = new Hono();

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getSupabase() {
  return createClient(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

function getFirstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) return value;
  }
  return undefined;
}

function generateOrderId(): string {
  return "OD" + Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join("");
}

function generateAWB(): string {
  return "FMPP" + Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join("");
}

function generateOTP(): string {
  const length = Math.random() > 0.5 ? 6 : 4;
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

function generateTimeSlot(): string {
  const times = ["9 AM", "11 AM", "1 PM", "3 PM", "5 PM", "7 PM", "9 PM", "11 PM"];
  return times[Math.floor(Math.random() * times.length)];
}

function buildMessage(orderId: string, awb: string, otp: string, time: string): string {
  return `Dvaarikart:Your order${orderId}(AWB:${awb}) is out for delivery. Open Box Delivery OTP:${otp}valid till${time}today. Please share OTP after checking the product condition. Delivery Partner: Dvaarikart - GRAHNETRA AI LABS`;
}

function buildSmsParams(
  baseUrl: string,
  values: {
    apiKey: string;
    senderId: string;
    message: string;
    phone: string;
    templateId: string;
  },
) {
  const params = new URLSearchParams({
    apikey: values.apiKey,
    message: values.message,
  });

  const usesFortiusParams = (() => {
    try {
      return new URL(baseUrl).hostname.toLowerCase().includes("smsfortius.org");
    } catch {
      return false;
    }
  })();

  if (usesFortiusParams) {
    params.set("senderid", values.senderId);
    params.set("templateid", values.templateId);
    params.set("number", values.phone);
    return params;
  }

  params.set("senderID", values.senderId);
  params.set("mobilenumber", values.phone);
  params.set("templateID", values.templateId);
  return params;
}

function normalizeSmsProviderResponse(status: number, text: string) {
  let body: unknown = text;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  const parsed = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const providerFailed =
    parsed?.status === false ||
    parsed?.status === "false" ||
    parsed?.success === false ||
    parsed?.success === "false";

  const providerMessage =
    typeof parsed?.description === "string" ? parsed.description :
    typeof parsed?.message === "string" ? parsed.message :
    typeof parsed?.error === "string" ? parsed.error :
    null;

  const success =
    status >= 200 &&
    status < 300 &&
    !providerFailed &&
    !text.toLowerCase().includes("error");

  return {
    success,
    response: {
      status,
      body,
      ...(success ? {} : { error: providerMessage || text }),
    },
  };
}

async function sendSMS(phone: string, message: string): Promise<{ success: boolean; response: unknown }> {
  const apiKey = getFirstEnv("SMS_API_KEY", "FAST2SMS_API_KEY");
  const senderId = getFirstEnv("SMS_SENDER_ID");
  const templateId = getFirstEnv("SMS_TEMPLATE_ID");
  const baseUrl = getFirstEnv("SMS_BASE_URL");
  const missing: string[] = [];

  if (!apiKey) missing.push("SMS_API_KEY or FAST2SMS_API_KEY");
  if (!senderId) missing.push("SMS_SENDER_ID");
  if (!templateId) missing.push("SMS_TEMPLATE_ID");
  if (!baseUrl) missing.push("SMS_BASE_URL");

  if (missing.length > 0) {
    return {
      success: false,
      response: { error: `SMS credentials not configured: missing ${missing.join(", ")}` },
    };
  }

  try {
    const params = buildSmsParams(baseUrl, {
      apiKey,
      senderId,
      message,
      phone,
      templateId,
    });

    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      method: "GET",
    });

    const text = await res.text();
    return normalizeSmsProviderResponse(res.status, text);
  } catch (err) {
    return { success: false, response: { error: String(err) } };
  }
}

app.options("*", () => {
  return new Response(null, { status: 200, headers: corsHeaders });
});

app.get("/numbers", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("phone_numbers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return c.json({ data }, 200);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.post("/numbers", async (c) => {
  try {
    const body = await c.req.json();
    const { number, label } = body;

    if (!number) {
      return c.json({ error: "Phone number is required" }, 400);
    }

    const supabase = getSupabase();

    await supabase.from("phone_numbers").update({ is_active: false }).eq("is_active", true);

    const { data, error } = await supabase
      .from("phone_numbers")
      .insert({ number, label: label || "", is_active: true })
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 200);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.delete("/numbers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const supabase = getSupabase();
    const { error } = await supabase.from("phone_numbers").delete().eq("id", id);
    if (error) throw error;
    return c.json({ success: true }, 200);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.post("/send-sms", async (c) => {
  try {
    const body = await c.req.json();
    const { phone_number, button_label } = body;

    if (!phone_number) {
      return c.json({ error: "Phone number is required" }, 400);
    }

    const orderId = generateOrderId();
    const awb = generateAWB();
    const otp = generateOTP();
    const timeSlot = generateTimeSlot();
    const message = buildMessage(orderId, awb, otp, timeSlot);

    const smsResult = await sendSMS(phone_number, message);

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("sms_logs")
      .insert({
        phone_number,
        button_label: button_label || "Delivery",
        order_id: orderId,
        awb,
        otp,
        time_slot: timeSlot,
        message_text: message,
        status: smsResult.success ? "sent" : "failed",
        api_response: smsResult.response,
      })
      .select()
      .single();

    if (error) throw error;

    return c.json({
      success: smsResult.success,
      data: {
        ...data,
        generated: { orderId, awb, otp, timeSlot, message },
      },
    }, 200);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/logs", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("sms_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return c.json({ data }, 200);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.delete("/logs", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("sms_logs").delete().neq("id", "");

    if (error) throw error;
    return c.json({ success: true }, 200);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const res = await app.fetch(req);

  const headers = new Headers(res.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));

  return new Response(res.body, {
    status: res.status,
    headers,
  });
});