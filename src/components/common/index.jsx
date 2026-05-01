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

export const Input = ({
  label, name, type = 'text', value, onChange,
  placeholder, error, required, disabled, as = 'input', options, rows, ...props
}) => (
  <div className="form-group">
    {label && (
      <label className="form-label" htmlFor={name}>
        {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
    )}
    {as === 'select' ? (
      <select
        id={name} name={name} value={value} onChange={onChange}
        className="form-control" disabled={disabled} required={required} {...props}
      >
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    ) : as === 'textarea' ? (
      <textarea
        id={name} name={name} value={value} onChange={onChange}
        placeholder={placeholder} className="form-control"
        disabled={disabled} required={required} rows={rows || 4} {...props}
      />
    ) : (
      <input
        id={name} name={name} type={type} value={value} onChange={onChange}
        placeholder={placeholder} className="form-control"
        disabled={disabled} required={required} {...props}
      />
    )}
    {error && <span className="form-error">{error}</span>}
  </div>
);

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

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, loading }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title || 'Confirm Action'}>
    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{message}</p>
    <div className="modal-footer">
      <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
      <Button variant="danger" onClick={onConfirm} loading={loading}>Delete</Button>
    </div>
  </Modal>
);

export { Logo } from './Logo';
