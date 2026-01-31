import React, { useEffect, useState } from "react";
import apiClient from "../lib/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import { RiShieldCheckLine, RiInformationLine } from "react-icons/ri";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const PRIV_KEY = "privacyProfilePrivate";

  const getAuthSub = () => {
    const token = sessionStorage.getItem("token");
    if (!token) return null;
    try {
      const payload = token.split(".")[1];
      const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
      const data = JSON.parse(json);
      return data?.sub ? String(data.sub) : null;
    } catch {
      return null;
    }
  };

  const loadPrivacy = async () => {
    try {
      setLoading(true);
      setErr(null);
      const res = await apiClient.get("/student/profile");
      if (typeof res.data?.isProfilePrivate === "boolean") {
        setIsPrivate(res.data.isProfilePrivate);
        sessionStorage.setItem(PRIV_KEY, String(res.data.isProfilePrivate));
        return;
      }
      if (typeof res.data?.student?.isProfilePrivate === "boolean") {
        setIsPrivate(res.data.student.isProfilePrivate);
        sessionStorage.setItem(PRIV_KEY, String(res.data.student.isProfilePrivate));
        return;
      }
      const cached = sessionStorage.getItem(PRIV_KEY);
      if (cached === "true" || cached === "false") {
        setIsPrivate(cached === "true");
        return;
      }
      setErr("Privacy flag missing");
    } catch (e: any) {
      const status = e?.response?.status;
      const sub = getAuthSub();
      if (sub && (status === 403 || status === 404 || status == null)) {
        try {
          const res2 = await apiClient.get(`/student/profile/${sub}`);
          const flag = res2.data?.student?.isProfilePrivate === true;
          setIsPrivate(flag);
          sessionStorage.setItem(PRIV_KEY, String(flag));
          return;
        } catch (e2: any) {
          setErr(
            e2?.response?.data?.message ||
              e2?.message ||
              "Failed to load settings"
          );
        }
      } else {
        setErr(e?.response?.data?.message || e?.message || "Failed to load settings");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrivacy();
  }, []);

  const handleToggle = async (next: boolean) => {
    setIsPrivate(next);
    try {
      setSaving(true);
      const res = await apiClient.put("/student/profile", { isProfilePrivate: next });
      if (typeof res.data?.isProfilePrivate === "boolean") {
        setIsPrivate(res.data.isProfilePrivate);
        sessionStorage.setItem(PRIV_KEY, String(res.data.isProfilePrivate));
      } else if (typeof res.data?.student?.isProfilePrivate === "boolean") {
        setIsPrivate(res.data.student.isProfilePrivate);
        sessionStorage.setItem(PRIV_KEY, String(res.data.student.isProfilePrivate));
      } else {
        sessionStorage.setItem(PRIV_KEY, String(next));
      }
    } catch (e: any) {
      setIsPrivate(!next);
      setErr(e?.response?.data?.message || e?.message || "Failed to update privacy");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full px-4 py-8 md:px-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800/60 bg-slate-900/40 px-3 py-1 text-xs text-slate-200">
            <RiShieldCheckLine className="text-slate-300" />
            Privacy Controls
          </div>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Control who can view your public profile from the leaderboard.
        </p>

        <div className="mt-6 rounded-3xl border border-slate-800/60 bg-gradient-to-b from-slate-900/50 to-slate-950/30 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-slate-100">Private profile</p>
              <p className="mt-1 text-sm text-slate-400">
                When enabled, other students can’t open your profile from the leaderboard.
              </p>
            </div>

            <button
              type="button"
              disabled={loading || saving}
              onClick={() => handleToggle(!isPrivate)}
              className={`relative h-9 w-16 rounded-full border transition ${
                isPrivate
                  ? "border-emerald-500/60 bg-emerald-500/20"
                  : "border-slate-700 bg-slate-900/60"
              } ${loading || saving ? "opacity-60" : "hover:border-sky-400/70"}`}
              aria-pressed={isPrivate}
            >
              <span
                className={`absolute top-1 left-1 h-7 w-7 rounded-full transition ${
                  isPrivate ? "translate-x-7 bg-emerald-400" : "translate-x-0 bg-slate-400"
                }`}
              />
            </button>
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Status:{" "}
            <span className={isPrivate ? "text-emerald-300" : "text-slate-300"}>
              {isPrivate ? "Private" : "Public"}
            </span>
            {saving ? <span className="ml-2 text-slate-400">Saving...</span> : null}
          </div>
        </div>

        <AnimatePresence>
          {err && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6"
            >
              <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-100">
                <RiInformationLine className="mt-0.5" />
                <div className="text-sm">{err}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
