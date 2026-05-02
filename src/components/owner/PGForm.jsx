import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Input, Button } from '../common';
import FacilitiesPicker from '../common/FacilitiesPicker';

const pgTypeOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unisex', label: 'Unisex' },
  { value: 'coLiving', label: 'Co-Living' },
];

export default function PGForm({ initialData, onSubmit, loading, managers = [], facilitiesList = [], buttonText = 'Submit' }) {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      address: { landmark: '', city: '', state: '', country: 'India', pincode: '' },
      pgType: 'unisex',
      totalRooms: '',
      description: '',
      managerId: '',
      checkInTime: '',
      checkOutTime: '',
      facilities: []
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        address: {
          landmark: initialData.address?.landmark || '',
          city: initialData.address?.city || '',
          state: initialData.address?.state || '',
          country: initialData.address?.country || 'India',
          pincode: initialData.address?.pincode || ''
        },
        pgType: initialData.pgType || 'unisex',
        totalRooms: initialData.totalRooms || '',
        description: initialData.description || '',
        managerId: initialData.managerId?._id || initialData.managerId || '',
        checkInTime: initialData.checkInTime || '',
        checkOutTime: initialData.checkOutTime || '',
        facilities: initialData.facilities?.map(f => typeof f === 'object' ? f._id : f) || []
      });
    }
  }, [initialData, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
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
          type="tel" 
          {...register('address.pincode', { 
            required: 'Pincode is required',
            pattern: { value: /^[0-9]{6}$/, message: 'Must be 6 digits' }
          })} 
          error={errors.address?.pincode?.message} 
          maxLength={6} 
          required 
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
          label="Total Rooms" 
          type="number" 
          {...register('totalRooms', { required: 'Total Rooms is required', min: 1 })} 
          error={errors.totalRooms?.message} 
          required 
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

        {managers.length > 0 && (
          <Input
            label="Assign Manager" 
            as="select"
            {...register('managerId', { required: 'Please assign a manager' })}
            error={errors.managerId?.message}
            required
            options={[
              { value: '', label: '— Select Manager —' },
              ...managers.map(m => ({ 
                value: m._id, 
                label: m.role === 'owner' ? `${m.name} (Me)` : m.name 
              })),
            ]}
          />
        )}

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
        <Button variant="ghost" type="button" onClick={() => reset()} disabled={loading}>Reset</Button>
        <Button type="submit" loading={loading}>{buttonText}</Button>
      </div>
    </form>
  );
}
