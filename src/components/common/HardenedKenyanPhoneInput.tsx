import React, { useState, useEffect } from 'react';
import { Check, Phone } from 'lucide-react';
import { validateKenyanMpesaPhone } from '../../lib/paymentService';

interface HardenedKenyanPhoneInputProps {
  id?: string;
  value: string;
  onChange: (formattedValue: string, msisdn: string, isValid: boolean) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  showValidationBanner?: boolean;
}

export const HardenedKenyanPhoneInput: React.FC<HardenedKenyanPhoneInputProps> = ({
  id = 'hardened-kenyan-phone-input',
  value,
  onChange,
  placeholder = '712 345 678',
  required = true,
  className = '',
  inputClassName = '',
  showValidationBanner = true,
}) => {
  const [touched, setTouched] = useState(false);

  // Extract raw 9 digits from incoming value
  const extractNineDigits = (raw: string): string => {
    const cleaned = String(raw || '').replace(/\D/g, '');
    if (cleaned.startsWith('254') && cleaned.length >= 12) {
      return cleaned.slice(3, 12);
    }
    if (cleaned.startsWith('0') && cleaned.length >= 10) {
      return cleaned.slice(1, 10);
    }
    return cleaned.slice(0, 9);
  };

  const [nineDigits, setNineDigits] = useState(() => extractNineDigits(value));

  useEffect(() => {
    const nextDigits = extractNineDigits(value);
    if (nextDigits !== nineDigits) {
      setNineDigits(nextDigits);
    }
  }, [value]);

  // Format 9 digits as "712 345 678"
  const formatGrouped = (digits: string): string => {
    const d = digits.replace(/\D/g, '').slice(0, 9);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    // Auto-strip leading 0 or 254 if pasted in full format
    let clean = rawInput.replace(/\D/g, '');
    if (clean.startsWith('254')) {
      clean = clean.slice(3);
    } else if (clean.startsWith('0')) {
      clean = clean.slice(1);
    }
    const truncated = clean.slice(0, 9);
    setNineDigits(truncated);

    const fullMsisdn = truncated.length === 9 ? `254${truncated}` : '';
    const formatted = `+254 ${formatGrouped(truncated)}`;
    onChange(formatted, fullMsisdn, truncated.length === 9 && (truncated.startsWith('7') || truncated.startsWith('1')));
  };

  const validation = validateKenyanMpesaPhone(`+254${nineDigits}`);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition shadow-2xs">
        {/* Locked Country Prefix Badge */}
        <div className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-3.5 py-2 text-xs flex items-center gap-1.5 border-r border-slate-300 dark:border-slate-700 select-none shrink-0">
          <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>+254</span>
        </div>

        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          required={required}
          value={formatGrouped(nineDigits)}
          onChange={handleInputChange}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          maxLength={11} // 9 digits + 2 spaces
          className={`flex-1 bg-transparent px-3.5 py-2 font-mono font-bold text-slate-900 dark:text-slate-100 text-xs tracking-wide focus:outline-hidden ${inputClassName}`}
        />
      </div>

      {showValidationBanner && (
        <div>
          {validation.valid ? (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
              <Check className="w-3 h-3 shrink-0" />
              <span>STK Push target: {validation.formattedDisplay}</span>
            </p>
          ) : touched && nineDigits.length > 0 ? (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
              Enter a valid 9-digit Safaricom or Airtel number starting with 7 or 1 (e.g. 712 345 678).
            </p>
          ) : (
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Type 9 digits (e.g. 712 345 678). Leading 0 or +254 are auto-stripped.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
