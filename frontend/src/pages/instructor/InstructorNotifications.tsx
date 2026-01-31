import React, { useEffect, useState } from "react";
import apiClient from "../../lib/apiClient";
import { RiSendPlane2Line, RiNotification3Line, RiRefreshLine } from "react-icons/ri";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt?: string | null;
  audience?: string;
};

export default function InstructorNotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/instructor/notifications");
      setItems(res.data?.notifications || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const sendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      setError("Title and message are required.");
      return;
    }
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.post("/instructor/send-notification", {
        title: title.trim(),
        message: message.trim(),
        recipientIds: [],
      });
      setTitle("");
      setMessage("");
      setSuccess("Notification sent to all students.");
      await fetchNotifications();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050509] text-slate-100 px-4 sm:px-6 lg:px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-xs text-slate-200">
              <RiNotification3Line />
              Broadcast Center
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Send Notification</h1>
            <p className="mt-1 text-sm text-slate-400">
              Post a message that all students can see in their notifications.
            </p>
          </div>

          <button
            onClick={fetchNotifications}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900/60 transition"
            type="button"
          >
            <RiRefreshLine />
            Refresh
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
            <div className="text-sm font-semibold text-slate-100">Compose</div>
            <div className="mt-3 space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-500/60"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message to all students..."
                rows={6}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-500/60 resize-none"
              />
              {error ? <div className="text-xs text-rose-300">{error}</div> : null}
              {success ? <div className="text-xs text-emerald-300">{success}</div> : null}
              <button
                onClick={sendNotification}
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400 px-5 py-2 text-sm font-semibold text-black hover:brightness-110 transition disabled:opacity-70"
                type="button"
              >
                <RiSendPlane2Line />
                {sending ? "Sending..." : "Send to all students"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-100">Recent Notifications</div>
              <div className="text-xs text-slate-500">{items.length} total</div>
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-sm text-slate-500">Loading...</div>
              ) : items.length === 0 ? (
                <div className="text-sm text-slate-500">No notifications sent yet.</div>
              ) : (
                items.map((n) => (
                  <div key={n.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="text-sm font-semibold text-slate-100">{n.title}</div>
                    <div className="mt-1 text-xs text-slate-400">{n.message}</div>
                    <div className="mt-2 text-[0.65rem] text-slate-500">
                      {n.createdAt ? new Date(n.createdAt).toLocaleString() : "—"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
