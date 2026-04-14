import { useState } from "react";
import { Truck, Package, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import type { SmsLog } from "../types";
import { sendSms } from "../lib/api";
import { getSmsFailureMessage } from "../lib/smsError";

const DELIVERY_BUTTONS = [
  { label: "Delivery 1", color: "blue" },
  { label: "Delivery 2", color: "teal" },
  { label: "Delivery 3", color: "orange" },
  { label: "Delivery 4", color: "green" },
  { label: "Delivery 5", color: "rose" },
];

const colorMap: Record<string, { bg: string; hover: string; ring: string; icon: string; badge: string }> = {
  blue:   { bg: "bg-blue-600",   hover: "hover:bg-blue-700",   ring: "focus:ring-blue-400",   icon: "text-blue-100",  badge: "bg-blue-100 text-blue-700"  },
  teal:   { bg: "bg-teal-600",   hover: "hover:bg-teal-700",   ring: "focus:ring-teal-400",   icon: "text-teal-100",  badge: "bg-teal-100 text-teal-700"  },
  orange: { bg: "bg-orange-500", hover: "hover:bg-orange-600", ring: "focus:ring-orange-400", icon: "text-orange-100",badge: "bg-orange-100 text-orange-700"},
  green:  { bg: "bg-green-600",  hover: "hover:bg-green-700",  ring: "focus:ring-green-400",  icon: "text-green-100", badge: "bg-green-100 text-green-700" },
  rose:   { bg: "bg-rose-600",   hover: "hover:bg-rose-700",   ring: "focus:ring-rose-400",   icon: "text-rose-100",  badge: "bg-rose-100 text-rose-700"  },
};

interface Props {
  activePhone: string | null;
  onSmsSent: (log: SmsLog) => void;
}

interface ButtonState {
  loading: boolean;
  result: "success" | "failed" | null;
  lastOtp: string;
  lastOrder: string;
}

export default function DeliveryButtons({ activePhone, onSmsSent }: Props) {
  const [states, setStates] = useState<Record<string, ButtonState>>(
    Object.fromEntries(DELIVERY_BUTTONS.map((b) => [b.label, { loading: false, result: null, lastOtp: "", lastOrder: "" }]))
  );
  const [globalError, setGlobalError] = useState("");

  const handleClick = async (label: string) => {
    if (!activePhone) {
      setGlobalError("Please save a phone number first");
      return;
    }
    setGlobalError("");
    setStates((prev) => ({ ...prev, [label]: { ...prev[label], loading: true, result: null } }));

    try {
      const result = await sendSms(activePhone, label);
      const failureMessage = result.success ? "" : getSmsFailureMessage(result.data.api_response) || "SMS request failed";

      setStates((prev) => ({
        ...prev,
        [label]: {
          loading: false,
          result: result.success ? "success" : "failed",
          lastOtp: result.data.otp,
          lastOrder: result.data.order_id,
        },
      }));
      setGlobalError(failureMessage);
      onSmsSent(result.data);
      setTimeout(() => {
        setStates((prev) => ({ ...prev, [label]: { ...prev[label], result: null } }));
      }, 4000);
    } catch (e) {
      setStates((prev) => ({ ...prev, [label]: { loading: false, result: "failed", lastOtp: "", lastOrder: "" } }));
      setGlobalError(e instanceof Error ? e.message : "Failed to send SMS");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
          <Truck className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Send Delivery SMS</h2>
          <p className="text-xs text-gray-500">Click a button to generate & send a delivery notification</p>
        </div>
      </div>

      {globalError && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span className="text-xs text-red-600">{globalError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {DELIVERY_BUTTONS.map((btn) => {
          const state = states[btn.label];
          const c = colorMap[btn.color];

          return (
            <button
              key={btn.label}
              onClick={() => handleClick(btn.label)}
              disabled={state.loading || !activePhone}
              className={`
                relative flex flex-col items-center gap-2 py-5 px-3 rounded-2xl
                text-white font-semibold text-sm
                transition-all duration-150 active:scale-95
                focus:outline-none focus:ring-2 focus:ring-offset-2 ${c.ring}
                disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                ${c.bg} ${c.hover}
              `}
            >
              <div className="relative">
                {state.loading ? (
                  <Loader2 className={`w-6 h-6 ${c.icon} animate-spin`} />
                ) : state.result === "success" ? (
                  <CheckCircle className="w-6 h-6 text-white" />
                ) : state.result === "failed" ? (
                  <AlertCircle className="w-6 h-6 text-white" />
                ) : (
                  <Package className={`w-6 h-6 ${c.icon}`} />
                )}
              </div>

              <span>{btn.label}</span>

              {state.result === "success" && state.lastOtp && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/20`}>
                  OTP: {state.lastOtp}
                </span>
              )}
              {state.result === "failed" && (
                <span className="text-xs text-white/80">Failed</span>
              )}
              {state.loading && (
                <span className="text-xs text-white/80">Sending...</span>
              )}
            </button>
          );
        })}
      </div>

      {!activePhone && (
        <p className="mt-4 text-xs text-center text-gray-400">
          Save a phone number above to enable delivery buttons
        </p>
      )}
    </div>
  );
}
