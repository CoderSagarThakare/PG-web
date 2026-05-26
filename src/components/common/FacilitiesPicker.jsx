import { useState, useRef } from 'react';
import { cn } from '../../utils/cn';

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
  };

  const remove = (id) => {
    onChange(selected.filter(s => s !== id));
  };

  return (
    <div className="relative">
      {/* Selected chips */}
      {selectedFacilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {selectedFacilities.map(f => (
            <span
              key={f._id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#6c63ff]/15 text-[#6c63ff] border border-[#6c63ff]/20 text-xs font-semibold leading-none"
            >
              {f.name}
              <button
                type="button"
                onClick={() => remove(f._id)}
                className="bg-transparent border-none cursor-pointer text-[#6c63ff] font-bold text-sm leading-none ml-1 hover:text-red-500 transition-colors p-0 flex items-center justify-center"
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
        className="w-full h-11 bg-white dark:bg-[#242740] border border-gray-200 dark:border-[#2d3052] rounded-lg px-3 text-sm dark:text-[#f0f0f8] text-gray-900 outline-none focus:border-[#6c63ff] transition-all"
        placeholder={options.length === 0 ? 'Loading facilities...' : 'Click or type to search facilities...'}
        value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={options.length === 0}
      />

      {/* Dropdown — shown on focus OR when typing */}
      {showDropdown && (
        <div className="absolute top-[100%] left-0 right-0 z-[200] bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-lg shadow-lg max-h-[220px] overflow-y-auto mt-1.5">
          {filtered.map(f => (
            <div
              key={f._id}
              onMouseDown={(e) => { e.preventDefault(); add(f._id); }}
              className="px-3.5 py-2.5 cursor-pointer text-sm text-gray-900 dark:text-[#f0f0f8] hover:bg-gray-100 dark:hover:bg-[#242740] transition-colors flex items-center gap-2 border-b border-gray-100 dark:border-[#2d3052]/30 last:border-none"
            >
              <span className="w-3.5 h-3.5 rounded border border-gray-300 dark:border-[#2d3052] flex-shrink-0 flex items-center justify-center bg-transparent" />
              {f.name}
            </div>
          ))}
        </div>
      )}

      {open && search && filtered.length === 0 && (
        <div className="absolute top-[100%] left-0 right-0 z-[200] bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-lg p-3 mt-1.5 text-xs text-gray-500 dark:text-[#6b6e82]">
          No matching facilities found
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-1.5 text-xs text-gray-500 dark:text-[#6b6e82]">
          {selected.length} facilit{selected.length === 1 ? 'y' : 'ies'} selected
        </div>
      )}
    </div>
  );
}
