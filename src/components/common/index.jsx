import { forwardRef } from 'react';

export const Spinner = ({ size = 'md', center = false }) => {
  const el = <div className={`spinner ${size === 'sm' ? 'spinner-sm' : ''}`} />;
  return center ? <div className="loading-center">{el}</div> : el;
};

export const EmptyState = ({ icon, title, description, action }) => (
  <div className="empty-state">
    {icon && <div>{icon}</div>}
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Badge = ({ children, variant = 'default' }) => (
  <span className={`badge badge-${variant}`}>{children}</span>
);

export const Button = ({
  children, variant = 'primary', size = '', onClick,
  disabled = false, loading = false, type = 'button', className = '', style = {}
}) => (
  <button
    type={type}
    className={`btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`}
    onClick={onClick}
    disabled={disabled || loading}
    style={style}
  >
    {loading ? <div className="spinner spinner-sm" /> : children}
  </button>
);

export const Card = ({ children, className = '', hover = false, onClick, style = {} }) => (
  <div
    className={`card ${hover ? 'card-hover' : ''} ${className}`}
    onClick={onClick}
    style={{ ...style, ...(onClick ? { cursor: 'pointer' } : {}) }}
  >
    {children}
  </div>
);

export const Input = forwardRef(({
  label, name, type = 'text', value, onChange,
  placeholder, error, required, disabled, as = 'input', options, rows, ...props
}, ref) => {
  const commonProps = {
    ref,
    id: name,
    name,
    placeholder,
    className: "form-control",
    disabled,
    required,
    ...(value !== undefined ? { value } : {}),
    ...(onChange ? { onChange } : {}),
    ...props
  };

  return (
    <div className="form-group">
      {label && (
        <label className="form-label" htmlFor={name}>
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      {as === 'select' ? (
        <select {...commonProps}>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : as === 'textarea' ? (
        <textarea rows={rows || 4} {...commonProps} />
      ) : (
        <input type={type} {...commonProps} />
      )}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
});
Input.displayName = 'Input';

export const Modal = ({ isOpen, onClose, title, children, size = '' }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${size === 'lg' ? 'modal-lg' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const StatCard = ({ label, value, icon, color = 'primary' }) => (
  <div className={`stat-card ${color}`}>
    {icon && <div className="stat-icon">{icon}</div>}
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value ?? '—'}</div>
  </div>
);

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, loading, confirmText = 'Delete', confirmVariant = 'danger' }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title || 'Confirm Action'}>
    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{message}</p>
    <div className="modal-footer">
      <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
      <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>{confirmText}</Button>
    </div>
  </Modal>
);

export { Logo } from './Logo';
