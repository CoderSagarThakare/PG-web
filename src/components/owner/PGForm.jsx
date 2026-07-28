import { useEffect, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Input, Button, ImageUploader, Badge } from '../common';
import FacilitiesPicker from '../common/FacilitiesPicker';
import { getPGImageUploadUrlApi, deletePGImageFileApi, getPGPaymentQrUploadUrlApi } from '../../api/pg.api';

const pgTypeOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unisex', label: 'Unisex' },
  { value: 'coLiving', label: 'Co-Living' },
];

export default function PGForm({ initialData, onSubmit, loading, managers = [], facilitiesList = [], buttonText = 'Submit', onCancel }) {
  const [step, setStep] = useState(1);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const { register, handleSubmit, control, reset, setValue, trigger, watch, formState: { errors } } = useForm({
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
      pgStartedDate: '',
      images: [],
      upiId: '',
      paymentQrKey: '',
      location: {
        type: 'Point',
        coordinates: [] // no default coordinates
      }
    }
  });

  const coordinates = watch('location.coordinates');

  const [managerSearch, setManagerSearch] = useState('');
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);

  const newlyUploadedKeysRef = useRef(new Set());
  const removedExistingKeysRef = useRef(new Set());
  const isSubmittedRef = useRef(false);

  const cleanupUnsubmittedKeys = async () => {
    const keysToDelete = Array.from(newlyUploadedKeysRef.current);
    if (keysToDelete.length === 0) return;
    newlyUploadedKeysRef.current.clear();

    await Promise.all(
      keysToDelete.map(async (key) => {
        try {
          await deletePGImageFileApi(key);
        } catch (err) {
          console.error('Failed to clean up unsubmitted S3 file:', key, err);
        }
      })
    );
  };

  useEffect(() => {
    return () => {
      if (!isSubmittedRef.current) {
        cleanupUnsubmittedKeys();
      }
    };
  }, []);

  const handleUploadSuccess = (key) => {
    if (key) {
      newlyUploadedKeysRef.current.add(key);
    }
  };

  const handleImageRemoved = (key) => {
    if (!key) return;
    if (newlyUploadedKeysRef.current.has(key)) {
      newlyUploadedKeysRef.current.delete(key);
    } else {
      removedExistingKeysRef.current.add(key);
    }
  };

  const handleCancel = async () => {
    await cleanupUnsubmittedKeys();
    setManagerSearch('');
    if (onCancel) onCancel();
  };

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
        pgStartedDate: initialData.pgStartedDate ? new Date(initialData.pgStartedDate).toISOString().slice(0, 10) : '',
        images: initialData.images || [],
        upiId: initialData.upiId || '',
        paymentQrKey: initialData.paymentQrUrl || '',
        location: initialData.location || { type: 'Point', coordinates: [] }
      });
    }
  }, [initialData, reset, managers]);

  const handleGetLiveLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setValue('location.coordinates.0', Number(longitude.toFixed(6)), { shouldValidate: true });
        setValue('location.coordinates.1', Number(latitude.toFixed(6)), { shouldValidate: true });
        setLoadingLocation(false);
      },
      (error) => {
        console.error("Error capturing location:", error);
        setLoadingLocation(false);
        alert(`Failed to capture location: ${error.message}. Please verify browser permissions.`);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleFormSubmit = async (data) => {
    const cleaned = { ...data };

    // Clean empty optional fields so they don't fail backend validation
    if (!cleaned.landline?.trim()) delete cleaned.landline;
    
    // Auto-prepend https:// if link scheme is missing (e.g. maps.google.com)
    if (cleaned.locationLink?.trim()) {
      cleaned.locationLink = cleaned.locationLink.trim();
      if (!/^https?:\/\//i.test(cleaned.locationLink)) {
        cleaned.locationLink = `https://${cleaned.locationLink}`;
      }
    } else {
      delete cleaned.locationLink;
    }

    if (cleaned.address) {
      cleaned.address = { ...cleaned.address };
      if (!cleaned.address.locationDescription?.trim()) {
        delete cleaned.address.locationDescription;
      }
      if (cleaned.address.pincode) {
        cleaned.address.pincode = Number(cleaned.address.pincode);
      }
    }

    const lng = Number(cleaned.location?.coordinates?.[0]);
    const lat = Number(cleaned.location?.coordinates?.[1]);

    if (cleaned.location?.coordinates && !isNaN(lng) && isFinite(lng) && !isNaN(lat) && isFinite(lat)) {
      cleaned.location = {
        type: 'Point',
        coordinates: [lng, lat]
      };
    } else {
      delete cleaned.location;
    }

    if (cleaned.dueDayOfMonth) cleaned.dueDayOfMonth = Number(cleaned.dueDayOfMonth);
    if (cleaned.lateFee) cleaned.lateFee = Number(cleaned.lateFee);

    try {
      isSubmittedRef.current = true;
      if (onSubmit) {
        await onSubmit(cleaned);
      }

      if (removedExistingKeysRef.current.size > 0) {
        const keysToDelete = Array.from(removedExistingKeysRef.current);
        removedExistingKeysRef.current.clear();
        await Promise.all(
          keysToDelete.map(async (key) => {
            try {
              await deletePGImageFileApi(key);
            } catch (err) {
              console.error('Failed to clean up removed S3 file:', key, err);
            }
          })
        );
      }

      newlyUploadedKeysRef.current.clear();
    } catch (err) {
      console.error('PG Form submission failed:', err);
      isSubmittedRef.current = false;
    }
  };

  const filteredManagers = managers.filter(m => {
    const searchString = managerSearch.toLowerCase();
    const displayName = m.role === 'owner' ? `${m.name} (Me)` : m.name;
    const email = m.email || '';
    return displayName.toLowerCase().includes(searchString) || email.toLowerCase().includes(searchString);
  });

  const handleNextStep1 = async (e) => {
    if (e) e.preventDefault();
    const isValid = await trigger(['name', 'description', 'pgType', 'managerId', 'pgStartedDate', 'landline']);
    if (isValid) setStep(2);
  };

  const handleNextStep2 = async (e) => {
    if (e) e.preventDefault();
    const isValid = await trigger([
      'address.landmark', 'address.city', 'address.state', 'address.country', 
      'address.pincode', 'address.locationDescription', 'locationLink'
    ]);
    if (isValid) setStep(3);
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      {/* Stepper Header */}
      <div className="flex items-center justify-between mb-8 relative px-4 max-w-md mx-auto">
        {/* Connector Line */}
        <div className="absolute top-5 left-10 right-10 h-0.5 bg-gray-200 dark:bg-[#2d3052] -translate-y-1/2 z-0" />
        <div 
          className="absolute top-5 left-10 h-0.5 bg-[#6c63ff] -translate-y-1/2 z-0 transition-all duration-300"
          style={{ width: `${((step - 1) / 2) * 80}%` }}
        />

        {[
          { label: 'General', desc: 'Basic Details' },
          { label: 'Location', desc: 'Where to find' },
          { label: 'Features', desc: 'Details & Amenities' }
        ].map((s, idx) => {
          const num = idx + 1;
          const isCompleted = step > num;
          const isActive = step === num;
          return (
            <div key={num} className="flex flex-col items-center z-10 relative">
              <div 
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2 cursor-pointer ${
                  isCompleted 
                    ? "bg-[#6c63ff] border-[#6c63ff] text-white" 
                    : isActive 
                      ? "bg-white dark:bg-[#1a1d2e] border-[#6c63ff] text-[#6c63ff] shadow-md shadow-[#6c63ff]/20 font-black" 
                      : "bg-gray-100 dark:bg-[#242740] border-gray-200 dark:border-[#2d3052] text-gray-400 dark:text-[#6b6e82]"
                }`}
                onClick={async (e) => {
                  // Only allow clicking completed steps or current step
                  if (num < step) {
                    setStep(num);
                  } else if (num === 2 && step === 1) {
                    await handleNextStep1(e);
                  } else if (num === 3 && step === 2) {
                    await handleNextStep2(e);
                  }
                }}
              >
                {isCompleted ? '✓' : num}
              </div>
              <span className={`text-[10px] font-bold mt-1.5 ${
                isActive ? "text-[#6c63ff]" : "text-gray-500 dark:text-[#6b6e82]"
              }`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="min-h-[220px]">
        {/* Step 1: General Info */}
        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-[fadeIn_0.2s_ease]">
            <div className="col-span-full">
              <Input 
                label="PG Name" 
                {...register('name', { required: 'PG Name is required' })} 
                error={errors.name?.message} 
                required 
              />
            </div>
            
            <Controller
              name="pgType"
              control={control}
              rules={{ required: 'PG Type is required' }}
              render={({ field }) => (
                <Input
                  label="PG Type"
                  as="select"
                  value={field.value}
                  onChange={field.onChange}
                  ref={field.ref}
                  options={pgTypeOptions}
                  error={errors.pgType?.message}
                  required
                />
              )}
            />
            
            <Controller
              name="pgStartedDate"
              control={control}
              rules={{ required: 'PG Started Date is required' }}
              render={({ field }) => (
                <Input
                  label="PG Started Date"
                  type="date"
                  value={field.value}
                  onChange={field.onChange}
                  ref={field.ref}
                  error={errors.pgStartedDate?.message}
                  required
                />
              )}
            />

            <div className="col-span-full relative">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1]" htmlFor="managerSearch">
                  Assign Manager / Owner <span className="text-[#ff4d6d]">*</span>
                </label>
                <input
                  id="managerSearch"
                  type="text"
                  className="w-full h-11 bg-white dark:bg-[#242740] border border-gray-200 dark:border-[#2d3052] rounded-lg px-3 text-sm dark:text-[#f0f0f8] text-gray-900 outline-none focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff]/40 transition-all placeholder:text-gray-400 dark:placeholder:text-[#6b6e82]"
                  placeholder="Type to search and select manager/owner..."
                  value={managerSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setManagerSearch(val);
                    setValue('managerId', '', { shouldValidate: true });
                  }}
                  onFocus={() => setShowManagerDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowManagerDropdown(false), 200);
                  }}
                  required
                />
                <input type="hidden" {...register('managerId', { required: 'Please assign a manager or owner' })} />
                {errors.managerId && <span className="text-xs text-[#ff4d6d] font-medium mt-1 block">{errors.managerId.message}</span>}

                {showManagerDropdown && (
                  <div className="absolute top-[100%] left-0 right-0 z-[100] bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-lg max-h-[200px] overflow-y-auto mt-1.5 shadow-lg">
                    {filteredManagers.length === 0 ? (
                      <div className="px-3 py-2.5 text-xs text-gray-500 dark:text-[#6b6e82]">
                        No managers/owners found matching search
                      </div>
                    ) : (
                      filteredManagers.map(m => (
                        <div
                          key={m._id}
                          onMouseDown={() => {
                            setValue('managerId', m._id, { shouldValidate: true });
                            setManagerSearch(m.role === 'owner' ? `${m.name} (Me)` : m.name);
                            setShowManagerDropdown(false);
                          }}
                          className="px-3.5 py-2.5 cursor-pointer text-xs text-gray-900 dark:text-[#f0f0f8] hover:bg-gray-100 dark:hover:bg-[#242740] transition-colors border-b border-gray-100 dark:border-[#2d3052]/30 last:border-none"
                        >
                          {m.role === 'owner' ? `${m.name} (Me)` : m.name} ({m.email})
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-full">
              <Input 
                label="Contact No / Landline (Optional)" 
                placeholder="e.g. +919876543210"
                {...register('landline')} 
                error={errors.landline?.message} 
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
          </div>
        )}

        {/* Step 2: Address & Location Info */}
        {step === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-[fadeIn_0.2s_ease]">
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
              label="Google Maps Location Link (Optional)" 
              placeholder="e.g. https://maps.google.com/..."
              type="url"
              {...register('locationLink', {
                validate: (val) => !val || val.startsWith('http://') || val.startsWith('https://') || 'Must be a valid URL'
              })} 
              error={errors.locationLink?.message} 
            />
            <div className="col-span-full">
              <Input 
                label="Location Description (Optional)" 
                placeholder="e.g. Opposite Central Park, near metro pillar 42"
                {...register('address.locationDescription')} 
                error={errors.address?.locationDescription?.message} 
              />
            </div>

            {/* Coordinates Section */}
            <div className="col-span-full border-t dark:border-[#2d3052] border-gray-200 pt-4 mt-2">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h4 className="text-[13px] font-bold dark:text-[#f0f0f8] text-gray-900">Geospatial Coordinates</h4>
                  <p className="text-[11px] dark:text-[#6b6e82] text-gray-500">Live coordinates are used to calculate distances for nearby users</p>
                </div>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={handleGetLiveLocation}
                  type="button"
                  loading={loadingLocation}
                  className="rounded-full h-8 text-[11px] px-4 font-bold"
                >
                  📍 Capture Current Location
                </Button>
              </div>

              {/* Hidden inputs to capture React Hook Form state */}
              <input 
                type="hidden" 
                {...register('location.coordinates.0', { 
                  required: 'Longitude is required',
                  valueAsNumber: true 
                })} 
              />
              <input 
                type="hidden" 
                {...register('location.coordinates.1', { 
                  required: 'Latitude is required',
                  valueAsNumber: true 
                })} 
              />

              {/* Location Status Card */}
              <div className="p-4 bg-gray-50 dark:bg-[#242740] border border-gray-200 dark:border-[#2d3052] rounded-xl flex items-center justify-between gap-4 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${coordinates?.[0] && coordinates?.[1] ? 'bg-[#00d4aa]/15 text-[#00d4aa]' : 'bg-gray-100 dark:bg-[#1a1d2e] text-gray-400 dark:text-[#6b6e82]'}`}>
                    <span className="text-base">📍</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-[#f0f0f8]">
                      {coordinates?.[0] && coordinates?.[1] ? 'Location Coordinates Locked' : 'Location Not Set'}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-[#6b6e82] mt-0.5 font-mono">
                      {coordinates?.[0] && coordinates?.[1] 
                        ? `${coordinates[1].toFixed(6)}° N, ${coordinates[0].toFixed(6)}° E` 
                        : 'No coordinates captured. Click "Capture Current Location" to fetch.'}
                    </div>
                  </div>
                </div>
                {coordinates?.[0] && coordinates?.[1] && (
                  <Badge variant="success" className="h-5 text-[9px] px-2 font-bold uppercase tracking-wider">Active</Badge>
                )}
              </div>

              {(errors.location?.coordinates?.[0] || errors.location?.coordinates?.[1]) && (
                <span className="text-xs text-[#ff4d6d] font-medium mt-2 block">
                  {errors.location?.coordinates?.[0]?.message || errors.location?.coordinates?.[1]?.message || 'Coordinates are required'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Operations & Features Info */}
        {step === 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-[fadeIn_0.2s_ease]">
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

            <div className="col-span-full">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-1">
                  Facilities <span className="text-[#ff4d6d]">*</span>
                </label>
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
                {errors.facilities && <span className="text-xs text-[#ff4d6d] font-medium mt-1 block">{errors.facilities.message}</span>}
              </div>
            </div>

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
                      uploadUrlApi={getPGImageUploadUrlApi}
                      deleteUrlApi={deletePGImageFileApi}
                      maxImages={10}
                      onUploadSuccess={handleUploadSuccess}
                      onImageRemoved={handleImageRemoved}
                    />
                  )}
                />
              </div>
            </div>

            <div className="col-span-full border-t dark:border-[#2d3052] border-gray-200 pt-5 mt-2">
              <h4 className="text-[13px] font-bold dark:text-[#f0f0f8] text-gray-900 mb-0.5">Payment Settings (Optional)</h4>
              <p className="text-[11px] dark:text-[#6b6e82] text-gray-500 mb-4">Provide scanner and UPI ID so tenants can pay rent online directly from the app.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
                <Input
                  label="UPI ID (for Direct Pay)"
                  placeholder="e.g. owner@upi"
                  {...register('upiId', {
                    validate: (val) => !val || /^[\w.-]+@[\w.-]+$/.test(val) || 'Enter a valid UPI ID (e.g. name@bank)'
                  })}
                  error={errors.upiId?.message}
                />
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-1">
                    Payment QR Code Image
                  </label>
                  <Controller
                    name="paymentQrKey"
                    control={control}
                    render={({ field }) => (
                      <ImageUploader
                        initialImages={field.value ? [field.value] : []}
                        onChange={(val) => field.onChange(val?.[0] || '')}
                        uploadUrlApi={getPGPaymentQrUploadUrlApi}
                        deleteUrlApi={deletePGImageFileApi}
                        maxImages={1}
                        helpText="* Upload a high-quality payment QR scanner image. JPEG, PNG, WEBP files under 5MB are supported."
                        onUploadSuccess={handleUploadSuccess}
                        onImageRemoved={handleImageRemoved}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stepper Footer Controls */}
      <div className="flex gap-3 justify-between mt-8 pt-5 border-t border-gray-200 dark:border-[#2d3052] flex-col sm:flex-row">
        <div>
          {step > 1 && (
            <Button variant="ghost" type="button" onClick={handlePrevStep} disabled={loading}>
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-3 flex-col-reverse sm:flex-row">
          <Button variant="ghost" type="button" onClick={handleCancel} disabled={loading}>Cancel</Button>
          {step < 3 ? (
            <Button key="next-btn" type="button" onClick={step === 1 ? handleNextStep1 : handleNextStep2}>
              Next Step
            </Button>
          ) : (
            <Button key="submit-btn" type="submit" loading={loading}>{buttonText}</Button>
          )}
        </div>
      </div>
    </form>
  );
}
