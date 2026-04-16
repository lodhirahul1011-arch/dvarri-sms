import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const app = new Hono();

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
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
  return `Dvaarikart:Your order ${orderId} (AWB: ${awb}) is out for delivery. Open Box Delivery OTP: ${otp} valid till ${time} today. Please share OTP after checking the product condition. Delivery Partner: Dvaarikart`;
}

async function sendSMS(phone: string, message: string): Promise<{ success: boolean; response: unknown }> {
  const apiKey = Deno.env.get("SMS_API_KEY");
  const senderId = Deno.env.get("SMS_SENDER_ID");
  const templateId = Deno.env.get("SMS_TEMPLATE_ID");
  const baseUrl = Deno.env.get("SMS_BASE_URL");

  if (!apiKey || !senderId || !templateId || !baseUrl) {
    return { success: false, response: { error: "SMS credentials not configured" } };
  }

  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      senderID: senderId,
      message: message,
      mobilenumber: phone,
      templateID: templateId,
    });

    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      method: "GET",
    });

    const text = await res.text();
    const success = res.ok && !text.includes("error") && !text.includes("Error");
    return { success, response: { status: res.status, body: text } };
  } catch (err) {
    return { success: false, response: { error: String(err) } };
  }
}

app.options("*", (c) => {
  return new Response(null, { status: 200, headers: corsHeaders });
});

app.get("/delivery-api/numbers", async (c) => {
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

app.post("/delivery-api/numbers", async (c) => {
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

app.delete("/delivery-api/numbers/:id", async (c) => {
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

app.post("/delivery-api/send-sms", async (c) => {
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

app.get("/delivery-api/logs", async (c) => {
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

app.delete("/delivery-api/logs", async (c) => {
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
