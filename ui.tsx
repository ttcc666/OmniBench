
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ElementType;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  icon: Icon,
  isLoading,
  disabled,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:scale-95";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 focus:ring-blue-500",
    secondary: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700",
    ghost: "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
    danger: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-transparent hover:border-red-200 dark:hover:border-red-800",
    outline: "border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
  };

  const sizes = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-12 px-6 text-base gap-2.5"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 14 : 18} />
      ) : null}
      {children}
    </button>
  );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ElementType;
}

export const Input: React.FC<InputProps> = ({ label, error, icon: Icon, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">{label}</label>}
    <div className="relative group">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
          <Icon size={16} />
        </div>
      )}
      <input 
        className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 ${Icon ? 'pl-9' : ''} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props}
      />
    </div>
    {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
  </div>
);

// --- Select (Custom Dropdown) ---
interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
  icon?: React.ElementType;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({ label, options, value, onChange, placeholder = "Select...", className = '', disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
       {label && <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">{label}</label>}
       <div className="relative">
         <button
           type="button"
           onClick={() => !disabled && setIsOpen(!isOpen)}
           disabled={disabled}
           className={`w-full flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-left outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-600'}`}
         >
            <span className={`truncate ${!selectedOption ? 'text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
         </button>

         {isOpen && (
           <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
              <div className="p-1">
                {options.length === 0 ? (
                    <div className="p-3 text-xs text-center text-slate-500">No options available</div>
                ) : (
                    options.map((option) => (
                        <button
                        key={option.value}
                        onClick={() => { onChange(option.value); setIsOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                            option.value === value 
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                        >
                        <div className="flex flex-col items-start text-left overflow-hidden">
                            <span className="truncate font-medium">{option.label}</span>
                            {option.subLabel && <span className="text-[10px] opacity-70 truncate">{option.subLabel}</span>}
                        </div>
                        {option.value === value && <Check size={14} className="shrink-0 ml-2" />}
                        </button>
                    ))
                )}
              </div>
           </div>
         )}
       </div>
    </div>
  );
};

// --- Textarea ---
export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className = '', ...props }) => (
  <textarea 
    className={`w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm resize-none ${className}`}
    {...props}
  />
);

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm ${className}`}>
    {children}
  </div>
);

// --- Badge ---
export const Badge: React.FC<{ children: React.ReactNode, variant?: 'success' | 'error' | 'warning' | 'neutral' }> = ({ children, variant = 'neutral' }) => {
  const variants = {
    success: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
    error: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
    warning: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    neutral: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium border uppercase tracking-wider ${variants[variant]}`}>
      {children}
    </span>
  );
};

// --- Segmented Control ---
export const SegmentedControl: React.FC<{ options: {value: string, label: string, icon?: React.ElementType}[], value: string, onChange: (val: any) => void }> = ({ options, value, onChange }) => (
  <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700 w-full">
    {options.map(opt => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`flex-1 py-1.5 px-3 text-xs rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
          value === opt.value 
            ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' 
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        {opt.icon && <opt.icon size={12} />}
        {opt.label}
      </button>
    ))}
  </div>
);
