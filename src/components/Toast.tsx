import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import type { ToastMessage } from "../types";

const ICONS = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle,
} as const;

const TONES = {
  info: "text-[#00f0ff]",
  success: "text-emerald-400",
  error: "text-red-400",
} as const;

interface ToastProps {
  messages: ToastMessage[];
  onDismiss: (id: number) => void;
}

export default function Toast({ messages, onDismiss }: ToastProps) {
  if (messages.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[320px] flex-col gap-2">
      {messages.map((message) => {
        const Icon = ICONS[message.kind];
        return (
          <div
            key={message.id}
            role="status"
            className="pointer-events-auto flex animate-fade-in items-start gap-3 rounded-xl border border-[#2b2d32] bg-[#18191c]/95 p-3.5 shadow-2xl backdrop-blur-md"
          >
            <Icon size={16} className={`mt-0.5 shrink-0 ${TONES[message.kind]}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white tracking-wide">{message.title}</p>
              {message.detail && (
                <p className="mt-0.5 break-words text-xs leading-relaxed text-[#9ca3af]">
                  {message.detail}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(message.id)}
              className="shrink-0 p-1 text-[#71717a] transition-colors hover:text-white"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
