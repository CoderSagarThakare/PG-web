import { forwardRef, useState } from 'react';
import { cn } from '../../utils/cn';
import ReactSelect from 'react-select';
import ReactDatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';

const customSelectStyles = (isDark) => ({
  control: (base, state) => ({
    ...base,
    backgroundColor: isDark ? '#242740' : '#ffffff',
    borderColor: state.isFocused ? '#6c63ff' : (isDark ? '#2d3052' : '#e5e7eb'),
    minHeight: '44px',
    borderRadius: '8px',
    color: isDark ? '#f0f0f8' : '#111827',
    boxShadow: state.isFocused ? '0 0 0 1px rgba(108,99,255,0.4)' : 'none',
    borderWidth: '1px',
    '&:hover': {
      borderColor: '#6c63ff',
    }
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: isDark ? '#1a1d2e' : '#ffffff',
    border: `1px solid ${isDark ? '#2d3052' : '#e5e7eb'}`,
    borderRadius: '8px',
    zIndex: 9999,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected 
      ? '#6c63ff' 
      : (state.isFocused 
          ? (isDark ? '#242740' : '#f3f4f6') 
          : 'transparent'),
    color: state.isSelected 
      ? '#ffffff' 
      : (isDark ? '#f0f0f8' : '#111827'),
    cursor: 'pointer',
    fontSize: '14px',
    padding: '10px 14px',
    '&:active': {
      backgroundColor: '#6c63ff',
    }
  }),
  singleValue: (base) => ({
    ...base,
    color: isDark ? '#f0f0f8' : '#111827',
    fontSize: '14px',
  }),
  placeholder: (base) => ({
    ...base,
    color: isDark ? '#6b6e82' : '#9ca3af',
    fontSize: '14px',
  }),
  input: (base) => ({
    ...base,
    color: isDark ? '#f0f0f8' : '#111827',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: isDark ? '#a0a3b1' : '#9ca3af',
    '&:hover': {
      color: '#6c63ff',
    }
  }),
  indicatorSeparator: () => ({
    display: 'none',
  })
});

export const SelectDropdown = forwardRef(({
  value, onChange, options, placeholder = 'Select...', disabled, className, name, styles, ...props
}, ref) => {
  const isDark = document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
  const currentOption = options?.find(opt => opt.value === value) || null;

  const defaultStyles = customSelectStyles(isDark);
  const mergedStyles = {};
  Object.keys(defaultStyles).forEach(key => {
    mergedStyles[key] = (base, state) => {
      const defaultVal = defaultStyles[key](base, state);
      if (styles && styles[key]) {
        return styles[key](defaultVal, state);
      }
      return defaultVal;
    };
  });

  return (
    <ReactSelect
      ref={ref}
      unstyled={false}
      options={options}
      value={currentOption}
      onChange={(opt) => {
        const val = opt ? opt.value : '';
        onChange && onChange({ target: { value: val, name } });
      }}
      placeholder={placeholder}
      isDisabled={disabled}
      styles={mergedStyles}
      className={className}
      name={name}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      {...props}
    />
  );
});
SelectDropdown.displayName = 'SelectDropdown';

