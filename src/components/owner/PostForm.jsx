import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Input, Button } from '../common';
import { getPgPriceRangeApi } from '../../api/pg.api';

const occupancyOptions = [
  { value: 'single', label: 'Single' }, { value: 'double', label: 'Double' },
  { value: 'triple', label: 'Triple' }, { value: 'four', label: 'Four' }, { value: 'other', label: 'Other' },
];

const pgTypeOptions = [
  { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' },
  { value: 'unisex', label: 'Unisex' }, { value: 'coLiving', label: 'Co-Living' },
];

export default function PostForm({ initialData, onSubmit, loading, pgs = [], buttonText = 'Submit', onCancel }) {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      pgId: '', title: '', description: '', vacancyCount: '',
      occupancyType: 'single', pgType: 'unisex', minPrice: '', maxPrice: '', availableFrom: '',
    }
  });

  const selectedPgId = watch('pgId');
  const isEdit = !!initialData;
  const [basePrice, setBasePrice] = useState({ min: 0, max: 0 });

  useEffect(() => {
    if (initialData) {
      reset({
        pgId: initialData.pgId?._id || initialData.pgId || '',
        title: initialData.title || '',
        description: initialData.description || '',
        vacancyCount: initialData.vacancyCount || '',
        occupancyType: initialData.occupancyType || 'single',
        pgType: initialData.pgType || 'unisex',
        minPrice: initialData.minPrice || '',
        maxPrice: initialData.maxPrice || '',
        availableFrom: initialData.availableFrom ? initialData.availableFrom.slice(0, 10) : '',
        isActive: initialData.isActive !== false,
      });
      setBasePrice({ min: initialData.minPrice || 0, max: initialData.maxPrice || 0 });
    }
  }, [initialData, reset]);

  // Auto-fill pgType and fetch price range when PG changes (on create and edit)
  useEffect(() => {
    if (selectedPgId) {
      const pg = pgs.find(p => p._id === selectedPgId);
      if (pg && !isEdit) setValue('pgType', pg.pgType);

      getPgPriceRangeApi(selectedPgId).then(res => {
        const { minPrice, maxPrice } = res.data.data;
        setBasePrice({ min: minPrice, max: maxPrice });
        setValue('minPrice', minPrice);
        setValue('maxPrice', maxPrice);
      }).catch(err => console.error(err));
    }
  }, [selectedPgId, pgs, setValue, isEdit]);

  const currentPgType = watch('pgType');

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="form-grid">
        <div className="full">
          <Input 
            label="Select PG" 
            as="select" 
            {...register('pgId', { required: 'Please select a PG' })}
            error={errors.pgId?.message}
            required
            options={[{ value: '', label: '— Select PG —' }, ...pgs.map(p => ({ value: p._id, label: p.name }))]}
          />
        </div>
        
        <div className="full">
          <Input 
            label="Post Title" 
            {...register('title', { required: 'Title is required' })} 
            error={errors.title?.message}
            required 
            placeholder="e.g. AC Double Room with Meals" 
          />
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
        
        <Input 
          label="Vacancy Count" 
          type="number" 
          {...register('vacancyCount', { required: 'Count is required', min: 1 })} 
          error={errors.vacancyCount?.message}
          min={1}
          required 
        />
        {selectedPgId && (
          <div className="full" style={{ 
            fontSize: 12, 
            background: 'var(--bg-elevated)', 
            padding: '10px 14px', 
            borderRadius: 8, 
            borderLeft: '4px solid var(--primary)',
            color: 'var(--text-muted)',
            marginTop: 4,
            marginBottom: 4 
          }}>
            💡 <strong>PG Bed Price Range:</strong> Available beds in this PG cost between <strong>₹{basePrice.min.toLocaleString('en-IN')}</strong> and <strong>₹{basePrice.max.toLocaleString('en-IN')}</strong>. You can customize the Min/Max price fields below.
          </div>
        )}
        <Input 
          label="Min Price (₹)" 
          type="number" 
          {...register('minPrice', { required: 'Min Price is required', min: 0 })} 
          error={errors.minPrice?.message}
          min={0}
          required 
        />
        <Input 
          label="Max Price (₹)" 
          type="number" 
          {...register('maxPrice', { required: 'Max Price is required', min: 0 })} 
          error={errors.maxPrice?.message}
          min={0}
          required 
        />
        
        <Input 
          label="Occupancy Type" 
          as="select" 
          {...register('occupancyType', { required: 'Required' })} 
          options={occupancyOptions} 
          required
        />
        
        <div className="form-group">
          <label className="form-label">
            PG Type {!isEdit && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>(from selected PG)</span>}
          </label>
          <input
            className="form-control"
            value={pgTypeOptions.find(o => o.value === currentPgType)?.label || currentPgType}
            readOnly
            disabled={!isEdit}
            style={{ opacity: !isEdit ? 0.6 : 1, cursor: !isEdit ? 'not-allowed' : 'pointer' }}
          />
          <input type="hidden" {...register('pgType')} />
        </div>
        
        <Input 
          label="Available From" 
          type="date" 
          {...register('availableFrom', { required: 'Date is required' })} 
          error={errors.availableFrom?.message}
          required 
        />

        {isEdit && (
          <div className="form-group">
            <label className="form-label">Post Status</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 42 }}>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, margin: 0 }}>
                <input 
                  type="checkbox" 
                  {...register('isActive')} 
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: watch('isActive') ? 'var(--success)' : 'var(--border)',
                  transition: '.3s', borderRadius: 24
                }}>
                  <span style={{
                    position: 'absolute', height: 18, width: 18, left: 3, bottom: 3,
                    backgroundColor: 'white', transition: '.3s', borderRadius: '50%',
                    transform: watch('isActive') ? 'translateX(20px)' : 'translateX(0)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </span>
              </label>
              <span style={{ fontWeight: 600, fontSize: 14, color: watch('isActive') ? 'var(--success)' : 'var(--text-muted)' }}>
                {watch('isActive') ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="modal-footer" style={{ marginTop: 24 }}>
        <Button variant="ghost" type="button" onClick={() => onCancel ? onCancel() : reset()} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>{buttonText}</Button>
      </div>
    </form>
  );
}
