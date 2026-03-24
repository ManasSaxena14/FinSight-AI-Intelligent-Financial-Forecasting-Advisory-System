import { forwardRef } from "react";
import { cn } from "../utils/cn";

export const Input = forwardRef(({ className, label, error, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-black text-zinc-500 uppercase tracking-[0.15em] mb-2 px-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-inner",
          error && "border-rose-500/50 focus:ring-rose-500/10",
          className
        )}
        {...props}
      />
      {error && <p className="mt-2 ml-1 text-xs font-bold text-rose-400 uppercase tracking-wider">{error}</p>}
    </div>
  );
});

Input.displayName = "Input";