export const DatePickerComponent = forwardRef(({
  value, onChange, placeholder = 'Select date...', disabled, className, name, ...props
}, ref) => {
  let selectedDate = null;
  if (value) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      selectedDate = d;
    }
  }

  return (
    <ReactDatePicker
      ref={ref}
      selected={selectedDate}
      onChange={(date) => {
        let dateStr = '';
        if (date) {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          dateStr = `${y}-${m}-${d}`;
        }
        onChange && onChange({ target: { value: dateStr, name } });
      }}
      renderCustomHeader={({
        date,
        changeYear,
        changeMonth,
        decreaseMonth,
        increaseMonth,
        prevMonthButtonDisabled,
        nextMonthButtonDisabled,
      }) => {
        const years = Array.from({ length: 31 }, (_, i) => new Date().getFullYear() - 15 + i);
        const months = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];

        return (
          <div className="flex items-center justify-between px-2 py-1.5 bg-transparent gap-2 select-none">
            <button
              type="button"
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
              className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-[#2d3052] text-gray-500 dark:text-[#a0a3b1] disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center border-none"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={months[date.getMonth()]}
                onChange={({ target: { value } }) => changeMonth(months.indexOf(value))}
                className="bg-white dark:bg-[#1a1d2e] text-gray-900 dark:text-[#f0f0f8] border border-gray-200 dark:border-[#2d3052] rounded-lg px-2 py-1 text-xs font-extrabold outline-none cursor-pointer hover:border-[#6c63ff] transition-colors focus:ring-1 focus:ring-[#6c63ff] h-8 max-w-[105px]"
              >
                {months.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={date.getFullYear()}
                onChange={({ target: { value } }) => changeYear(Number(value))}
                className="bg-white dark:bg-[#1a1d2e] text-gray-900 dark:text-[#f0f0f8] border border-gray-200 dark:border-[#2d3052] rounded-lg px-2 py-1 text-xs font-extrabold outline-none cursor-pointer hover:border-[#6c63ff] transition-colors focus:ring-1 focus:ring-[#6c63ff] h-8 max-w-[75px]"
              >
                {years.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
              className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-[#2d3052] text-gray-500 dark:text-[#a0a3b1] disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center border-none"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        );
      }}
      placeholderText={placeholder}
      disabled={disabled}
      className={cn(
        'w-full bg-white dark:bg-[#242740] border border-gray-200 dark:border-[#2d3052] rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 outline-none text-gray-900 dark:text-[#f0f0f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6e82] focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff]/40',
        className
      )}
      dateFormat="yyyy-MM-dd"
      autoComplete="off"
      name={name}
      {...props}
    />
  );
});
DatePickerComponent.displayName = 'DatePickerComponent';


// ── Spinner / Animated Loader ──────────────────────────────────────────────────
export const Spinner = ({ size = 'md', center = false }) => {
  const sizeCls = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-24 h-24' : 'w-16 h-16';
  
  const el = (
    <div className={cn("relative flex items-center justify-center", sizeCls)}>
      {/* Sonar Expanding Pulse Ring */}
      <div className="absolute inset-0 rounded-full border-2 border-[#6c63ff]/15 animate-ping opacity-60 pointer-events-none" />
      
      {/* Spinning Dual Gradient Ring matching Logo color style */}
      <div className="absolute inset-0 rounded-full border-2 border-t-[#6c63ff] border-r-transparent border-b-[#00d4aa] border-l-transparent animate-spin pointer-events-none" />
      <div className="absolute inset-[-4px] rounded-full border border-t-transparent border-r-[#00d4aa]/30 border-b-transparent border-l-[#6c63ff]/30 animate-[spin_3s_linear_infinite_reverse] pointer-events-none" />
      
      {/* Central StaySync Logo with breathing pulse scale */}
      <div className="w-[65%] h-[65%] rounded-full bg-white dark:bg-[#1a1d2e] p-1 flex items-center justify-center shadow-lg animate-[pulse_2.5s_ease-in-out_infinite]">
        <img 
          src="/Logo.png" 
          alt="StaySync" 
          className="w-full h-full object-contain filter drop-shadow-sm select-none"
        />
      </div>
    </div>
  );

  return center
    ? <div className="flex flex-col items-center justify-center min-h-[240px] gap-4 text-center">
        {el}
        {size !== 'sm' && (
          <div className="flex flex-col items-center gap-1.5 animate-[pulse_2s_infinite]">
            <span className="text-sm font-black bg-gradient-to-r from-[#6c63ff] via-[#00d4aa] to-[#6c63ff] bg-[length:200%_auto] bg-clip-text text-transparent animate-[pulse_2s_infinite]">
              StaySync
            </span>
            <span className="text-[9px] font-bold text-gray-400 dark:text-[#6b6e82] uppercase tracking-[2px]">
              Finding Your Perfect Stay
            </span>
          </div>
        )}
      </div>
    : el;
};

// ── EmptyState ─────────────────────────────────────────────────────────────────
export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-5 text-center gap-4">
    {icon && <div className="opacity-25 dark:opacity-30">{icon}</div>}
    <h3 className="text-lg font-bold text-gray-900 dark:text-[#f0f0f8]">{title}</h3>
    {description && <p className="text-sm text-gray-500 dark:text-[#a0a3b1] max-w-xs">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

// ── Badge ──────────────────────────────────────────────────────────────────────
const badgeVariants = {
  default:  'bg-gray-100 text-gray-600 dark:bg-[#242740] dark:text-[#a0a3b1] border border-gray-200/50 dark:border-[#2d3052]',
  success:  'bg-[#51cf66]/15 dark:bg-[#51cf66]/20 text-[#51cf66] border border-[#51cf66]/30',
  danger:   'bg-[#ff4d6d]/15 dark:bg-[#ff4d6d]/20 text-[#ff4d6d] border border-[#ff4d6d]/30',
  warning:  'bg-[#ffa94d]/15 dark:bg-[#ffa94d]/20 text-[#ffa94d] border border-[#ffa94d]/30',
  info:     'bg-[#6c63ff]/15 dark:bg-[#6c63ff]/20 text-[#6c63ff] border border-[#6c63ff]/30',
  purple:   'bg-[#cc5de8]/15 dark:bg-[#cc5de8]/20 text-[#cc5de8] border border-[#cc5de8]/30',
  accent:   'bg-[#00d4aa]/15 dark:bg-[#00d4aa]/20 text-[#00d4aa] border border-[#00d4aa]/30',
  dark:     'bg-gray-200 text-gray-700 dark:bg-[#a0a3b1]/15 dark:text-[#a0a3b1] border border-gray-300 dark:border-[#a0a3b1]/30',
  owner:    'bg-[#ffa94d]/15 dark:bg-[#ffa94d]/20 text-[#ffa94d] border border-[#ffa94d]/30',
  manager:  'bg-[#6c63ff]/15 dark:bg-[#6c63ff]/20 text-[#6c63ff] border border-[#6c63ff]/30',
  user:     'bg-[#00d4aa]/15 dark:bg-[#00d4aa]/20 text-[#00d4aa] border border-[#00d4aa]/30',
};

export const Badge = ({ children, variant = 'default', className = '', style = {} }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize',
      badgeVariants[variant] ?? badgeVariants.default,
      className
    )}
    style={style}
  >
    {children}
  </span>
);

// ── Button ─────────────────────────────────────────────────────────────────────
const btnVariants = {
  primary: 'bg-[#6c63ff] text-white hover:bg-[#5a52e0] hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(108,99,255,0.4)]',
  accent:  'bg-[#00d4aa] text-[#0f1117] hover:bg-[#00b891] hover:-translate-y-px',
  danger:  'bg-[#ff4d6d]/12 text-[#ff4d6d] border border-[#ff4d6d]/30 hover:bg-[#ff4d6d] hover:text-white',
  success: 'bg-[#51cf66]/12 text-[#51cf66] border border-[#51cf66]/30 hover:bg-[#51cf66] hover:text-white hover:-translate-y-px',
  ghost:   'bg-transparent text-gray-600 dark:text-[#a0a3b1] border border-gray-200 dark:border-[#2d3052] hover:bg-gray-100 dark:hover:bg-[#2d3052] hover:text-gray-900 dark:hover:text-[#f0f0f8]',
  outline: 'bg-transparent text-gray-900 dark:text-[#f0f0f8] border border-gray-300 dark:border-[#6b6e82] hover:bg-[#6c63ff]/10 hover:border-[#6c63ff] hover:text-[#6c63ff]',
};

const btnSizes = {
  '':   'px-4 py-2 text-[13px]',
  sm:   'px-3.5 py-1.5 text-[13px]',
  lg:   'px-7 py-3.5 text-[15px]',
  icon: 'p-2',
};

export const Button = ({
  children, variant = 'primary', size = '', onClick,
  disabled = false, loading = false, type = 'button', className = '', style = {}
}) => (
  <button
    type={type}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 whitespace-nowrap leading-none',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      btnVariants[variant] ?? btnVariants.primary,
      btnSizes[size] ?? btnSizes[''],
      className
    )}
    onClick={onClick}
    disabled={disabled || loading}
    style={style}
  >
    {loading
      ? <div className="w-4 h-4 animate-spinner rounded-full border-2 border-current border-t-transparent" />
      : children}
  </button>
);

