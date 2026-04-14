import { randomUUID } from 'node:crypto';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

interface DevSmsLog {
  id: string;
  phone_number: string;
  button_label: string;
  order_id: string;
  awb: string;
  otp: string;
  time_slot: string;
  message_text: string;
  status: 'sent' | 'failed';
  api_response: unknown;
  created_at: string;
}

function createDevSmsPlugin(env: Record<string, string>) {
  const logs: DevSmsLog[] = [];
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  };

  const generateDigits = (length: number) =>
    Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');

  const generateOrderId = () => `OD${generateDigits(11)}`;
  const generateAwb = () => `FMPP${generateDigits(11)}`;
  const generateOtp = () => generateDigits(Math.random() > 0.5 ? 6 : 4);
  const generateTimeSlot = () => {
    const times = ['9 AM', '11 AM', '1 PM', '3 PM', '5 PM', '7 PM', '9 PM', '11 PM'];
    return times[Math.floor(Math.random() * times.length)];
  };
  const normalizeSmsProviderResponse = (status: number, text: string) => {
    let body: unknown = text;

    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    const parsed = body && typeof body === 'object' ? body as Record<string, unknown> : null;
    const providerFailed =
      parsed?.status === false ||
      parsed?.status === 'false' ||
      parsed?.success === false ||
      parsed?.success === 'false';

    const providerMessage =
      typeof parsed?.description === 'string' ? parsed.description :
      typeof parsed?.message === 'string' ? parsed.message :
      typeof parsed?.error === 'string' ? parsed.error :
      null;

    const success =
      status >= 200 &&
      status < 300 &&
      !providerFailed &&
      !text.toLowerCase().includes('error');

    return {
      success,
      response: {
        status,
        body,
        ...(success ? {} : { error: providerMessage || text }),
      },
    };
  };

  const readJsonBody = async (req: NodeJS.ReadableStream) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    return raw ? JSON.parse(raw) : {};
  };

  const sendJson = (res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body?: string) => void }, statusCode: number, payload: unknown) => {
    res.statusCode = statusCode;
    Object.entries(corsHeaders).forEach(([name, value]) => res.setHeader(name, value));
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
  };

  return {
    name: 'local-sms-dev-api',
    configureServer(server: { middlewares: { use: (handler: (req: { method?: string; url?: string }, res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body?: string) => void }, next: () => void) => void | Promise<void>) => void } }) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        if (!url.startsWith('/__dev_api__/delivery-api')) {
          next();
          return;
        }

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          Object.entries(corsHeaders).forEach(([name, value]) => res.setHeader(name, value));
          res.end();
          return;
        }

        if (req.method === 'GET' && url === '/__dev_api__/delivery-api/logs') {
          sendJson(res, 200, { data: logs });
          return;
        }

        if (req.method === 'DELETE' && url === '/__dev_api__/delivery-api/logs') {
          logs.length = 0;
          sendJson(res, 200, { success: true });
          return;
        }

        if (req.method === 'POST' && url === '/__dev_api__/delivery-api/send-sms') {
          try {
            const body = await readJsonBody(req as unknown as NodeJS.ReadableStream) as {
              phone_number?: string;
              button_label?: string;
            };
            const phoneNumber = body.phone_number?.trim();
            const buttonLabel = body.button_label?.trim() || 'Delivery';

            if (!phoneNumber) {
              sendJson(res, 400, { error: 'Phone number is required' });
              return;
            }

            const apiKey = env.SMS_API_KEY || env.FAST2SMS_API_KEY;
            const senderId = env.SMS_SENDER_ID;
            const templateId = env.SMS_TEMPLATE_ID;
            const baseUrl = env.SMS_BASE_URL;

            if (!apiKey || !senderId || !templateId || !baseUrl) {
              sendJson(res, 500, {
                error: 'Missing SMS_API_KEY, SMS_SENDER_ID, SMS_TEMPLATE_ID, or SMS_BASE_URL in local .env',
              });
              return;
            }

            const orderId = generateOrderId();
            const awb = generateAwb();
            const otp = generateOtp();
            const timeSlot = generateTimeSlot();
            const message = `Dvaarikart:Your order ${orderId} (AWB: ${awb}) is out for delivery. Open Box Delivery OTP: ${otp} valid till ${timeSlot} today. Please share OTP after checking the product condition. Delivery Partner: Dvaarikart`;

            const params = new URLSearchParams({
              apikey: apiKey,
              senderID: senderId,
              message,
              mobilenumber: phoneNumber,
              templateID: templateId,
            });

            let apiResponse: unknown;
            let success = false;

            try {
              const smsResponse = await fetch(`${baseUrl}?${params.toString()}`, { method: 'GET' });
              const responseText = await smsResponse.text();
              const normalized = normalizeSmsProviderResponse(smsResponse.status, responseText);
              apiResponse = normalized.response;
              success = normalized.success;
            } catch (error) {
              apiResponse = { error: error instanceof Error ? error.message : String(error) };
            }

            const log: DevSmsLog = {
              id: randomUUID(),
              phone_number: phoneNumber,
              button_label: buttonLabel,
              order_id: orderId,
              awb,
              otp,
              time_slot: timeSlot,
              message_text: message,
              status: success ? 'sent' : 'failed',
              api_response: apiResponse,
              created_at: new Date().toISOString(),
            };

            logs.unshift(log);
            sendJson(res, 200, {
              success,
              data: {
                ...log,
                generated: { orderId, awb, otp, timeSlot, message },
              },
            });
            return;
          } catch (error) {
            sendJson(res, 500, {
              error: error instanceof Error ? error.message : 'Failed to send SMS',
            });
            return;
          }
        }

        sendJson(res, 404, { code: 'NOT_FOUND', message: 'Requested dev endpoint was not found' });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), command === 'serve' ? createDevSmsPlugin(env) : null],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
