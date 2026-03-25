import { cn } from "../utils/cn";

export function Card({ className, children, ...props }) {
  return (
    <div className={cn("glass-card border-none rounded-[2rem] overflow-hidden bg-bg-panel shadow-2xl relative", className)} {...props}>
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn("px-8 py-6 border-b border-white/5 bg-transparent", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn("text-xs font-black tracking-[0.2em] text-text-tertiary uppercase", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn("px-8 py-6", className)} {...props}>
      {children}
    </div>
  );
}
