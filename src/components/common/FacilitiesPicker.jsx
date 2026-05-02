import { useState, useRef } from 'react';

/**
 * Searchable multi-select facilities picker
 * Shows a search input, filtered dropdown list, and selected items as removable chips.
 *
 * @param {Object[]} options     - All available facilities [{ _id, name }]
 * @param {string[]} selected    - Array of selected facility _ids
 * @param {Function} onChange    - Called with new array of selected _ids
 */
export default function FacilitiesPicker({ options = [], selected = [], onChange }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const filtered = options.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) && !selected.includes(f._id)
  );

  const selectedFacilities = options.filter(f => selected.includes(f._id));

  // Show dropdown when open (on focus or typing)
  const showDropdown = open && filtered.length > 0;

  const add = (id) => {
    onChange([...selected, id]);
    // Don't clear search — let user keep filtering and selecting multiple
  };

  const remove = (id) => {
    onChange(selected.filter(s => s !== id));
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Selected chips */}
      {selectedFacilities.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {selectedFacilities.map(f => (
            <span
              key={f._id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 99,
                background: 'var(--primary-light)', color: 'var(--primary)',
                fontSize: 12, fontWeight: 600, border: '1px solid rgba(108,99,255,0.3)'
              }}
            >
              {f.name}
              <button
                type="button"
                onClick={() => remove(f._id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--primary)', lineHeight: 1, padding: 0,
                  fontSize: 14, fontWeight: 700, marginLeft: 2,
                  display: 'flex', alignItems: 'center'
                }}
                title={`Remove ${f.name}`}
              >×</button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <input
        ref={inputRef}
        type="text"
        className="form-control"
        placeholder={options.length === 0 ? 'Loading facilities...' : 'Click or type to search facilities...'}
        value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={options.length === 0}
      />

      {/* Dropdown — shown on focus OR when typing */}
      {showDropdown && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
          maxHeight: 220, overflowY: 'auto', marginTop: 4
        }}>
          {filtered.map(f => (
            <div
              key={f._id}
              onMouseDown={(e) => { e.preventDefault(); add(f._id); }}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 14,
                color: 'var(--text-primary)', transition: 'background 0.15s',
                display: 'flex', alignItems: 'center', gap: 8
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: '2px solid var(--primary)', background: 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
              }} />
              {f.name}
            </div>
          ))}
        </div>
      )}

      {open && search && filtered.length === 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginTop: 4,
          fontSize: 13, color: 'var(--text-muted)'
        }}>
          No matching facilities found
        </div>
      )}

      {selected.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          {selected.length} facilit{selected.length === 1 ? 'y' : 'ies'} selected
        </div>
      )}
    </div>
  );
}