// ── Card ───────────────────────────────────────────────────────────────────────
export const Card = ({ children, className = '', hover = false, onClick, style = {} }) => (
  <div
    className={cn(
      'bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-xl p-5',
      hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer hover:border-[#6c63ff]',
      className
    )}
    onClick={onClick}
    style={{ ...(onClick && !hover ? { cursor: 'pointer' } : {}), ...style }}
  >
    {children}
  </div>
);

// ── Input ──────────────────────────────────────────────────────────────────────
export const Input = forwardRef(({
  label, name, type = 'text', value, onChange,
  placeholder, error, required, disabled, as = 'input', options, rows, className, ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputCls = cn(
    'w-full bg-white dark:bg-[#242740] border rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 outline-none',
    'text-gray-900 dark:text-[#f0f0f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6e82]',
    'focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff]/40',
    error
      ? 'border-[#ff4d6d]'
      : 'border-gray-200 dark:border-[#2d3052] hover:border-[#6c63ff]/50',
    disabled && 'opacity-50 cursor-not-allowed',
    className
  );

  const commonProps = {
    ref, id: name, name, placeholder, className: inputCls,
    disabled, required,
    ...(value !== undefined ? { value } : {}),
    ...(onChange ? { onChange } : {}),
    ...props
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1]" htmlFor={name}>
          {label} {required && <span className="text-[#ff4d6d]">*</span>}
        </label>
      )}
      {as === 'select' ? (
        <SelectDropdown
          ref={ref}
          name={name}
          value={value}
          onChange={onChange}
          options={options}
          placeholder={placeholder}
          disabled={disabled}
          {...props}
        />
      ) : type === 'date' ? (
        <DatePickerComponent
          ref={ref}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          {...props}
        />
      ) : as === 'textarea' ? (
        <textarea rows={rows || 4} {...commonProps} />
      ) : type === 'password' ? (
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            {...commonProps}
            className={cn(inputCls, 'pr-10')}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-[#f0f0f8] focus:outline-none flex items-center justify-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      ) : (
        <input type={type} {...commonProps} />
      )}
      {error && <span className="text-xs text-[#ff4d6d] font-medium">{error}</span>}
    </div>
  );
});
Input.displayName = 'Input';

