import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Input, Button } from '../common';
import FacilitiesPicker from '../common/FacilitiesPicker';

const pgTypeOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unisex', label: 'Unisex' },
  { value: 'coLiving', label: 'Co-Living' },
];

export default function PGForm({ initialData, onSubmit, loading, managers = [], facilitiesList = [], buttonText = 'Submit', onCancel }) {
  const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      address: { landmark: '', city: '', state: '', country: 'India', pincode: '', locationDescription: '' },
      pgType: 'unisex',
      description: '',
      managerId: '',
      checkInTime: '',
      checkOutTime: '',
      dueDayOfMonth: 10,
      lateFee: 0,
      facilities: [],
      landline: '',
      locationLink: '',
      pgStartedDate: ''
    }
  });

  const [managerSearch, setManagerSearch] = useState('');
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);

  useEffect(() => {
    if (initialData) {
      // Pre-fill manager search name
      const currentManagerId = initialData.managerId?._id || initialData.managerId || '';
      const currentManager = managers.find(m => m._id === currentManagerId);
      if (currentManager) {
        setManagerSearch(currentManager.role === 'owner' ? `${currentManager.name} (Me)` : currentManager.name);
      } else {
        setManagerSearch('');
      }

      reset({
        name: initialData.name || '',
        address: {
          landmark: initialData.address?.landmark || '',
          city: initialData.address?.city || '',
          state: initialData.address?.state || '',
          country: initialData.address?.country || 'India',
          pincode: initialData.address?.pincode || '',
          locationDescription: initialData.address?.locationDescription || ''
        },
        pgType: initialData.pgType || 'unisex',
        description: initialData.description || '',
        managerId: initialData.managerId?._id || initialData.managerId || '',
        checkInTime: initialData.checkInTime || '',
        checkOutTime: initialData.checkOutTime || '',
        dueDayOfMonth: initialData.dueDayOfMonth || 10,
        lateFee: initialData.lateFee || 0,
        facilities: initialData.facilities?.map(f => typeof f === 'object' ? f._id : f) || [],
        landline: initialData.landline || '',
        locationLink: initialData.locationLink || '',
        pgStartedDate: initialData.pgStartedDate ? new Date(initialData.pgStartedDate).toISOString().slice(0, 10) : ''
      });
    }
  }, [initialData, reset, managers]);

  const handleFormSubmit = (data) => {
    const cleaned = { ...data };

    // Clean empty optional fields so they don't fail backend validation
    if (!cleaned.landline?.trim()) delete cleaned.landline;
    if (!cleaned.locationLink?.trim()) delete cleaned.locationLink;

    if (cleaned.address) {
      cleaned.address = { ...cleaned.address };
      if (!cleaned.address.locationDescription?.trim()) {
        delete cleaned.address.locationDescription;
      }
      if (cleaned.address.pincode) {
        cleaned.address.pincode = Number(cleaned.address.pincode);
      }
    }

    if (cleaned.dueDayOfMonth) cleaned.dueDayOfMonth = Number(cleaned.dueDayOfMonth);
    if (cleaned.lateFee) cleaned.lateFee = Number(cleaned.lateFee);

    onSubmit(cleaned);
  };

  const filteredManagers = managers.filter(m => {
    const searchString = managerSearch.toLowerCase();
    const displayName = m.role === 'owner' ? `${m.name} (Me)` : m.name;
    const email = m.email || '';
    return displayName.toLowerCase().includes(searchString) || email.toLowerCase().includes(searchString);
  });

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <div className="form-grid">
        <div className="full">
          <Input 
            label="PG Name" 
            {...register('name', { required: 'PG Name is required' })} 
            error={errors.name?.message} 
            required 
          />
        </div>
        
        <Input 
          label="Landmark" 
          {...register('address.landmark', { required: 'Landmark is required' })} 
          error={errors.address?.landmark?.message} 
          required 
        />
        <Input 
          label="City" 
          {...register('address.city', { required: 'City is required' })} 
          error={errors.address?.city?.message} 
          required 
        />
        <Input 
          label="State" 
          {...register('address.state', { required: 'State is required' })} 
          error={errors.address?.state?.message} 
          required 
        />
        <Input 
          label="Country" 
          {...register('address.country', { required: 'Country is required' })} 
          error={errors.address?.country?.message} 
          required 
        />
        <Input 
          label="Pincode" 
          type="number" 
          {...register('address.pincode', { 
            required: 'Pincode is required',
            pattern: { value: /^[0-9]{6}$/, message: 'Must be 6 digits' }
          })} 
          error={errors.address?.pincode?.message} 
          min={0}
          required 
        />
        <Input 
          label="Location Description (Optional)" 
          placeholder="e.g. Opposite Central Park, near metro pillar 42"
          {...register('address.locationDescription')} 
          error={errors.address?.locationDescription?.message} 
        />
        
        <Input
          label="PG Type" 
          as="select" 
          {...register('pgType', { required: 'PG Type is required' })} 
          options={pgTypeOptions}
          error={errors.pgType?.message}
          required
        />
        <Input 
          label="Contact No / Landline (Optional)" 
          placeholder="e.g. +919876543210"
          {...register('landline')} 
          error={errors.landline?.message} 
        />
        
        <Input 
          label="Check-In Time" 
          type="time" 
          {...register('checkInTime', { required: 'Check-In Time is required' })} 
          error={errors.checkInTime?.message} 
          required 
        />
        <Input 
          label="Check-Out Time" 
          type="time" 
          {...register('checkOutTime', { required: 'Check-Out Time is required' })} 
          error={errors.checkOutTime?.message} 
          required 
        />

        <Input 
          label="Due Day of Month (1-28)" 
          type="number" 
          {...register('dueDayOfMonth', { 
            required: 'Due day is required',
            min: { value: 1, message: 'Must be between 1 and 28' },
            max: { value: 28, message: 'Must be between 1 and 28' }
          })} 
          error={errors.dueDayOfMonth?.message} 
          min={1}
          max={28}
          required 
        />
        <Input 
          label="Late Fee Penalty (₹)" 
          type="number" 
          {...register('lateFee', { 
            required: 'Penalty is required',
            min: { value: 0, message: 'Cannot be negative' }
          })} 
          error={errors.lateFee?.message} 
          min={0}
          required 
        />

        <Input 
          label="Google Maps Location Link (Optional)" 
          placeholder="e.g. https://maps.google.com/..."
          type="url"
          {...register('locationLink', {
            validate: (val) => !val || val.startsWith('http://') || val.startsWith('https://') || 'Must be a valid URL'
          })} 
          error={errors.locationLink?.message} 
        />
        <Input 
          label="PG Started Date" 
          type="date" 
          {...register('pgStartedDate', { required: 'PG Started Date is required' })} 
          error={errors.pgStartedDate?.message} 
          required
        />

        <div className="full" style={{ position: 'relative' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="managerSearch">
              Assign Manager / Owner <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="managerSearch"
              type="text"
              className="form-control"
              placeholder="Type to search and select manager/owner..."
              value={managerSearch}
              onChange={(e) => {
                const val = e.target.value;
                setManagerSearch(val);
                setValue('managerId', '', { shouldValidate: true }); // Clear ID so validation forces choice
              }}
              onFocus={() => setShowManagerDropdown(true)}
              onBlur={() => {
                // Delay hiding dropdown so onClick event registers
                setTimeout(() => setShowManagerDropdown(false), 200);
              }}
              required
            />
            <input type="hidden" {...register('managerId', { required: 'Please assign a manager or owner' })} />
            {errors.managerId && <span className="form-error">{errors.managerId.message}</span>}

            {showManagerDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 100,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                maxHeight: 200,
                overflowY: 'auto',
                marginTop: 4,
                boxShadow: 'var(--shadow-md)'
              }}>
                {filteredManagers.length === 0 ? (
                  <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>
                    No managers/owners found matching search
                  </div>
                ) : (
                  filteredManagers.map(m => (
                    <div
                      key={m._id}
                      onClick={() => {
                        setValue('managerId', m._id, { shouldValidate: true });
                        setManagerSearch(m.role === 'owner' ? `${m.name} (Me)` : m.name);
                        setShowManagerDropdown(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        fontSize: 12,
                        cursor: 'pointer',
                        background: 'transparent',
                        color: 'var(--text-primary)',
                        borderBottom: '1px solid var(--border-light)'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      {m.role === 'owner' ? `${m.name} (Me)` : m.name} ({m.email})
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="full">
          <Input 
            label="Description" 
            as="textarea" 
            {...register('description', { required: 'Description is required' })} 
            error={errors.description?.message}
            required 
          />
        </div>

        <div className="full">
          <div className="form-group">
            <label className="form-label">Facilities <span style={{ color: 'var(--danger)' }}>*</span></label>
            <Controller
              name="facilities"
              control={control}
              rules={{ validate: (val) => val?.length > 0 || 'Select at least one facility' }}
              render={({ field }) => (
                <FacilitiesPicker
                  options={facilitiesList}
                  selected={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.facilities && <span className="form-error">{errors.facilities.message}</span>}
          </div>
        </div>
      </div>

      <div className="modal-footer" style={{ marginTop: 24 }}>
        <Button variant="ghost" type="button" onClick={() => { setManagerSearch(''); if (onCancel) onCancel(); }} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>{buttonText}</Button>
      </div>
    </form>
  );
}
