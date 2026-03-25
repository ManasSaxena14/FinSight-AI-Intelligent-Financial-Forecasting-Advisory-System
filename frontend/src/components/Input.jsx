import { forwardRef } from "react";
import { cn } from "../utils/cn";

export const Input = forwardRef(({ className, label, error, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] mb-2 px-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-xl border border-white/5 bg-bg-panel/20 px-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-2xl overflow-hidden relative",
          error && "border-rose-500/50 focus:ring-rose-500/5",
          className
        )}
        {...props}
      />
      {error && <p className="mt-2 ml-1 text-[10px] font-black text-rose-500/60 uppercase tracking-widest">{error}</p>}
    </div>
  );
});

Input.displayName = "Input";
