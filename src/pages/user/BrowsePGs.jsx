import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { discoverPGsApi, getFacilitiesApi, getPGByIdApi } from '../../api/pg.api';
import { Search, MapPin, Building2, Star, Users, Filter, ChevronRight, Info, Check, X } from 'lucide-react';
import { Button, Card, Badge, Modal, Spinner, EmptyState, QueryError, Input, Pagination, SelectDropdown, ImageLightbox } from '../../components/common';
import { useAuth } from '../../context/AuthContext';

export default function BrowsePGs() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const STORAGE_KEY = `staysync_pgs_filters_${user?._id || 'guest'}`;

  const getInitialFilters = () => {
    const defaults = {
      city: '', 
      pgType: '', 
      facilities: [],
      minRating: '',
      onlyWithVacancy: false
    };

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaults, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Failed to parse stored PG filters", e);
    }
    return defaults;
  };

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [filters, setFilters] = useState(getInitialFilters);
  const [activeFilters, setActiveFilters] = useState(getInitialFilters);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedPGId, setSelectedPGId] = useState(null);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [userLocation, setUserLocation] = useState({ latitude: '', longitude: '' });
  const [locationReady, setLocationReady] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  const handleDismissPrompt = () => {
    setShowLocationPrompt(false);
  };

  const executeGetLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    // ── Step 1: Check current permission state ──────────────────────────
    // NOTE: We do NOT touch locationReady here at all — it is only managed
    // by the initial useEffect. Touching it here would cause the full-page
    // spinner to flash while the native popup is open.
    let permissionState = 'prompt';
    let permissionStatus = null;
    try {
      if (navigator.permissions?.query) {
        permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        permissionState = permissionStatus.state;
      }
    } catch (err) {
      console.warn("Permissions API unavailable, falling back to default behaviour", err);
    }

    if (permissionState === 'denied') {
      // Already blocked — bail immediately, no native popup will appear
      toast.error("Location access is blocked. Please click the lock icon in your browser's address bar, set Location to 'Allow', then try again.");
      return;
    }

    if (permissionState === 'granted') {
      // No popup will appear — show the button spinner immediately since
      // GPS lookup is starting right now
      setLoadingLocation(true);
    } else {
      // permissionState === 'prompt':
      // The native browser popup is about to appear.
      // Do NOT show any spinner yet — user is reading the native popup.
      // The moment the user clicks Allow, fire the button spinner.
      if (permissionStatus) {
        permissionStatus.onchange = () => {
          if (permissionStatus.state === 'granted') {
            setLoadingLocation(true);
          }
          permissionStatus.onchange = null;
        };
      }
    }

    // ── Step 2: Call getCurrentPosition with the right timeout ──────────
    // 'granted' → 10 000 ms  (just a quick GPS lookup, no popup)
    // 'prompt'  → Infinity   (wait as long as the user needs; fires the
    //                          moment they click Allow or Block)
    const gpsTimeout = permissionState === 'granted' ? 10000 : Infinity;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const loc = {
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6)
        };
        setUserLocation(loc);
        localStorage.setItem('staysync_user_location', JSON.stringify(loc));
        localStorage.setItem('staysync_near_me_active', 'true');
        // locationReady is already true — changing userLocation drives a refetch
        // via the queryKey, which naturally shows isLoading during the API call
        setLoadingLocation(false);
        toast.success("Location locked successfully!");
      },
      (error) => {
        console.error("Geolocation error:", error.code, error.message);
        setLoadingLocation(false);
        if (error.code === 1) {
          toast.error("Location access was denied. Please update your browser settings to allow location and try again.");
        } else if (error.code === 2) {
          toast.error("Could not determine your location. Please check your device's location settings.");
        } else if (error.code === 3) {
          toast.error("Location request timed out. Please try again.");
        } else {
          toast.error("Location unavailable: " + error.message);
        }
      },
      { enableHighAccuracy: false, timeout: gpsTimeout, maximumAge: 0 }
    );
  };

  const handleAcceptPrompt = () => {
    setShowLocationPrompt(false);
    executeGetLocation();
  };

  const handleRequestLocation = async (e) => {
    if (e) e.preventDefault();
    
    // Check if browser permission is already granted
    let permissionGranted = false;
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        if (status.state === 'granted') {
          permissionGranted = true;
        }
      }
    } catch (err) {
      console.warn("Permissions API check failed", err);
    }

    if (permissionGranted) {
      executeGetLocation();
    } else {
      setShowLocationPrompt(true);
    }
  };

  const handleClearLocation = (e) => {
    if (e) e.preventDefault();
    setUserLocation({ latitude: '', longitude: '' });
    localStorage.removeItem('staysync_user_location');
    localStorage.removeItem('staysync_near_me_active');
    toast.success("Location filter cleared.");
  };

  useEffect(() => {
    const isNearMeActive = localStorage.getItem('staysync_near_me_active') === 'true';
    if (!isNearMeActive) {
      setUserLocation({ latitude: '', longitude: '' });
      setLocationReady(true);
      return;
    }

    const cachedLocation = localStorage.getItem('staysync_user_location');
    let cachedParsed = null;

    if (cachedLocation) {
      try {
        const parsed = JSON.parse(cachedLocation);
        if (parsed.latitude && parsed.longitude) {
          cachedParsed = parsed;
        }
      } catch (e) {
        console.error("Failed to parse cached location", e);
      }
    }

    // If we have cached coords AND permission is granted, fetch fresh GPS first
    const tryFreshLocation = async () => {
      let permissionGranted = false;
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({ name: 'geolocation' });
          permissionGranted = status.state === 'granted';
        }
      } catch (err) {
        console.warn("Permissions API check failed", err);
      }

      if (permissionGranted && navigator.geolocation) {
        // Fetch fresh coordinates before firing any API query
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const fresh = {
              latitude: latitude.toFixed(6),
              longitude: longitude.toFixed(6)
            };
            setUserLocation(fresh);
            localStorage.setItem('staysync_user_location', JSON.stringify(fresh));
            localStorage.setItem('staysync_near_me_active', 'true');
            setLocationReady(true);
          },
          () => {
            // Fresh fetch failed — fall back to cached if available
            if (cachedParsed) {
              setUserLocation(cachedParsed);
            } else {
              setUserLocation({ latitude: '', longitude: '' });
            }
            setLocationReady(true);
          },
          { enableHighAccuracy: false, timeout: 10000 }
        );
      } else if (cachedParsed) {
        // Permission not granted but we have old cache — use it
        setUserLocation(cachedParsed);
        setLocationReady(true);
      } else {
        // No permission, no cache — load without location
        setUserLocation({ latitude: '', longitude: '' });
        setLocationReady(true);
      }
    };

    tryFreshLocation();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setActiveFilters(filters);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [filters]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters, STORAGE_KEY]);

  const hasActiveFilters = () => {
    return (
      filters.city !== '' ||
      filters.pgType !== '' ||
      filters.facilities?.length > 0 ||
      filters.minRating !== '' ||
      filters.onlyWithVacancy === true ||
      !!(userLocation.latitude && userLocation.longitude)
    );
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.city) count++;
    if (filters.pgType) count++;
    if (filters.facilities && filters.facilities.length > 0) count += filters.facilities.length;
    if (filters.minRating) count++;
    if (filters.onlyWithVacancy) count++;
    if (userLocation.latitude && userLocation.longitude) count++;
    return count;
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['discover-pgs', activeFilters, page, limit, userLocation],
    queryFn: async () => (await discoverPGsApi({ 
      ...activeFilters, 
      page, 
      limit,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude
    })).data?.data,
    enabled: locationReady,
    retry: 1,
  });

  const { data: facilitiesList } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => (await getFacilitiesApi()).data?.data?.facilities || [],
  });

  const { data: pgDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['pg-detail', selectedPGId],
    queryFn: async () => (await getPGByIdApi(selectedPGId)).data?.data?.pg,
    enabled: !!selectedPGId,
  });

  const [amenitySearch, setAmenitySearch] = useState('');
  const filteredFacilities = facilitiesList?.filter(fac =>
    fac.name.toLowerCase().includes(amenitySearch.toLowerCase())
  ) || [];

  const pgs = data?.pgs || [];

  const handleFacilityToggle = (id) => {
    setFilters(prev => {
      const current = prev.facilities || [];
      const updated = current.includes(id) ? current.filter(f => f !== id) : [...current, id];
      return { ...prev, facilities: updated };
    });
  };

  const handleClearFilters = () => {
    setFilters({ city: '', pgType: '', facilities: [], minRating: '', onlyWithVacancy: false });
    setUserLocation({ latitude: '', longitude: '' });
    localStorage.removeItem('staysync_user_location');
    localStorage.removeItem('staysync_near_me_active');
    toast.success("All filters cleared successfully.");
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900">Explore Properties</h1>
          <p className="text-sm dark:text-[#6b6e82] text-gray-500 mt-1">Find the best PG buildings in your favorite cities</p>
        </div>
        {hasActiveFilters() && (
          <Button 
            variant="danger" 
            size="sm" 
            className="rounded-full font-bold px-4 h-9" 
            onClick={handleClearFilters}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center bg-light-surface dark:bg-dark-surface border border-gray-200 dark:border-[#2d3052] rounded-2xl md:rounded-full p-3 md:py-1.5 md:px-2 gap-3 md:gap-2.5 mb-6">
        <div className="flex items-center w-full md:flex-1 pl-1 md:pl-3 gap-2">
          <Search size={16} className="dark:text-[#6b6e82] text-gray-400 shrink-0" />
          <input
            className="bg-transparent border-none outline-none ml-1 text-[13px] dark:text-[#f0f0f8] text-gray-900 placeholder:text-gray-400 dark:placeholder:text-[#6b6e82] w-full"
            placeholder="Search city or property name..."
            value={filters.city}
            onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
          />
          {/* Geolocation Trigger / Badge */}
          {userLocation.latitude && userLocation.longitude ? (
            <div className="flex items-center gap-1 bg-green-500/10 dark:bg-green-500/20 text-green-500 text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 border border-green-500/20">
              <MapPin size={11} className="stroke-[3]" />
              <span>NEARBY</span>
              <button 
                onClick={handleClearLocation} 
                className="hover:text-red-500 ml-0.5 transition-colors"
                title="Clear location sorting"
              >
                <X size={10} className="stroke-[3]" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleRequestLocation}
              disabled={loadingLocation}
              className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all duration-200 shrink-0 ${
                loadingLocation 
                  ? 'bg-gray-100 dark:bg-[#242740] text-gray-400 dark:text-[#6b6e82] border-transparent' 
                  : 'bg-[#6c63ff]/10 dark:bg-[#6c63ff]/20 text-[#6c63ff] border-[#6c63ff]/20 hover:bg-[#6c63ff]/20 dark:hover:bg-[#6c63ff]/30'
              }`}
              title="Find properties near your current location"
            >
              {loadingLocation ? (
                <span className="w-3.5 h-3.5 border-2 border-[#6c63ff] border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <MapPin size={11} className="shrink-0" />
              )}
              <span>Near Me</span>
            </button>
          )}
        </div>
        
        <div className="hidden md:block w-px h-5 bg-gray-200 dark:bg-[#2d3052]" />
        <div className="block md:hidden h-px w-full bg-gray-100 dark:bg-[#2d3052]/30" />

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex-1 min-w-[130px] md:min-w-[150px]">
            <SelectDropdown
              value={filters.pgType}
              onChange={e => setFilters(f => ({ ...f, pgType: e.target.value }))}
              options={[
                { value: '', label: 'Any Category' },
                { value: 'male', label: 'Male Only' },
                { value: 'female', label: 'Female Only' },
                { value: 'unisex', label: 'Unisex / Co-Living' }
              ]}
              styles={{
                control: (base) => ({
                  ...base,
                  border: 0,
                  backgroundColor: 'transparent',
                  minHeight: 'auto',
                  boxShadow: 'none',
                  '&:hover': { border: 0 }
                })
              }}
            />
          </div>

          <div className="hidden md:block w-px h-5 bg-gray-200 dark:bg-[#2d3052]" />

          <div className="flex-1 min-w-[110px] md:min-w-[130px]">
            <SelectDropdown
              value={filters.minRating}
              onChange={e => setFilters(f => ({ ...f, minRating: e.target.value }))}
              options={[
                { value: '', label: 'Any Rating' },
                { value: '4.5', label: '4.5+ ★' },
                { value: '4.0', label: '4.0+ ★' },
                { value: '3.5', label: '3.5+ ★' },
                { value: '3.0', label: '3.0+ ★' }
              ]}
              styles={{
                control: (base) => ({
                  ...base,
                  border: 0,
                  backgroundColor: 'transparent',
                  minHeight: 'auto',
                  boxShadow: 'none',
                  '&:hover': { border: 0 }
                })
              }}
            />
          </div>

          <div className="hidden md:block w-px h-5 bg-gray-200 dark:bg-[#2d3052]" />

          <Button 
            variant={getActiveFiltersCount() > 0 ? "accent" : "ghost"} 
            onClick={() => setShowAdvancedFilters(true)}
            className="rounded-full h-8 px-4 text-[12px] md:mr-1 font-bold transition-all duration-200 flex-1 md:flex-none justify-center"
          >
            <Filter size={14} className="mr-1.5" /> 
            {getActiveFiltersCount() > 0 ? `Filters (${getActiveFiltersCount()})` : 'More Filters'}
          </Button>
        </div>
      </div>

      {!locationReady || isLoading ? <Spinner center /> : isError ? (
        <QueryError onRetry={refetch} error={error} />
      ) : pgs.length === 0 ? (
        <EmptyState 
          icon={<Building2 size={64} />} 
          title="No properties found" 
          description="We couldn't find any PGs in this location. Try adjusting your filters." 
          action={hasActiveFilters() ? (
            <Button 
              variant="danger" 
              size="sm" 
              className="font-bold px-5" 
              onClick={handleClearFilters}
            >
              Reset Filters
            </Button>
          ) : null}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pgs.map(pg => (
              <div key={pg._id} className="bg-light-surface dark:bg-dark-surface border border-gray-200 dark:border-[#2d3052] rounded-xl overflow-hidden transition-all duration-200 flex flex-col hover:border-[#6c63ff] hover:shadow-md cursor-pointer" onClick={() => setSelectedPGId(pg._id)}>
                <div className="h-[120px] bg-light-hover dark:bg-dark-elevated relative flex items-center justify-center overflow-hidden">
                  {pg.images && pg.images.length > 0 ? (
                    <img src={pg.images[0]} alt={pg.name} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                  ) : (
                    <Building2 size={40} className="opacity-10" />
                  )}
                  <div className="absolute top-2.5 right-2.5 bg-black/50 px-2 py-0.5 rounded flex items-center gap-1 text-white text-[11px] backdrop-blur-sm">
                    <Star size={12} fill="#ffa94d" color="#ffa94d" /> {pg.rating ?? 0}
                  </div>
                  <div className="absolute bottom-2.5 left-2.5">
                    <Badge variant={pg.pgType === 'male' ? 'info' : pg.pgType === 'female' ? 'danger' : 'accent'}>
                      {pg.pgType}
                    </Badge>
                  </div>
                </div>

                <div className="p-3.5 flex flex-col flex-1">
                  <h3 className="text-[16px] font-bold dark:text-[#f0f0f8] text-gray-900 mb-1 leading-snug truncate">{pg.name}</h3>
                  <div className="flex items-center justify-between gap-2 text-[12px] dark:text-[#6b6e82] text-gray-500 mb-3">
                    <div className="flex items-center gap-1 truncate">
                      <MapPin size={12} className="text-[#6c63ff] shrink-0" />
                      <span className="truncate">{pg.address?.city}, {pg.address?.state}</span>
                    </div>
                    {pg.distanceKm !== undefined && pg.location?.coordinates && (
                      <a
                        href={userLocation.latitude && userLocation.longitude
                          ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${pg.location.coordinates[1]},${pg.location.coordinates[0]}`
                          : `https://www.google.com/maps/dir/?api=1&destination=${pg.location.coordinates[1]},${pg.location.coordinates[0]}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-bold text-[#6c63ff] dark:text-[#8c85ff] bg-[#6c63ff]/10 hover:bg-[#6c63ff]/20 transition-colors px-1.5 py-0.5 rounded-md shrink-0 cursor-pointer flex items-center gap-0.5"
                        title="Open Google Maps"
                      >
                        📍 {Number(pg.distanceKm).toFixed(2)} km
                      </a>
                    )}
                  </div>

                  <div className="flex gap-1.5 mb-3">
                    <Badge variant="info" className="text-[9px] py-0.5">{pg.emptyBeds} Beds Left</Badge>
                    <Badge variant="ghost" className="text-[9px] py-0.5">{pg.totalRooms} Rooms</Badge>
                  </div>

                  <div className="mt-auto flex justify-between items-center">
                    <span className="text-[11px] dark:text-[#6b6e82] text-gray-500 font-semibold">Property View</span>
                    <ChevronRight size={16} className="text-[#6c63ff]" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination 
            currentPage={page} 
            totalResults={data?.total || 0} 
            limit={limit}
            onPageChange={setPage} 
            onLimitChange={(l) => { setLimit(l); setPage(1); }}
          />
        </>
      )}

      {/* Advanced Filters Modal */}
      <Modal 
        isOpen={showAdvancedFilters} 
        onClose={() => setShowAdvancedFilters(false)} 
        title="Advanced Filters"
      >
        <div className="flex flex-col gap-6 pb-3">


          <div className="detail-section">
            <div className="detail-section-title">Availability</div>
            <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg transition-all duration-200 hover:bg-[#6c63ff]/5">
              <input
                type="checkbox"
                checked={filters.onlyWithVacancy}
                onChange={e => setFilters(f => ({ ...f, onlyWithVacancy: e.target.checked }))}
                className="w-4 h-4 accent-[#6c63ff]"
              />
              <span className={`text-[13px] ${filters.onlyWithVacancy ? 'text-[#6c63ff] font-bold' : 'dark:text-[#a0a3b1] text-gray-600 font-medium'}`}>
                Only show properties with vacant beds (beds left &gt; 0)
              </span>
            </label>
          </div>

          <div className="detail-section">
            <div className="detail-section-title flex items-center justify-between mb-2.5">
              <span className="font-semibold text-gray-700 dark:text-[#a0a3b1] text-[13px]">Amenities &amp; Facilities</span>
              {filters.facilities?.length > 0 && (
                <span className="text-[10px] font-extrabold text-[#6c63ff] bg-[#6c63ff]/15 px-2.5 py-0.5 rounded-full uppercase">
                  {filters.facilities.length} Selected
                </span>
              )}
            </div>

            {/* Search Input for Amenities */}
            <div className="relative mb-3">
              <input
                type="text"
                className="w-full bg-white dark:bg-[#242740] border border-gray-200 dark:border-[#2d3052] rounded-lg pl-8 pr-7 py-2 text-xs text-gray-900 dark:text-[#f0f0f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6e82] focus:border-[#6c63ff] outline-none"
                placeholder="Search amenities..."
                value={amenitySearch}
                onChange={e => setAmenitySearch(e.target.value)}
              />
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#6b6e82]" />
              {amenitySearch && (
                <button
                  onClick={() => setAmenitySearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Scrollable Badges List */}
            <div className="max-h-[220px] overflow-y-auto pr-1 flex flex-col gap-3.5 border border-gray-200 dark:border-[#2d3052] rounded-xl p-3 bg-gray-50/30 dark:bg-[#242740]/10">
              {/* Selected Section */}
              {filters.facilities?.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="text-[10px] font-bold tracking-wider text-[#6c63ff] dark:text-[#8c85ff] uppercase flex items-center justify-between">
                    <span>Selected ({filters.facilities.length})</span>
                    <button 
                      type="button"
                      onClick={() => setFilters(prev => ({ ...prev, facilities: [] }))}
                      className="text-[9px] hover:underline normal-case font-medium text-red-500 hover:text-red-600"
                    >
                      Deselect All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {facilitiesList?.filter(fac => filters.facilities.includes(fac._id)).map(fac => (
                      <button
                        key={fac._id}
                        type="button"
                        onClick={() => handleFacilityToggle(fac._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150 bg-[#6c63ff] text-white hover:bg-red-500 dark:bg-[#6c63ff] dark:hover:bg-red-500 shadow-sm shadow-[#6c63ff]/20 fade-in"
                        title="Click to remove"
                      >
                        <Check size={12} className="stroke-[3] shrink-0" />
                        <span className="truncate max-w-[120px]">{fac.name}</span>
                        <X size={12} className="ml-0.5 shrink-0 opacity-80 hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                  <div className="h-px bg-gray-200 dark:bg-[#2d3052] mt-1" />
                </div>
              )}

              {/* Available Section */}
              <div className="flex flex-col gap-2">
                {filters.facilities?.length > 0 && (
                  <div className="text-[10px] font-bold tracking-wider text-gray-400 dark:text-[#6b6e82] uppercase">
                    Available Amenities
                  </div>
                )}
                {filteredFacilities.length === 0 ? (
                  <div className="text-[12px] text-gray-400 dark:text-[#6b6e82] py-4 text-center">
                    No matching amenities found
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {filteredFacilities.filter(fac => !filters.facilities.includes(fac._id)).map(fac => (
                      <button
                        key={fac._id}
                        type="button"
                        onClick={() => handleFacilityToggle(fac._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 bg-gray-100 hover:bg-gray-200 dark:bg-[#242740] dark:hover:bg-[#2d3052] text-gray-700 dark:text-[#a0a3b1] border border-gray-200 dark:border-[#2d3052] hover:border-gray-300 dark:hover:border-[#3d406a]"
                      >
                        <span className="truncate max-w-[150px]">{fac.name}</span>
                      </button>
                    ))}
                    {filteredFacilities.filter(fac => !filters.facilities.includes(fac._id)).length === 0 && (
                      <div className="text-[11px] text-gray-400 dark:text-[#6b6e82] py-2 text-center w-full italic">
                        All matching amenities selected
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-3">
            <Button 
              variant="danger" 
              className="flex-1" 
              onClick={() => { handleClearFilters(); setShowAdvancedFilters(false); }}
            >
              Reset All
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => setShowAdvancedFilters(false)}>
              Apply Filters
            </Button>
          </div>
        </div>
      </Modal>

      {/* Property Details Modal */}
      <Modal isOpen={!!selectedPGId} onClose={() => setSelectedPGId(null)} title={pgDetail?.name || "Loading..."} size="lg">
        {isDetailLoading ? <Spinner center /> : pgDetail && (
          <div className="fade-in text-[13px] flex flex-col gap-5">
            {/* Hero Banner Section */}
            <div className="flex gap-5 flex-col sm:flex-row bg-gray-50/50 dark:bg-[#242740]/10 border border-gray-100 dark:border-[#2d3052] p-4 rounded-2xl">
              <div className="flex-1 h-[150px] dark:bg-[#242740] bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden border border-gray-200/50 dark:border-[#2d3052]/50 relative group">
                {pgDetail.images && pgDetail.images.length > 0 ? (
                  <img src={pgDetail.images[0]} alt={pgDetail.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <Building2 size={48} className="opacity-15 text-[#6c63ff]" />
                )}
              </div>
              <div className="flex-[1.5] flex flex-col justify-between py-0.5">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant={pgDetail.pgType === 'male' ? 'info' : pgDetail.pgType === 'female' ? 'danger' : 'accent'} className="text-[10px] py-0.5 font-bold uppercase tracking-wider">
                      {pgDetail.pgType} Only
                    </Badge>
                    <div className="flex items-center gap-1 text-[#ffa94d] font-extrabold text-[12px] bg-[#ffa94d]/10 px-2 py-0.5 rounded-md">
                      <Star size={13} fill="#ffa94d" /> {pgDetail.rating ?? 0}
                    </div>
                  </div>
                  <h2 className="text-[22px] font-black dark:text-[#f0f0f8] text-gray-900 mb-1 leading-tight">{pgDetail.name}</h2>
                  <p className="flex items-center gap-1 dark:text-[#6b6e82] text-gray-500 text-[12px] font-medium">
                    <MapPin size={13} className="text-[#6c63ff]" /> {pgDetail.address?.city}, {pgDetail.address?.state}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="dark:bg-[#1a1d2e] bg-white border border-gray-100 dark:border-[#2d3052] px-3 py-2 rounded-xl flex flex-col justify-center">
                    <div className="text-[9px] dark:text-[#6b6e82] text-gray-400 font-bold uppercase tracking-wider">TOTAL CAPACITY</div>
                    <div className="text-[15px] font-black dark:text-[#f0f0f8] text-gray-900">{pgDetail.totalBeds} Beds</div>
                  </div>
                  <div className="dark:bg-[#1a1d2e] bg-white border border-[#00d4aa]/20 dark:border-[#00d4aa]/30 px-3 py-2 rounded-xl flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00d4aa]" />
                    <div className="text-[9px] text-[#00d4aa] dark:text-[#00e5b7] font-bold uppercase tracking-wider pl-1">AVAILABLE NOW</div>
                    <div className="text-[15px] font-black text-[#00d4aa] dark:text-[#00e5b7] pl-1">{pgDetail.emptyBeds} Vacant</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Location & Team Cards row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Location Details Card */}
              <div className="dark:bg-[#242740]/20 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 dark:border-[#2d3052] flex flex-col justify-between hover:border-[#6c63ff]/20 transition-all duration-200">
                <div>
                  <div className="text-[11px] font-bold tracking-wider text-[#6c63ff] dark:text-[#8c85ff] uppercase mb-2">📍 Location details</div>
                  <div className="text-[12px] dark:text-[#a0a3b1] text-gray-600 leading-[1.5]">
                    <div className="font-extrabold dark:text-[#f0f0f8] text-gray-900 text-[13px] mb-0.5">{pgDetail.address?.area}</div>
                    <div>{pgDetail.address?.city}, {pgDetail.address?.state} - {pgDetail.address?.pincode}</div>
                    {pgDetail.address?.landmark && (
                      <div className="mt-1 text-[#6c63ff] font-semibold text-[11px] bg-[#6c63ff]/5 px-2 py-0.5 rounded w-fit">
                        Landmark: {pgDetail.address.landmark}
                      </div>
                    )}
                  </div>
                </div>
                {pgDetail.location?.coordinates && (
                  <a
                    href={userLocation.latitude && userLocation.longitude
                      ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${pgDetail.location.coordinates[1]},${pgDetail.location.coordinates[0]}`
                      : `https://www.google.com/maps/dir/?api=1&destination=${pgDetail.location.coordinates[1]},${pgDetail.location.coordinates[0]}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-[#6c63ff]/10 hover:bg-[#6c63ff]/20 text-[#6c63ff] dark:text-[#8c85ff] border border-[#6c63ff]/25 hover:border-[#6c63ff]/50 font-extrabold text-[12px] rounded-xl transition-all shadow-sm uppercase tracking-wider"
                    title="Open Google Maps"
                  >
                    🗺️ Get Directions on Google Maps
                  </a>
                )}
              </div>

              {/* Management Team Card */}
              <div className="dark:bg-[#242740]/20 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 dark:border-[#2d3052] flex flex-col justify-between hover:border-[#ffa94d]/20 transition-all duration-200">
                <div>
                  <div className="text-[11px] font-bold tracking-wider text-[#ffa94d] uppercase mb-3">👥 Management Team</div>
                  <div className="flex flex-col gap-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#ffa94d]/10 text-[#ffa94d] border border-[#ffa94d]/20 flex items-center justify-center font-black text-xs shrink-0">
                        {pgDetail.ownerId?.name?.charAt(0).toUpperCase() || 'O'}
                      </div>
                      <div>
                        <div className="text-[12px] font-extrabold dark:text-[#f0f0f8] text-gray-900">{pgDetail.ownerId?.name}</div>
                        <div className="text-[10px] dark:text-[#6b6e82] text-gray-500 font-medium">{pgDetail.ownerId?.mobNo1} <span className="text-[#ffa94d] text-[9px] uppercase ml-1.5 px-1.5 py-0.2 bg-[#ffa94d]/10 rounded font-black">Owner</span></div>
                      </div>
                    </div>
                    {pgDetail.managerId && (
                      <div className="flex items-center gap-3 border-t border-gray-100 dark:border-[#2d3052]/50 pt-3">
                        <div className="w-8 h-8 rounded-full bg-[#6c63ff]/10 text-[#6c63ff] border border-[#6c63ff]/20 flex items-center justify-center font-black text-xs shrink-0">
                          {pgDetail.managerId?.name?.charAt(0).toUpperCase() || 'M'}
                        </div>
                        <div>
                          <div className="text-[12px] font-extrabold dark:text-[#f0f0f8] text-gray-900">{pgDetail.managerId?.name}</div>
                          <div className="text-[10px] dark:text-[#6b6e82] text-gray-500 font-medium">{pgDetail.managerId?.mobNo1} <span className="text-[#6c63ff] text-[9px] uppercase ml-1.5 px-1.5 py-0.2 bg-[#6c63ff]/10 rounded font-black">Manager</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Section */}
            <div className="dark:bg-[#242740]/20 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 dark:border-[#2d3052]">
              <div className="text-[11px] font-bold tracking-wider dark:text-[#f0f0f8] text-gray-700 uppercase mb-3">📋 Property Inventory</div>
              <div className="grid grid-cols-4 gap-3">
                <div className="dark:bg-[#1a1d2e] bg-white border border-gray-100 dark:border-[#2d3052] p-3 rounded-xl text-center hover:scale-[1.02] transition-transform duration-200">
                  <div className="text-[20px] font-black dark:text-[#f0f0f8] text-gray-900">{pgDetail.totalRooms}</div>
                  <div className="text-[9px] dark:text-[#6b6e82] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Rooms</div>
                </div>
                <div className="dark:bg-[#1a1d2e] bg-white border border-gray-100 dark:border-[#2d3052] p-3 rounded-xl text-center hover:scale-[1.02] transition-transform duration-200">
                  <div className="text-[20px] font-black dark:text-[#f0f0f8] text-gray-900">{pgDetail.totalBeds}</div>
                  <div className="text-[9px] dark:text-[#6b6e82] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Total Beds</div>
                </div>
                <div className="dark:bg-[#1a1d2e] bg-white border border-gray-100 dark:border-[#2d3052] p-3 rounded-xl text-center hover:scale-[1.02] transition-transform duration-200">
                  <div className="text-[20px] font-black text-[#ff4d6d]">{pgDetail.occupiedBeds}</div>
                  <div className="text-[9px] dark:text-[#6b6e82] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Occupied</div>
                </div>
                <div className="dark:bg-[#1a1d2e] bg-white border border-[#00d4aa]/20 p-3 rounded-xl text-center hover:scale-[1.02] transition-transform duration-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#00d4aa]" />
                  <div className="text-[20px] font-black text-[#00d4aa]">{pgDetail.emptyBeds}</div>
                  <div className="text-[9px] text-[#00d4aa] font-bold uppercase tracking-wider mt-0.5">Vacant</div>
                </div>
              </div>
            </div>

            {/* Description */}
            {pgDetail.description && (
              <div className="dark:bg-[#242740]/20 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 dark:border-[#2d3052]">
                <div className="text-[11px] font-bold tracking-wider dark:text-[#f0f0f8] text-gray-700 uppercase mb-2.5">📝 About this Property</div>
                <div className="text-[12.5px] dark:text-[#a0a3b1] text-gray-600 leading-[1.6] dark:bg-[#1a1d2e] bg-white p-3.5 rounded-xl border-l-[3.5px] border-[#6c63ff] font-medium shadow-sm">
                  {pgDetail.description}
                </div>
              </div>
            )}

            {/* Amenities */}
            {pgDetail.facilities && pgDetail.facilities.length > 0 && (
              <div className="dark:bg-[#242740]/20 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 dark:border-[#2d3052]">
                <div className="text-[11px] font-bold tracking-wider dark:text-[#f0f0f8] text-gray-700 uppercase mb-3">⭐ Property Amenities</div>
                <div className="flex flex-wrap gap-2">
                  {pgDetail.facilities?.map(f => (
                    <div key={f._id} className="flex items-center gap-2 px-3 py-1.5 dark:bg-[#1a1d2e] bg-white rounded-lg text-[11px] border border-gray-100 dark:border-[#2d3052] font-semibold dark:text-[#f0f0f8] text-gray-700 hover:border-[#6c63ff]/20 transition-all duration-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] shrink-0" />
                      {f.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {pgDetail.images && pgDetail.images.length > 0 && (
              <div className="dark:bg-[#242740]/20 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 dark:border-[#2d3052]">
                <div className="text-[11px] font-bold tracking-wider dark:text-[#f0f0f8] text-gray-700 uppercase mb-3">📸 Property Gallery</div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {pgDetail.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setLightboxImages(pgDetail.images); setLightboxIdx(idx); }}
                      className="aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-[#2d3052] block hover:border-[#6c63ff] transition-all hover:scale-[1.02] shadow-sm cursor-zoom-in w-full"
                    >
                      <img src={img} alt={`Showcase ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom CTA footer */}
            <div className="p-4 bg-[#6c63ff]/10 dark:bg-[#6c63ff]/15 border border-[#6c63ff]/20 rounded-2xl flex items-center gap-3.5 flex-wrap sm:flex-nowrap">
              <div className="w-10 h-10 rounded-full bg-[#6c63ff]/20 flex items-center justify-center shrink-0 text-[#6c63ff]">
                <Info size={22} className="stroke-[2.5]" />
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="font-extrabold text-[#6c63ff] dark:text-[#8c85ff] text-[13px]">Interested in this Property?</div>
                <div className="text-[11px] dark:text-[#a0a3b1] text-gray-500 font-medium mt-0.5">Explore and book available rooms in this building via Discover Stays.</div>
              </div>
              <Button 
                onClick={() => navigate('/browse', { state: { pgId: pgDetail._id, pgName: pgDetail.name } })} 
                variant="custom"
                className="text-[11px] font-black px-5 py-2.5 rounded-xl uppercase tracking-wider bg-[#6c63ff]/10 hover:bg-[#6c63ff]/20 text-[#6c63ff] border border-[#6c63ff]/25 hover:border-[#6c63ff]/50 transition-all shrink-0 w-full sm:w-auto justify-center shadow-sm"
              >
                Go to Stays
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Custom Location Permission Prompt Modal */}
      <Modal
        isOpen={showLocationPrompt}
        onClose={handleDismissPrompt}
        title="Find Stays Near You"
        size="sm"
      >
        <div className="flex flex-col items-center text-center p-4">
          <div className="w-12 h-12 rounded-full bg-[#6c63ff]/10 flex items-center justify-center text-[#6c63ff] mb-4">
            <MapPin size={24} className="stroke-[2.5]" />
          </div>
          <h3 className="text-[16px] font-black dark:text-[#f0f0f8] text-gray-900 mb-2">Find Stays Near You</h3>
          <p className="text-[13px] dark:text-[#a0a3b1] text-gray-500 leading-relaxed mb-6">
            Allow location access to sort properties by proximity and see distance badges.
          </p>
          <div className="flex gap-3 w-full">
            <Button 
              variant="ghost" 
              className="flex-1 font-bold text-[12px] h-10 rounded-xl"
              onClick={handleDismissPrompt}
            >
              Not Now
            </Button>
            <Button 
              variant="primary" 
              className="flex-1 font-bold text-[12px] h-10 rounded-xl bg-[#6c63ff] hover:bg-[#5b52e0] text-white"
              onClick={handleAcceptPrompt}
            >
              Allow Location
            </Button>
          </div>
        </div>
      </Modal>

      {/* Image Lightbox */}
      {lightboxIdx !== null && (
        <ImageLightbox
          images={lightboxImages}
          startIndex={lightboxIdx}
          onClose={() => { setLightboxIdx(null); setLightboxImages([]); }}
        />
      )}
    </div>
  );
}
