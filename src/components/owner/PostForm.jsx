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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="col-span-full">
          <Input 
            label="Select PG" 
            as="select" 
            {...register('pgId', { required: 'Please select a PG' })}
            error={errors.pgId?.message}
            required
            options={[{ value: '', label: '— Select PG —' }, ...pgs.map(p => ({ value: p._id, label: p.name }))]}
          />
        </div>
        
        <div className="col-span-full">
          <Input 
            label="Post Title" 
            {...register('title', { required: 'Title is required' })} 
            error={errors.title?.message}
            required 
            placeholder="e.g. AC Double Room with Meals" 
          />
        </div>
        
        <div className="col-span-full">
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
          <div className="col-span-full text-xs bg-gray-50 dark:bg-[#242740] px-3.5 py-2.5 rounded-lg border-l-4 border-[#6c63ff] text-gray-500 dark:text-[#6b6e82] my-1">
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
        
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1]">
            PG Type {!isEdit && <span className="text-[11px] text-gray-500 dark:text-[#6b6e82] font-normal">(from selected PG)</span>}
          </label>
          <input
            className="w-full bg-white dark:bg-[#242740] border border-gray-200 dark:border-[#2d3052] rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 outline-none text-gray-900 dark:text-[#f0f0f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6e82] disabled:opacity-60 disabled:cursor-not-allowed"
            value={pgTypeOptions.find(o => o.value === currentPgType)?.label || currentPgType}
            readOnly
            disabled={!isEdit}
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
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1]">Post Status</label>
            <div className="flex items-center gap-3 h-[42px]">
              <label className="relative inline-block w-11 h-6 cursor-pointer">
                <input 
                  type="checkbox" 
                  {...register('isActive')} 
                  className="sr-only"
                />
                <div className={cn(
                  "w-full h-full rounded-full transition-colors duration-200",
                  watch('isActive') ? "bg-[#51cf66]" : "bg-gray-300 dark:bg-[#2d3052]"
                )} />
                <div className={cn(
                  "absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm",
                  watch('isActive') ? "translate-x-5" : "translate-x-0"
                )} />
              </label>
              <span className={cn(
                "text-sm font-semibold transition-colors duration-200",
                watch('isActive') ? "text-[#51cf66]" : "text-gray-500 dark:text-[#6b6e82]"
              )}>
                {watch('isActive') ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end mt-6 pt-5 border-t dark:border-[#2d3052] border-gray-200 flex-col-reverse sm:flex-row">
        <Button variant="ghost" type="button" onClick={() => onCancel ? onCancel() : reset()} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>{buttonText}</Button>
      </div>
    </form>
  );
}
