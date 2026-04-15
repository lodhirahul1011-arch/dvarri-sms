import { useState, useEffect, useCallback } from "react";
import { Zap } from "lucide-react";
import PhoneInput from "./components/PhoneInput";
import DeliveryButtons from "./components/DeliveryButtons";
import SmsLogTable from "./components/SmsLogTable";
import type { PhoneNumber, SmsLog } from "./types";
import { getLogs } from "./lib/api";
import { getStoredRecipient } from "./lib/recipientStorage";

export default function App() {
  const [activeNumber, setActiveNumber] = useState<PhoneNumber | null>(null);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const data = await getLogs();
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    setActiveNumber(getStoredRecipient());
    fetchLogs();
  }, [fetchLogs]);

  const handleSaved = (n: PhoneNumber) => setActiveNumber(n);

  const handleDeleted = (id: string) => {
    if (activeNumber?.id === id) setActiveNumber(null);
  };

  const handleSmsSent = (log: SmsLog) => {
    setLogs((prev) => [log, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">Dvaarikart SMS Tool</h1>
            <p className="text-xs text-gray-500">Open Box Delivery Notification</p>
          </div>
          {activeNumber && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-green-700">+91 {activeNumber.number}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <PhoneInput
          activeNumber={activeNumber}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />

        <DeliveryButtons
          activePhone={activeNumber?.number || null}
          onSmsSent={handleSmsSent}
        />

        <SmsLogTable
          logs={logs}
          loading={logsLoading}
          onRefresh={fetchLogs}
        />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">SMS Template Preview</p>
          <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs leading-relaxed text-green-400 whitespace-pre-wrap">
{`Dvaarikart:Your order#ORDER_ID#(AWB:#AWB#) is out for delivery. Open Box Delivery OTP:#OTP#valid till#TIME#today. Please share OTP after checking the product condition. Delivery Partner: Dvaarikart - GRAHNETRA AI LABS`}
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { var: "#ORDER_ID#", eg: "OD55564463112" },
              { var: "#AWB#", eg: "FMPP84455456562" },
              { var: "#OTP#", eg: "8446 or 844663" },
              { var: "#TIME#", eg: "11 PM" },
            ].map((v) => (
              <div key={v.var} className="flex flex-col gap-0.5 px-3 py-2 bg-gray-50 rounded-lg">
                <span className="text-xs font-mono text-blue-600 font-medium">{v.var}</span>
                <span className="text-xs text-gray-500">{v.eg}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