// ── Modal ──────────────────────────────────────────────────────────────────────
export const Modal = ({ isOpen, onClose, title, children, size = '' }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center z-[1000] p-0 md:p-6 animate-[fadeIn_0.2s_ease]"
      onClick={onClose}
    >
      <div
        className={cn(
          'bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052]',
          'rounded-t-2xl md:rounded-2xl p-5 md:p-7 w-full max-h-[92vh] overflow-y-auto',
          'shadow-[0_8px_40px_rgba(0,0,0,0.5)] animate-[slideUp_0.25s_ease]',
          size === 'lg' ? 'md:max-w-[720px]' : 'md:max-w-[520px]'
        )}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-[#f0f0f8]">{title}</h3>
          <button
            className="p-2 rounded-lg text-gray-500 dark:text-[#a0a3b1] hover:bg-gray-100 dark:hover:bg-[#242740] hover:text-gray-900 dark:hover:text-[#f0f0f8] transition-colors"
            onClick={onClose}
          >✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ── StatCard ───────────────────────────────────────────────────────────────────
const statColors = {
  primary: { bar: 'bg-[#6c63ff]', value: 'text-[#6c63ff]' },
  accent:  { bar: 'bg-[#00d4aa]', value: 'text-[#00d4aa]' },
  warning: { bar: 'bg-[#ffa94d]', value: 'text-[#ffa94d]' },
  success: { bar: 'bg-[#51cf66]', value: 'text-[#51cf66]' },
  danger:  { bar: 'bg-[#ff4d6d]', value: 'text-[#ff4d6d]' },
  purple:  { bar: 'bg-[#cc5de8]', value: 'text-[#cc5de8]' },
};

export const StatCard = ({ label, value, icon, color = 'primary' }) => {
  const c = statColors[color] ?? statColors.primary;
  return (
    <div className="relative bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-xl p-5 overflow-hidden">
      {/* Top accent bar */}
      <div className={cn('absolute top-0 inset-x-0 h-[3px] rounded-t-xl', c.bar)} />
      {icon && <div className="absolute right-5 top-5 opacity-15">{icon}</div>}
      <div className="text-[12px] font-semibold uppercase tracking-[0.8px] text-gray-500 dark:text-[#6b6e82] mb-2">{label}</div>
      <div className={cn('text-[28px] font-black leading-none', c.value)}>{value ?? '—'}</div>
    </div>
  );
};

// ── ConfirmModal ───────────────────────────────────────────────────────────────
export const ConfirmModal = ({
  isOpen, onClose, onConfirm, title, message, loading,
  confirmText = 'Delete', confirmVariant = 'danger', cancelText = 'Cancel'
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title || 'Confirm Action'}>
    <p className="text-gray-600 dark:text-[#a0a3b1] mb-6 whitespace-pre-line">{message}</p>
    <div className="flex gap-3 justify-end pt-5 border-t border-gray-200 dark:border-[#2d3052] flex-col-reverse sm:flex-row">
      <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelText}</Button>
      <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>{confirmText}</Button>
    </div>
  </Modal>
);

// ── Pagination ─────────────────────────────────────────────────────────────────
export const Pagination = ({ currentPage, totalResults, limit, onPageChange, onLimitChange }) => {
  const totalPages = Math.ceil(totalResults / limit);
  if (totalResults === 0) return null;

  const startResult = (currentPage - 1) * limit + 1;
  const endResult   = Math.min(currentPage * limit, totalResults);

  const getPageRange = () => {
    const range = [], delta = 1;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  };

  return (
    <div className="flex items-center justify-between flex-wrap gap-4 mt-10 p-4 md:p-5 bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-xl">
      <div className="text-[13px] text-gray-500 dark:text-[#6b6e82] font-medium">
        Showing <strong className="text-gray-900 dark:text-[#f0f0f8]">{startResult}</strong>{' '}
        to <strong className="text-gray-900 dark:text-[#f0f0f8]">{endResult}</strong>{' '}
        of <strong className="text-gray-900 dark:text-[#f0f0f8]">{totalResults}</strong> results
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button variant="ghost" size="sm" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>Prev</Button>
        <div className="flex items-center gap-1">
          {getPageRange().map((p, i) =>
            p === '...' ? (
              <span key={`sep-${i}`} className="px-2 text-gray-400 dark:text-[#6b6e82]">...</span>
            ) : (
              <div
                key={p}
                onClick={() => onPageChange(p)}
                className={cn(
                  'min-w-[32px] h-8 flex items-center justify-center rounded-lg text-[13px] font-semibold cursor-pointer transition-all',
                  currentPage === p
                    ? 'bg-[#6c63ff]/15 text-[#6c63ff] border border-[#6c63ff]'
                    : 'text-gray-600 dark:text-[#a0a3b1] hover:bg-gray-100 dark:hover:bg-[#242740] hover:text-gray-900 dark:hover:text-[#f0f0f8]'
                )}
              >{p}</div>
            )
          )}
        </div>
        <Button variant="ghost" size="sm" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>Next</Button>
      </div>

      <div className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-[#6b6e82]">
        Rows:
        <SelectDropdown
          value={limit}
          onChange={e => onLimitChange(Number(e.target.value))}
          options={[
            { value: 12, label: '12 per page' },
            { value: 16, label: '16 per page' },
            { value: 24, label: '24 per page' },
            { value: 48, label: '48 per page' }
          ]}
          styles={{
            control: (base) => ({
              ...base,
              minHeight: '32px',
              height: '32px',
              borderRadius: '6px',
            }),
            valueContainer: (base) => ({
              ...base,
              padding: '0 6px',
              height: '30px',
            }),
            indicatorsContainer: (base) => ({
              ...base,
              height: '30px',
            })
          }}
          className="min-w-[120px]"
        />
      </div>
    </div>
  );
};

export { Logo } from './Logo';
export { default as ImageUploader } from './ImageUploader';
