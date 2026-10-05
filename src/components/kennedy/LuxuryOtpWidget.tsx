import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, KeyRound, Loader2, Lock, MessageSquare, Phone, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OtpCodeFields } from "@/components/kennedy/OtpCodeFields";
import { fetchPhoneOtpConfig, requestPhoneCode, verifyPhoneCode, type PhoneOtpConfig } from "@/lib/auth";
import { normalizePkPhone } from "@/lib/validation";

interface LuxuryOtpWidgetProps {
  phone: string;
  name?: string;
  isVerified: boolean;
  onVerified: (account: any) => void;
  className?: string;
}

export function LuxuryOtpWidget({
  phone,
  name,
  isVerified,
  onVerified,
  className = "",
}: LuxuryOtpWidgetProps) {
  const [config, setConfig] = useState<PhoneOtpConfig>({
    whatsapp_connected: true, // optimistic default
    default_channel: "whatsapp",
    channels: ["whatsapp", "sms"],
  });
  const [selectedChannel, setSelectedChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [actualSentChannel, setActualSentChannel] = useState<"whatsapp" | "sms">("whatsapp");

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const cleanPhone = normalizePkPhone(phone.trim());

  // Check WhatsApp connection status on mount
  useEffect(() => {
    let active = true;
    void fetchPhoneOtpConfig().then((cfg) => {
      if (!active) return;
      setConfig(cfg);
      if (!cfg.whatsapp_connected) {
        setSelectedChannel("sms");
      } else {
        setSelectedChannel(cfg.default_channel || "whatsapp");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const isWaAvailable = config.whatsapp_connected;

  const handleSend = async (overrideChannel?: "whatsapp" | "sms") => {
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Enter phone number", {
        description: "Please enter your 11-digit mobile number above first.",
      });
      return;
    }

    const channelToUse = overrideChannel || (isWaAvailable ? selectedChannel : "sms");
    setSending(true);
    try {
      const res = await requestPhoneCode(cleanPhone, channelToUse);
      const usedChannel = (res.channel === "sms" || !res.sent_via_whatsapp) ? "sms" : "whatsapp";
      setActualSentChannel(usedChannel);
      setSent(true);
      setCode("");

      if (usedChannel === "whatsapp") {
        toast.custom(
          () => (
            <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-500/50 bg-[#161413] px-4 py-3.5 text-cream shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-emerald-300 block">
                  WhatsApp OTP Dispatched
                </span>
                <p className="mt-0.5 text-xs text-cream/80">
                  A 6-digit verification code was sent to your WhatsApp on <span className="font-mono font-bold text-white">+{cleanPhone}</span>.
                </p>
              </div>
            </div>
          ),
          { duration: 5000 }
        );
      } else {
        toast.custom(
          () => (
            <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-500/50 bg-[#161413] px-4 py-3.5 text-cream shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Phone className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-display text-xs font-black uppercase tracking-[0.16em] text-amber-300 block">
                  SMS Code Dispatched
                </span>
                <p className="mt-0.5 text-xs text-cream/80">
                  A 6-digit verification code was sent via SMS to <span className="font-mono font-bold text-white">{cleanPhone}</span>.
                </p>
              </div>
            </div>
          ),
          { duration: 5000 }
        );
      }
    } catch (err: any) {
      toast.error("Could not send OTP", {
        description: err?.message || "Please check your number and try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (explicitCode?: string) => {
    const finalCode = (explicitCode ?? code).trim();
    if (!cleanPhone) return;
    if (!finalCode || finalCode.length < 6) {
      toast.error("Incomplete Code", {
        description: "Please enter the full 6-digit OTP code received on your phone.",
      });
      return;
    }

    setVerifying(true);
    try {
      const res = await verifyPhoneCode(cleanPhone, finalCode, name);
      onVerified(res.account);

      toast.custom(
        () => (
          <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-500/50 bg-[#161413] px-4 py-3 text-cream shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/50">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                Phone Verified &amp; Account Created!
              </p>
              <p className="text-xs text-cream/80">
                Welcome, <span className="font-bold text-white">{res.account.name || "Customer"}</span>. Your account is active and your order is ready!
              </p>
            </div>
          </div>
        ),
        { duration: 4500 }
      );
    } catch (err: any) {
      toast.error("Verification Failed", {
        description: err?.message || "Invalid or expired OTP code. Please check the code and try again.",
      });
    } finally {
      setVerifying(false);
    }
  };

  if (isVerified) {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`mt-3 flex items-center justify-between gap-3 rounded-xl border-2 border-flame/30 bg-flame/5 p-3.5 text-charcoal shadow-sm ${className}`}>
        <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-flame text-cream shadow-sm">
            <Check className="h-5 w-5" />
          </div>
          <div>
            <span className="flex items-center gap-1.5 font-display text-xs font-extrabold uppercase tracking-wider text-charcoal">
              <Lock className="w-3.5 h-3.5 text-flame" /> Phone verified
            </span>
            <span className="block font-body text-xs text-charcoal/70">
              Order updates will be sent to <span className="font-mono font-bold text-charcoal">{phone}</span>
            </span>
          </div>
        </div>
        <span className="shrink-0 flex items-center gap-1 rounded-full border border-flame/30 bg-charcoal px-3 py-1 font-display text-[10px] font-black uppercase tracking-widest text-cream shadow-sm">
          <ShieldCheck className="h-3.5 w-3.5" /> Locked
        </span>
      </motion.div>
    );
  }

  return (
    <div className={`mt-3 overflow-hidden rounded-xl border-2 border-flame/20 bg-cream-deep/35 p-4 shadow-[var(--shadow-card)] transition-all ${className}`}>
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-charcoal/10">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
            isWaAvailable && selectedChannel === "whatsapp"
              ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30"
              : "bg-flame/15 text-flame border border-flame/30"
          }`}>
            {isWaAvailable && selectedChannel === "whatsapp" ? (
              <MessageSquare className="h-4 w-4" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
          </div>
          <div>
            <span className="block font-display text-xs font-black uppercase tracking-[0.14em] text-charcoal">
              {isWaAvailable
                ? selectedChannel === "whatsapp"
                  ? "WhatsApp Verification (Default)"
                  : "SMS Verification"
                : "SMS Verification"}
            </span>
            <span className="block font-body text-xs text-charcoal/60">
              {isWaAvailable
                ? selectedChannel === "whatsapp"
                  ? "Receive your 6-digit OTP code on WhatsApp"
                  : "Receive your 6-digit OTP code via SMS message"
                : "Receive your 6-digit OTP code via SMS message"}
            </span>
          </div>
        </div>

        {/* Channel Switcher + Send OTP Button */}
        <div className="flex items-center gap-2">
          {isWaAvailable && (
            <div className="flex items-center rounded-xl border border-charcoal/15 bg-charcoal/5 p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setSelectedChannel("whatsapp")}
                className={`rounded-lg px-2.5 py-1 transition-all font-display ${
                  selectedChannel === "whatsapp"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-charcoal/60 hover:text-charcoal"
                }`}
                title="Default WhatsApp OTP"
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setSelectedChannel("sms")}
                className={`rounded-lg px-2.5 py-1 transition-all font-display ${
                  selectedChannel === "sms"
                    ? "bg-flame text-white shadow-sm"
                    : "text-charcoal/60 hover:text-charcoal"
                }`}
                title="Alternative SMS OTP"
              >
                SMS
              </button>
            </div>
          )}

          <Button
            type="button"
            disabled={sending}
            onClick={() => handleSend()}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 font-display text-xs font-black uppercase tracking-[0.14em] text-white shadow-sm transition-all hover:brightness-105 active:scale-95 disabled:opacity-50 ${
              isWaAvailable && selectedChannel === "whatsapp"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-flame hover:bg-flame/90"
            }`}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {sending
              ? "Sending..."
              : sent
                ? "Resend Code"
                : isWaAvailable && selectedChannel === "whatsapp"
                  ? "Send WhatsApp Code"
                  : "Send SMS Code"}
          </Button>
        </div>
      </div>

      {/* Prominent High-Visibility 6-Digit OTP Entry Section */}
      <AnimatePresence>
        {sent ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="pt-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label
                htmlFor="otp-code-input"
                className="block font-display text-xs font-black uppercase tracking-[0.16em] text-flame"
              >
                Enter 6-Digit Code Received:
              </label>
              <span className="font-body text-xs text-charcoal/60">
                Sent to <span className="font-mono font-bold text-charcoal">{cleanPhone}</span> via <strong className="uppercase">{actualSentChannel}</strong>
              </span>
            </div>

            {/* Six clear cells support keyboard entry, paste and mobile autofill. */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <OtpCodeFields
                value={code}
                onChange={setCode}
                onComplete={(value) => void handleVerify(value)}
                disabled={verifying}
                className="flex-1"
              />

              <Button
                type="button"
                disabled={verifying || code.length < 6}
                onClick={() => handleVerify()}
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3.5 font-display text-xs font-black uppercase tracking-[0.16em] text-white shadow-md transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {verifying ? "Verifying..." : "Verify & Continue"}
              </Button>
            </div>

            {/* Sub-bar with helper actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-charcoal/60 font-body">
              <span>Code expires in 10 minutes.</span>
              <div className="flex items-center gap-3">
                {actualSentChannel === "whatsapp" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChannel("sms");
                      handleSend("sms");
                    }}
                    className="font-bold text-flame hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" /> Didn't get it? Send via SMS
                  </button>
                )}
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => handleSend()}
                  className="text-charcoal/70 hover:text-charcoal font-semibold underline"
                >
                  Resend OTP
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-charcoal/60 font-body">
            <span>
              Enter your mobile number above, then click <strong>"Send {isWaAvailable && selectedChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} Code"</strong> to verify and create your account instantly.
            </span>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
