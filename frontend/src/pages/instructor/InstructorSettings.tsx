import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "../../lib/apiClient";
import {
  RiShieldLine,
  RiSettings4Line,
  RiDeleteBin6Line,
  RiAlarmWarningLine,
  RiCheckLine,
  RiCloseLine,
  RiEyeLine,
  RiEyeOffLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
} from "react-icons/ri";

export default function InstructorSettingsPage() {
  // Password Change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Delete Account
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErr(null);
    setPasswordSuccess(false);

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setPasswordErr("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErr("New passwords don't match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordErr("Password must be at least 8 characters");
      return;
    }

    setPasswordLoading(true);
    try {
      await apiClient.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (e: any) {
      setPasswordErr(e?.response?.data?.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteErr(null);

    if (deleteConfirm !== "DELETE") {
      setDeleteErr("Please type 'DELETE' to confirm");
      return;
    }

    setDeleteLoading(true);
    try {
      await apiClient.delete("/instructor/account");
      localStorage.removeItem("authToken");
      window.location.href = "/auth";
    } catch (e: any) {
      setDeleteErr(e?.response?.data?.message || "Failed to delete account");
      setDeleteLoading(false);
    }
  };

  return (
    <div className="w-full px-4 py-8 md:px-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800/60 bg-slate-900/40 px-3 py-1 text-xs text-slate-200">
            <RiSettings4Line className="text-slate-300" />
            Account Settings
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-slate-400">Manage your account security and preferences</p>
        </div>

        {/* Change Password Section */}
        <motion.div
          whileHover={{ y: -2 }}
          className="mt-8 rounded-3xl border border-slate-800/60 bg-gradient-to-b from-slate-900/50 to-slate-950/30 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <RiShieldLine className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Change Password</h2>
              <p className="text-sm text-slate-400 mt-0.5">Keep your account secure with a strong password</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500/50 transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                >
                  {showCurrentPass ? <RiEyeOffLine /> : <RiEyeLine />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter a strong new password"
                  className="w-full rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500/50 transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                >
                  {showNewPass ? <RiEyeOffLine /> : <RiEyeLine />}
                </button>
              </div>
              {newPassword && (
                <p className="text-xs text-slate-400 mt-1.5">
                  {newPassword.length >= 8 ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <RiCheckboxCircleLine /> Strong password
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <RiErrorWarningLine /> Minimum 8 characters
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="w-full rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500/50 transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                >
                  {showConfirmPass ? <RiEyeOffLine /> : <RiEyeLine />}
                </button>
              </div>
              {confirmPassword && newPassword && (
                <p className="text-xs mt-1.5">
                  {newPassword === confirmPassword ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <RiCheckboxCircleLine /> Passwords match
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <RiErrorWarningLine /> Passwords don't match
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {passwordErr && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-rose-100 text-sm"
                >
                  <RiAlarmWarningLine className="mt-0.5 flex-shrink-0" />
                  {passwordErr}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
              {passwordSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-100 text-sm"
                >
                  <RiCheckboxCircleLine className="mt-0.5 flex-shrink-0" />
                  Password changed successfully!
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full mt-6 rounded-xl border border-blue-800/70 bg-blue-900/50 px-4 py-2.5 text-sm font-medium text-blue-100 hover:bg-blue-900/70 active:scale-95 transition disabled:opacity-50"
            >
              {passwordLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </motion.div>

        {/* Delete Account Section */}
        <motion.div
          whileHover={{ y: -2 }}
          className="mt-8 rounded-3xl border border-rose-800/40 bg-gradient-to-b from-rose-900/20 to-rose-950/10 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30">
              <RiDeleteBin6Line className="text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Delete Account</h2>
              <p className="text-sm text-slate-400 mt-0.5">Permanently delete your account and all associated data</p>
            </div>
          </div>

          <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-rose-100 text-sm">
            <RiAlarmWarningLine className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">This action cannot be undone</p>
              <p className="opacity-80 mt-1">Your account and all data will be permanently deleted. This includes your student records and settings.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Type "<span className="font-bold text-rose-300">DELETE</span>" to confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="Type DELETE"
                className="w-full rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none focus:border-rose-500/50 transition"
              />
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {deleteErr && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-rose-100 text-sm"
                >
                  <RiAlarmWarningLine className="mt-0.5 flex-shrink-0" />
                  {deleteErr}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleDeleteAccount}
              disabled={deleteLoading || deleteConfirm !== "DELETE"}
              className="w-full rounded-xl border border-rose-800/70 bg-rose-900/50 px-4 py-2.5 text-sm font-medium text-rose-100 hover:bg-rose-900/70 active:scale-95 transition disabled:opacity-50"
            >
              {deleteLoading ? "Deleting..." : "Delete My Account"}
            </button>
          </div>
        </motion.div>

        {/* Additional Security Tips */}
        <motion.div
          whileHover={{ y: -2 }}
          className="mt-8 rounded-3xl border border-slate-800/60 bg-gradient-to-b from-slate-900/50 to-slate-950/30 p-6"
        >
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Security Tips</h3>
          <ul className="space-y-3 text-sm text-slate-300">
            <li className="flex items-start gap-3">
              <RiCheckLine className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Use a strong password with uppercase, lowercase, numbers, and symbols</span>
            </li>
            <li className="flex items-start gap-3">
              <RiCheckLine className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Never share your password with anyone, even administrators</span>
            </li>
            <li className="flex items-start gap-3">
              <RiCheckLine className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Change your password regularly (at least every 3 months)</span>
            </li>
            <li className="flex items-start gap-3">
              <RiCheckLine className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Log out from other devices if you suspect unauthorized access</span>
            </li>
          </ul>
        </motion.div>
      </motion.div>
    </div>
  );
}
