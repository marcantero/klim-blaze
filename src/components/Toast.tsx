import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import type { ToastMessage } from "../types";

const ICONS = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle,
} as const;

const TONES = {
  info: "text-[#00b8fc]",
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
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[320px] flex-col gap-2 font-mono">
      {messages.map((message) => {
        const Icon = ICONS[message.kind];
        return (
          <div
            key={message.id}
            role="status"
            className="pointer-events-auto flex animate-fade-in items-start gap-2.5 rounded-none border border-[#1b2230] bg-[#0c0f16]/98 p-3 shadow-2xl backdrop-blur"
          >
            <Icon size={14} className={`mt-0.5 shrink-0 ${TONES[message.kind]}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-100">{message.title}</p>
              {message.detail && (
                <p className="mt-0.5 break-words text-[10px] leading-relaxed text-[#738099]">
                  {message.detail}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(message.id)}
              className="shrink-0 p-1 text-[#54627d] transition-colors hover:text-white"
              aria-label="Dismiss notification"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
