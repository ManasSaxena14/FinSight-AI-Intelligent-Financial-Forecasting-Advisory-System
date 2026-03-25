import { cn } from "../utils/cn";

export function Button({ className, variant = "primary", size = "md", isLoading, children, ...props }) {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-black transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 focus:ring-offset-bg-base disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97] tracking-widest uppercase text-[10px]";
  
  const variants = {
    primary: "bg-gradient-to-br from-brand-400 to-brand-600 text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] border border-brand-300/20",
    secondary: "bg-white/[0.03] text-text-secondary border border-white/5 hover:bg-white/[0.08] hover:text-text-primary backdrop-blur-md",
    danger: "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20",
    ghost: "text-text-tertiary hover:text-brand-400 hover:bg-brand-500/5"
  };

  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 py-2",
    lg: "h-12 px-6 text-lg"
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], sizes[size], className)} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
}
