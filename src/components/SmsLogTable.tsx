import { useState } from "react";
import { RefreshCw, MessageSquare, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";
import type { SmsLog } from "../types";
import { clearLogs } from "../lib/api";

interface Props {
  logs: SmsLog[];
  loading: boolean;
  onRefresh: () => void;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function StatusBadge({ status }: { status: SmsLog["status"] }) {
  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
        <CheckCircle className="w-3 h-3" />
        Sent
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
        <XCircle className="w-3 h-3" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
      <Clock className="w-3 h-3" />
      Pending
    </span>
  );
}

export default function SmsLogTable({ logs, loading, onRefresh }: Props) {
  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    if (!confirm("Are you sure you want to delete all SMS history? This cannot be undone.")) return;

    setClearing(true);
    try {
      await clearLogs();
      onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to clear logs");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">SMS History</h2>
            <p className="text-xs text-gray-500">Recent delivery notifications sent</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {logs.length > 0 && (
            <button
              onClick={handleClear}
              disabled={clearing || loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div className="py-12 text-center">
          <RefreshCw className="w-6 h-6 text-gray-300 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">Loading logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center">
          <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No SMS sent yet</p>
          <p className="text-xs text-gray-300 mt-1">Click a delivery button to send your first SMS</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 px-2">Time</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 px-2">Phone</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 px-2">Button</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 px-2">Order ID</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 px-2">AWB</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 px-2">OTP</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 px-2">Valid Till</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 px-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="py-3 px-2 text-xs text-gray-500 whitespace-nowrap">{formatTime(log.created_at)}</td>
                  <td className="py-3 px-2 font-medium text-gray-800 whitespace-nowrap">+91 {log.phone_number}</td>
                  <td className="py-3 px-2 whitespace-nowrap">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{log.button_label}</span>
                  </td>
                  <td className="py-3 px-2 font-mono text-xs text-gray-700">{log.order_id}</td>
                  <td className="py-3 px-2 font-mono text-xs text-gray-700">{log.awb}</td>
                  <td className="py-3 px-2">
                    <span className="font-mono font-bold text-gray-900 bg-yellow-50 px-2 py-0.5 rounded text-xs">{log.otp}</span>
                  </td>
                  <td className="py-3 px-2 text-xs text-gray-600">{log.time_slot}</td>
                  <td className="py-3 px-2">
                    <StatusBadge status={log.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {logs.length > 0 && (
        <p className="mt-4 text-xs text-gray-400 text-right">Showing last {logs.length} messages</p>
      )}
    </div>
  );
}
