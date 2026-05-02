import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Input, Button } from '../common';

const occupancyOptions = [
  { value: 'single', label: 'Single' }, { value: 'double', label: 'Double' },
  { value: 'triple', label: 'Triple' }, { value: 'four', label: 'Four' }, { value: 'other', label: 'Other' },
];

const pgTypeOptions = [
  { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' },
  { value: 'unisex', label: 'Unisex' }, { value: 'coLiving', label: 'Co-Living' },
];

export default function PostForm({ initialData, onSubmit, loading, pgs = [], buttonText = 'Submit' }) {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      pgId: '', title: '', description: '', vacancyCount: '',
      occupancyType: 'single', pgType: 'unisex', pricePerBed: '', availableFrom: '',
    }
  });

  const selectedPgId = watch('pgId');
  const isEdit = !!initialData;

  useEffect(() => {
    if (initialData) {
      reset({
        pgId: initialData.pgId?._id || initialData.pgId || '',
        title: initialData.title || '',
        description: initialData.description || '',
        vacancyCount: initialData.vacancyCount || '',
        occupancyType: initialData.occupancyType || 'single',
        pgType: initialData.pgType || 'unisex',
        pricePerBed: initialData.pricePerBed || '',
        availableFrom: initialData.availableFrom ? initialData.availableFrom.slice(0, 10) : '',
      });
    }
  }, [initialData, reset]);

  // Auto-fill pgType when PG changes (only on create)
  useEffect(() => {
    if (selectedPgId && !isEdit) {
      const pg = pgs.find(p => p._id === selectedPgId);
      if (pg) setValue('pgType', pg.pgType);
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
          required 
        />
        <Input 
          label="Price Per Bed (₹)" 
          type="number" 
          {...register('pricePerBed', { required: 'Price is required', min: 0 })} 
          error={errors.pricePerBed?.message}
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
      </div>

      <div className="modal-footer" style={{ marginTop: 24 }}>
        <Button variant="ghost" type="button" onClick={() => reset()} disabled={loading}>Reset</Button>
        <Button type="submit" loading={loading}>{buttonText}</Button>
      </div>
    </form>
  );
}
