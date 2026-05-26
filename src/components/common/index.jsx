import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

// ── Spinner ────────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 'md', center = false }) => {
  const el = (
    <div className={cn(
      'animate-spinner rounded-full border-2 border-gray-200 dark:border-[#2d3052] border-t-[#6c63ff] dark:border-t-[#6c63ff]',
      size === 'sm' ? 'w-5 h-5' : 'w-9 h-9'
    )} />
  );
  return center
    ? <div className="flex items-center justify-center min-h-[200px]">{el}</div>
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
  placeholder, error, required, disabled, as = 'input', options, rows, ...props
}, ref) => {
  const inputCls = cn(
    'w-full bg-white dark:bg-[#242740] border rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 outline-none',
    'text-gray-900 dark:text-[#f0f0f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6e82]',
    'focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff]/40',
    error
      ? 'border-[#ff4d6d]'
      : 'border-gray-200 dark:border-[#2d3052] hover:border-[#6c63ff]/50',
    disabled && 'opacity-50 cursor-not-allowed'
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
        <select {...commonProps}>
          {options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : as === 'textarea' ? (
        <textarea rows={rows || 4} {...commonProps} />
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
        <select
          className="px-2 py-1 bg-white dark:bg-[#242740] border border-gray-200 dark:border-[#2d3052] rounded-lg text-[12px] font-semibold text-gray-900 dark:text-[#f0f0f8] cursor-pointer outline-none"
          value={limit}
          onChange={e => onLimitChange(Number(e.target.value))}
        >
          <option value={9}>9 per page</option>
          <option value={18}>18 per page</option>
          <option value={36}>36 per page</option>
          <option value={77}>Show All</option>
        </select>
      </div>
    </div>
  );
};

export { Logo } from './Logo';
export { default as ImageUploader } from './ImageUploader';
