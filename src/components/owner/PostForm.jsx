import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Input, Button, ImageUploader } from '../common';
import { getPgOccupancyStatsApi } from '../../api/pg.api';
import { getPostImageUploadUrlApi, deletePostImageFileApi } from '../../api/post.api';
import { cn } from '../../utils/cn';

const occupancyOptions = [
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double' },
  { value: 'triple', label: 'Triple' },
  { value: 'four', label: 'Four' },
  { value: 'other', label: 'Other' },
];

const pgTypeOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unisex', label: 'Unisex' },
  { value: 'coLiving', label: 'Co-Living' },
];

export default function PostForm({ initialData, onSubmit, loading, pgs = [], buttonText = 'Submit', onCancel }) {
  const { register, handleSubmit, watch, setValue, reset, control, formState: { errors } } = useForm({
    defaultValues: {
      pgId: '', title: '', description: '', vacancyCount: '',
      maleVacancyCount: '', femaleVacancyCount: '',
      occupancyTypes: [], pgType: 'unisex', minPrice: '', maxPrice: '', availableFrom: '',
      images: [],
    }
  });

  const selectedPgId = watch('pgId');
  const isEdit = !!initialData;
  const [basePrice, setBasePrice] = useState({ min: 0, max: 0 });
  const [pgStats, setPgStats] = useState(null);

  useEffect(() => {
    if (initialData) {
      reset({
        pgId: initialData.pgId?._id || initialData.pgId || '',
        title: initialData.title || '',
        description: initialData.description || '',
        vacancyCount: initialData.vacancyCount || '',
        maleVacancyCount: initialData.maleVacancyCount ?? '',
        femaleVacancyCount: initialData.femaleVacancyCount ?? '',
        occupancyTypes: initialData.occupancyTypes || [],
        pgType: initialData.pgType || 'unisex',
        minPrice: initialData.minPrice || '',
        maxPrice: initialData.maxPrice || '',
        availableFrom: initialData.availableFrom ? initialData.availableFrom.slice(0, 10) : '',
        isActive: initialData.isActive !== false,
        images: initialData.images || [],
      });
      setBasePrice({ min: initialData.minPrice || 0, max: initialData.maxPrice || 0 });
    }
  }, [initialData, reset]);

  const isUnisex = watch('pgType') === 'unisex';
  const maleCount   = Number(watch('maleVacancyCount'))   || 0;
  const femaleCount = Number(watch('femaleVacancyCount')) || 0;

  // Fetch PG stats/occupancies when PG changes
  useEffect(() => {
    if (selectedPgId) {
      const pg = pgs.find(p => p._id === selectedPgId);
      if (pg && !isEdit) setValue('pgType', pg.pgType);

      getPgOccupancyStatsApi(selectedPgId).then(res => {
        const stats = res.data.data;
        setPgStats(stats);
        setBasePrice({ min: stats.minPrice, max: stats.maxPrice });

        if (!isEdit) {
          setValue('minPrice', stats.minPrice);
          setValue('maxPrice', stats.maxPrice);
          setValue('vacancyCount', stats.emptyBeds || 0);

          // Pre-select available occupancies by default
          if (stats.availableOccupancies && stats.availableOccupancies.length > 0) {
            setValue('occupancyTypes', stats.availableOccupancies);
          } else {
            setValue('occupancyTypes', ['single']); // fallback
          }
        }
      }).catch(err => console.error(err));
    }
  }, [selectedPgId, pgs, setValue, isEdit]);

  const currentPgType = watch('pgType');

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="col-span-full">
          <Controller
            name="pgId"
            control={control}
            rules={{ required: 'Please select a PG' }}
            render={({ field }) => (
              <Input 
                label="Select PG" 
                as="select" 
                value={field.value}
                onChange={field.onChange}
                ref={field.ref}
                error={errors.pgId?.message}
                required
                disabled={isEdit}
                options={[{ value: '', label: '— Select PG —' }, ...pgs.map(p => ({ value: p._id, label: p.name }))]}
              />
            )}
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
        
        {/* Vacancy count — single field for male/female/coLiving, split for unisex */}
        {isUnisex ? (
          <>
            <div className="flex flex-col gap-1">
              <Input
                label="♂ Male Vacancy Count"
                type="number"
                {...register('maleVacancyCount', { required: 'Required', min: { value: 0, message: 'Min 0' } })}
                error={errors.maleVacancyCount?.message}
                min={0}
                required
              />
              {pgStats && (
                <span className="text-[11px] text-gray-500 dark:text-[#6b6e82] px-1">
                  PG vacant beds: <strong className="text-[#ffa94d]">{pgStats.emptyBeds}</strong> (Override if needed)
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Input
                label="♀ Female Vacancy Count"
                type="number"
                {...register('femaleVacancyCount', { required: 'Required', min: { value: 0, message: 'Min 0' } })}
                error={errors.femaleVacancyCount?.message}
                min={0}
                required
              />
              {pgStats && (
                <span className="text-[11px] text-gray-500 dark:text-[#6b6e82] px-1">
                  PG vacant beds: <strong className="text-[#ffa94d]">{pgStats.emptyBeds}</strong> (Override if needed)
                </span>
              )}
            </div>
            {/* Computed total */}
            <div className="col-span-full mt-1">
              <div className="flex items-center gap-3 bg-[#6c63ff]/8 dark:bg-[#6c63ff]/10 border border-[#6c63ff]/25 rounded-xl px-4 py-3 text-[13px]">
                <span className="dark:text-[#a0a3b1] text-gray-500">Total vacancies:</span>
                <span className="font-extrabold text-[#6c63ff] text-base">{maleCount + femaleCount}</span>
                <span className="dark:text-[#6b6e82] text-gray-400 text-[11px]">(♂ {maleCount} male + ♀ {femaleCount} female)</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <Input
              label="Vacancy Count"
              type="number"
              {...register('vacancyCount', { required: 'Count is required', min: { value: 1, message: 'Min 1' } })}
              error={errors.vacancyCount?.message}
              min={1}
              required
            />
            {pgStats && (
              <span className="text-[11px] text-gray-500 dark:text-[#6b6e82] px-1">
                PG vacant beds: <strong className="text-[#ffa94d]">{pgStats.emptyBeds}</strong> (Override if needed)
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <Input
            label="Min Price (₹)"
            type="number"
            {...register('minPrice', { required: 'Min Price is required', min: 0 })}
            error={errors.minPrice?.message}
            min={0}
            required
          />
          {pgStats && (
            <span className="text-[11px] text-gray-500 dark:text-[#6b6e82] px-1">
              PG min price: <strong className="text-[#ffa94d]">₹{pgStats.minPrice?.toLocaleString('en-IN')}</strong> (Override if needed)
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Input
            label="Max Price (₹)"
            type="number"
            {...register('maxPrice', { required: 'Max Price is required', min: 0 })}
            error={errors.maxPrice?.message}
            min={0}
            required
          />
          {pgStats && (
            <span className="text-[11px] text-gray-500 dark:text-[#6b6e82] px-1">
              PG max price: <strong className="text-[#ffa94d]">₹{pgStats.maxPrice?.toLocaleString('en-IN')}</strong> (Override if needed)
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1]">
            PG Type {!isEdit && <span className="text-[11px] text-gray-500 dark:text-[#6b6e82] font-normal">(from selected PG)</span>}
          </label>
          <input
            className="w-full h-11 bg-white dark:bg-[#242740] border border-gray-200 dark:border-[#2d3052] rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 outline-none text-gray-900 dark:text-[#f0f0f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6e82] disabled:opacity-60 disabled:cursor-not-allowed"
            value={pgTypeOptions.find(o => o.value === currentPgType)?.label || currentPgType}
            readOnly
            disabled={!isEdit}
          />
          <input type="hidden" {...register('pgType')} />
        </div>
        
        <Controller
          name="availableFrom"
          control={control}
          rules={{ required: 'Date is required' }}
          render={({ field }) => (
            <Input 
              label="Available From" 
              type="date" 
              value={field.value}
              onChange={field.onChange}
              ref={field.ref}
              error={errors.availableFrom?.message}
              required 
            />
          )}
        />

        {/* Occupancy selection with inventory info */}
        <div className="col-span-full">
          <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-2">
            Occupancy Types <span className="text-[#ff4d6d]">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 p-4 bg-gray-50 dark:bg-[#242740] rounded-xl border border-gray-200 dark:border-[#2d3052]">
            {occupancyOptions.map((opt) => {
              const totalRooms = pgStats?.roomCountsBySharingType?.[opt.value] || 0;
              const vacantBeds = pgStats?.availableBedsBySharingType?.[opt.value] || 0;
              const hasVacancy = vacantBeds > 0;
              
              return (
                <label 
                  key={opt.value} 
                  className={cn(
                    "flex flex-col gap-1 p-3 rounded-lg border cursor-pointer select-none transition-all",
                    "hover:border-[#6c63ff]/50",
                    watch('occupancyTypes')?.includes(opt.value) 
                      ? "border-[#6c63ff] bg-[#6c63ff]/10 dark:bg-[#6c63ff]/15" 
                      : "border-gray-200 dark:border-[#2d3052] bg-white dark:bg-[#1a1d2e]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      value={opt.value}
                      {...register('occupancyTypes', { 
                        validate: (v) => (v && v.length > 0) || 'Select at least one occupancy type' 
                      })}
                      className="rounded text-[#6c63ff] focus:ring-[#6c63ff]"
                    />
                    <span className="text-xs font-bold text-gray-900 dark:text-[#f0f0f8] capitalize">{opt.label}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-[#6b6e82] pl-5 mt-0.5">
                    {totalRooms} {totalRooms === 1 ? 'Room' : 'Rooms'}
                    <span className={cn(
                      "block font-medium mt-0.5",
                      hasVacancy ? "text-[#00d4aa]" : "text-gray-400 dark:text-[#6b6e82]"
                    )}>
                      {vacantBeds} {vacantBeds === 1 ? 'bed left' : 'beds left'}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
          {errors.occupancyTypes && <span className="text-xs text-[#ff4d6d] font-medium mt-1.5 block">{errors.occupancyTypes.message}</span>}
        </div>

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
        <div className="col-span-full">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-1">
              Showcase Images
            </label>
            <Controller
              name="images"
              control={control}
              render={({ field }) => (
                <ImageUploader
                  initialImages={field.value}
                  onChange={field.onChange}
                  uploadUrlApi={getPostImageUploadUrlApi}
                  deleteUrlApi={deletePostImageFileApi}
                  maxImages={5}
                />
              )}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end mt-6 pt-5 border-t dark:border-[#2d3052] border-gray-200 flex-col-reverse sm:flex-row">
        <Button variant="ghost" type="button" onClick={() => onCancel ? onCancel() : reset()} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>{buttonText}</Button>
      </div>
    </form>
  );
}
