import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { searchPostsApi } from '../../api/post.api';
import { getFacilitiesApi } from '../../api/pg.api';
import { createEnquiryApi, updateEnquiryApi } from '../../api/enquiry.api';
import { Search, MapPin, Bed, Filter, Phone, User as UserIcon, CheckCircle2, Building2, X, ArrowLeft, Check } from 'lucide-react';
import { Button, Card, Badge, Modal, Spinner, EmptyState, Input, Pagination, SelectDropdown } from '../../components/common';
import { getErrorMessage, formatPrice } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

export default function BrowsePosts() {
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const STORAGE_KEY = `staysync_posts_filters_${user?._id || 'guest'}`;

  const initialPgId = location.state?.pgId || '';
  const initialPgName = location.state?.pgName || '';

  const getInitialFilters = () => {
    const defaults = {
      title: '', 
      city: '', 
      pgType: '', 
      occupancyType: '', 
      minPrice: '', 
      maxPrice: '', 
      facilities: [],
      minRating: '',
      onlyWithVacancy: false,
      pgId: initialPgId
    };

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const pgId = initialPgId || parsed.pgId || '';
        return { ...defaults, ...parsed, pgId };
      }
    } catch (e) {
      console.error("Failed to parse stored filters", e);
    }
    return defaults;
  };

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [filters, setFilters] = useState(getInitialFilters);
  const [activeFilters, setActiveFilters] = useState(getInitialFilters);
  const [selectedPgName, setSelectedPgName] = useState(() => {
    if (initialPgName) return initialPgName;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const pgId = initialPgId || parsed.pgId || '';
        if (pgId && pgId === parsed.pgId) {
          return parsed.selectedPgName || 'Selected PG';
        }
      }
    } catch {}
    return '';
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewPost, setViewPost] = useState(null);
  const [userLocation, setUserLocation] = useState({ latitude: '', longitude: '' });
  const [locationReady, setLocationReady] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  const handleDismissPrompt = () => {
    setShowLocationPrompt(false);
  };

  const executeGetLocation = () => {
    if (navigator.geolocation) {
      setLoadingLocation(true);
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
          setLocationReady(true);
          setLoadingLocation(false);
          toast.success("Location locked successfully!");
        },
        (error) => {
          console.error("Browser Geolocation error:", error.code, error.message);
          setLoadingLocation(false);
          setUserLocation({ latitude: '', longitude: '' });
          setLocationReady(true);
          if (error.code === 1) { // PERMISSION_DENIED
            toast.error(
              "Location access is blocked. Please click the lock/settings icon in your browser's address bar next to the URL, set Location to 'Allow', and refresh the page."
            );
          } else if (error.code === 3) { // TIMEOUT
            toast.error("Location request timed out. Please try again.");
          } else {
            toast.error("Location unavailable: " + error.message);
          }
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
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
    if (location.state?.pgId) {
      const { pgId, pgName } = location.state;
      setFilters(prev => ({ ...prev, pgId }));
      setActiveFilters(prev => ({ ...prev, pgId }));
      setSelectedPgName(pgName || 'Selected PG');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setActiveFilters(filters);
      setPage(1); // Reset to first page when filters change
    }, 500);
    return () => clearTimeout(handler);
  }, [filters]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...filters, selectedPgName }));
  }, [filters, selectedPgName, STORAGE_KEY]);

  const hasActiveFilters = () => {
    return (
      filters.title !== '' ||
      filters.city !== '' ||
      filters.pgType !== '' ||
      filters.occupancyType !== '' ||
      filters.minPrice !== '' ||
      filters.maxPrice !== '' ||
      filters.facilities?.length > 0 ||
      filters.minRating !== '' ||
      filters.onlyWithVacancy === true ||
      filters.pgId !== '' ||
      selectedPgName !== '' ||
      !!(userLocation.latitude && userLocation.longitude)
    );
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.title) count++;
    if (filters.city) count++;
    if (filters.pgType) count++;
    if (filters.occupancyType) count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.facilities && filters.facilities.length > 0) count += filters.facilities.length;
    if (filters.minRating) count++;
    if (filters.onlyWithVacancy) count++;
    if (filters.pgId) count++;
    if (userLocation.latitude && userLocation.longitude) count++;
    return count;
  };

  const { data, isLoading } = useQuery({
    queryKey: ['browse-posts', activeFilters, page, limit, userLocation],
    queryFn: async () => (await searchPostsApi({ 
      ...activeFilters, 
      page, 
      limit,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude
    })).data?.data,
    enabled: locationReady,
  });

  const enquiryMut = useMutation({
    mutationFn: createEnquiryApi,
    onSuccess: (res, variables) => {
      toast.success('Enquiry sent successfully!');
      const newEnquiryData = { 
        owner: res.data?.data?.owner, 
        manager: res.data?.data?.manager,
        enquiryId: res.data?.data?.enquiryId,
        status: res.data?.data?.status
      };

      // Update the main list cache — key must match exactly what useQuery uses
      qc.setQueryData(['browse-posts', activeFilters, page, limit, userLocation], (oldData) => {
        if (!oldData) return oldData;
        const newPosts = oldData.posts.map(p => {
          if (p._id === variables.postId) {
            return { ...p, enquiryData: newEnquiryData };
          }
          return p;
        });
        return { ...oldData, posts: newPosts };
      });

      // Update the current modal view state
      if (viewPost?._id === variables.postId) {
        setViewPost(prev => ({ ...prev, enquiryData: newEnquiryData }));
      }
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateEnquiryMut = useMutation({
    mutationFn: ({ id, data }) => updateEnquiryApi(id, data),
    onSuccess: (res, variables) => {
      // Update the main list cache — key must match exactly what useQuery uses
      qc.setQueryData(['browse-posts', activeFilters, page, limit, userLocation], (oldData) => {
        if (!oldData) return oldData;
        const newPosts = oldData.posts.map(p => {
          if (p.enquiryData?.enquiryId === variables.id) {
            return {
              ...p,
              enquiryData: { ...p.enquiryData, status: 'contacted' }
            };
          }
          return p;
        });
        return { ...oldData, posts: newPosts };
      });

      // Update the current modal view state
      if (viewPost?.enquiryData?.enquiryId === variables.id) {
        setViewPost(prev => ({
          ...prev,
          enquiryData: { ...prev.enquiryData, status: 'contacted' }
        }));
      }
    },
    onError: (e) => console.error("Failed to update status", e),
  });

  const { data: facilitiesList } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => (await getFacilitiesApi()).data?.data?.facilities || [],
  });

  const handleFacilityToggle = (id) => {
    setFilters(prev => {
      const current = prev.facilities || [];
      const updated = current.includes(id) 
        ? current.filter(f => f !== id) 
        : [...current, id];
      return { ...prev, facilities: updated };
    });
  };

  const handleClearFilters = () => {
    setFilters({ 
      title: '', 
      city: '', 
      pgType: '', 
      occupancyType: '', 
      minPrice: '', 
      maxPrice: '', 
      facilities: [],
      minRating: '',
      onlyWithVacancy: false,
      pgId: ''
    });
    setSelectedPgName('');
    setUserLocation({ latitude: '', longitude: '' });
    localStorage.removeItem('staysync_user_location');
    localStorage.removeItem('staysync_near_me_active');
    toast.success("All filters cleared successfully.");
  };

  const handleClearPgFilter = () => {
    setFilters(prev => ({ ...prev, pgId: '' }));
    setActiveFilters(prev => ({ ...prev, pgId: '' }));
    setSelectedPgName('');
  };

  const [amenitySearch, setAmenitySearch] = useState('');
  const filteredFacilities = facilitiesList?.filter(fac =>
    fac.name.toLowerCase().includes(amenitySearch.toLowerCase())
  ) || [];

  const posts = data?.posts || [];

  const handleEnquire = (postId) => {
    enquiryMut.mutate({ postId });
  };

  const handleRevealNumber = (e, enquiryId) => {
    e.preventDefault();
    if (enquiryId) {
      updateEnquiryMut.mutate({ id: enquiryId, data: { status: 'contacted' } });
    }
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)} 
            className="rounded-full p-2 h-9 w-9 shrink-0 flex items-center justify-center border border-gray-200 dark:border-[#2d3052] dark:hover:bg-[#242740] hover:bg-gray-100"
            title="Go Back"
          >
            <ArrowLeft size={16} className="dark:text-[#a0a3b1] text-gray-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900 leading-none">Find Your Next Home</h1>
            <p className="text-sm dark:text-[#6b6e82] text-gray-500 mt-1.5">Browse available PG rooms based on your preferences</p>
          </div>
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

      <div className="flex flex-col lg:flex-row lg:items-center bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-2xl lg:rounded-full p-3 lg:py-1.5 lg:px-2 gap-3 lg:gap-2.5 mb-6">
        <div className="flex items-center w-full lg:flex-1 pl-1 lg:pl-3 gap-2">
          <Search size={16} className="dark:text-[#6b6e82] text-gray-400 shrink-0" />
          <input
            className="bg-transparent border-none outline-none ml-1 text-[13px] dark:text-[#f0f0f8] text-gray-900 placeholder:text-gray-400 dark:placeholder:text-[#6b6e82] w-full"
            placeholder="Search by area, PG name..."
            value={filters.title}
            onChange={e => setFilters(f => ({ ...f, title: e.target.value }))}
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
              title="Find stays near your current location"
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
        
        <div className="hidden lg:block w-px h-5 bg-gray-200 dark:bg-[#2d3052]" />
        <div className="block lg:hidden h-px w-full bg-gray-100 dark:bg-[#2d3052]/30" />

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* City Input */}
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#242740] lg:bg-transparent border border-gray-200 dark:border-[#2d3052] lg:border-none rounded-lg lg:rounded-none px-2.5 py-1.5 lg:p-0 flex-1 min-w-[110px] lg:w-[120px]">
            <MapPin size={13} className="text-gray-400 dark:text-[#6b6e82] block lg:hidden shrink-0" />
            <input
              className="bg-transparent border-none outline-none text-[13px] dark:text-[#f0f0f8] text-gray-900 placeholder:text-gray-400 dark:placeholder:text-[#6b6e82] w-full"
              placeholder="City..."
              value={filters.city}
              onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
            />
          </div>

          <div className="hidden lg:block w-px h-5 bg-gray-200 dark:bg-[#2d3052]" />

          {/* Type Dropdown */}
          <div className="flex-1 min-w-[120px] lg:min-w-[130px]">
            <SelectDropdown
              value={filters.pgType}
              onChange={e => setFilters(f => ({ ...f, pgType: e.target.value }))}
              options={[
                { value: '', label: 'Any Type' },
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'unisex', label: 'Unisex' },
                { value: 'coLiving', label: 'Co-Living' }
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

          <div className="hidden lg:block w-px h-5 bg-gray-200 dark:bg-[#2d3052]" />

          {/* Occupancy Dropdown */}
          <div className="flex-1 min-w-[110px] lg:min-w-[120px]">
            <SelectDropdown
              value={filters.occupancyType}
              onChange={e => setFilters(f => ({ ...f, occupancyType: e.target.value }))}
              options={[
                { value: '', label: 'Sharing' },
                { value: 'single', label: 'Single' },
                { value: 'double', label: 'Double' },
                { value: 'triple', label: 'Triple' }
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

          <div className="hidden lg:block w-px h-5 bg-gray-200 dark:bg-[#2d3052]" />

          {/* Rating Dropdown */}
          <div className="flex-1 min-w-[110px] lg:min-w-[120px]">
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

          <div className="hidden lg:block w-px h-5 bg-gray-200 dark:bg-[#2d3052]" />

          <Button 
            variant={getActiveFiltersCount() > 0 ? "accent" : "primary"} 
            onClick={() => setShowAdvancedFilters(true)}
            className="rounded-full h-8 px-4 text-[12px] lg:mr-1 font-bold transition-all duration-200 flex-1 lg:flex-none justify-center"
          >
            <Filter size={14} className="mr-1.5" /> 
            {getActiveFiltersCount() > 0 ? `Filters (${getActiveFiltersCount()})` : 'Filters'}
          </Button>
        </div>
      </div>

      {selectedPgName && (
        <div className="flex items-center gap-2 mb-6 bg-[#6c63ff]/10 border border-[#6c63ff]/20 rounded-full px-4 py-1.5 w-fit">
          <span className="text-[12px] dark:text-[#a0a3b1] text-gray-600 font-medium">
            Showing stays for: <strong className="dark:text-[#f0f0f8] text-[#6c63ff] font-bold">{selectedPgName}</strong>
          </span>
          <button 
            onClick={handleClearPgFilter}
            className="ml-1 dark:text-[#6c63ff] text-[#6c63ff] hover:text-red-500 transition-colors duration-150"
            title="Clear PG filter"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {!locationReady || isLoading ? <Spinner center /> : posts.length === 0 ? (
        <EmptyState 
          icon={<Search size={64} />} 
          title="No PGs found" 
          description="Try adjusting your filters to find more results." 
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
            {posts.map(post => (
              <div key={post._id} className="bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-xl overflow-hidden transition-all duration-200 flex flex-col hover:border-[#6c63ff] hover:shadow-md cursor-pointer" onClick={() => setViewPost(post)}>
                <div className="h-[120px] bg-[#242740] dark:bg-[#242740] relative flex items-center justify-center overflow-hidden">
                  {post.images && post.images.length > 0 ? (
                    <img src={post.images[0]} alt={post.title} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                  ) : (
                    <Building2 size={40} className="opacity-10" />
                  )}
                  <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white border border-white/10 px-2 py-0.5 rounded-md font-bold text-[11px]">{formatPrice(post.minPrice)} - {formatPrice(post.maxPrice)}</div>
                  <div className="absolute bottom-2.5 left-2.5">
                    <Badge variant={post.pgType === 'male' ? 'info' : post.pgType === 'female' ? 'danger' : 'accent'}>
                      {post.pgType}
                    </Badge>
                  </div>
                </div>

                <div className="p-3.5 flex flex-col flex-1">
                  <div className="text-[10px] font-bold text-[#00d4aa] uppercase mb-0.5">{post.pgId?.name}</div>
                  <h3 className="text-[15px] font-bold dark:text-[#f0f0f8] text-gray-900 mb-1 leading-snug truncate">{post.title}</h3>
                  <div className="flex items-center justify-between gap-2 text-[11px] dark:text-[#6b6e82] text-gray-500 mb-3">
                    <div className="flex items-center gap-1 truncate">
                      <MapPin size={12} className="text-[#6c63ff] shrink-0" />
                      <span className="truncate">{post.pgId?.address?.city}</span>
                    </div>
                    {post.distanceKm !== undefined && post.pgId?.location?.coordinates && (
                      <a
                        href={userLocation.latitude && userLocation.longitude
                          ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${post.pgId.location.coordinates[1]},${post.pgId.location.coordinates[0]}`
                          : `https://www.google.com/maps/dir/?api=1&destination=${post.pgId.location.coordinates[1]},${post.pgId.location.coordinates[0]}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-bold text-[#6c63ff] dark:text-[#8c85ff] bg-[#6c63ff]/10 hover:bg-[#6c63ff]/20 transition-colors px-1.5 py-0.5 rounded-md shrink-0 cursor-pointer flex items-center gap-0.5"
                        title="Open Google Maps"
                      >
                        📍 {Number(post.distanceKm).toFixed(2)} km
                      </a>
                    )}
                  </div>

                  <div className="flex gap-1.5 mb-3 flex-wrap">
                    {post.occupancyTypes?.map(type => (
                      <Badge key={type} variant="accent" className="text-[9px] py-0.5 capitalize">{type}</Badge>
                    ))}
                    {post.pgType === 'unisex' ? (
                      <Badge variant="warning" className="text-[9px] py-0.5">
                        ♂ {post.maleVacancyCount ?? 0} M · ♀ {post.femaleVacancyCount ?? 0} F
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-[9px] py-0.5">{post.vacancyCount} Left</Badge>
                    )}
                  </div>

                  <p className="text-[11.5px] dark:text-[#6b6e82] text-gray-500 mb-3.5 line-clamp-2 leading-[1.4] h-[2.8em] overflow-hidden">
                    {post.description}
                  </p>

                  <div className="mt-auto">
                    {!post.enquiryData ? (
                      <Button 
                        size="sm"
                        variant="custom"
                        className="w-full h-8 text-[11px] font-black uppercase tracking-wider rounded-lg shadow-sm bg-[#6c63ff]/10 hover:bg-[#6c63ff]/20 text-[#6c63ff] border border-[#6c63ff]/25 hover:border-[#6c63ff]/50 transition-all active:scale-[0.98] flex items-center justify-center"
                        onClick={(e) => { e.stopPropagation(); handleEnquire(post._id); }}
                        loading={enquiryMut.isPending && enquiryMut.variables?.postId === post._id}
                      >
                        Show Interest
                      </Button>
                    ) : post.enquiryData.status === 'contacted' ? (
                      <a 
                        href={`tel:${post.enquiryData.owner?.mobNo1 || post.enquiryData.manager?.mobNo1}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full h-8 flex items-center justify-center gap-1.5 bg-[#51cf66]/10 hover:bg-[#51cf66]/20 text-[#51cf66] border border-[#51cf66]/25 hover:border-[#51cf66]/50 transition-all rounded-lg font-black text-[11px] shadow-sm cursor-pointer uppercase tracking-wider"
                        title="Call Property Owner/Manager"
                      >
                        <Phone size={12} className="stroke-[2.5]" /> Call: {post.enquiryData.owner?.mobNo1 || post.enquiryData.manager?.mobNo1}
                      </a>
                    ) : (
                      <div className="bg-[#51cf66]/5 dark:bg-[#51cf66]/5 rounded-lg h-8 flex items-center justify-center gap-1.5 text-[#51cf66] border border-[#51cf66]/20">
                        <CheckCircle2 size={13} />
                        <span className="text-[10px] font-black tracking-wider uppercase">REQUESTED</span>
                      </div>
                    )}
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
            <div className="detail-section-title">Budget Range</div>
            <div className="flex gap-3">
              <Input 
                label="Min Price" type="number" value={filters.minPrice}
                onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                placeholder="₹ 0"
              />
              <Input 
                label="Max Price" type="number" value={filters.maxPrice}
                onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                placeholder="₹ 20000"
              />
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">Availability</div>
            <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg transition-all duration-200 hover:bg-[#6c63ff]/5">
              <input
                type="checkbox"
                checked={filters.onlyWithVacancy}
                onChange={e => setFilters(f => ({ ...f, onlyWithVacancy: e.target.checked }))}
                className="w-4 h-4 accent-[#6c63ff]"
              />
              <span className={`text-[14px] ${filters.onlyWithVacancy ? 'text-[#6c63ff] font-bold' : 'dark:text-[#a0a3b1] text-gray-600 font-medium'}`}>
                Only show stays with active vacancies (beds left &gt; 0)
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

      {/* Post Details Modal */}
      <Modal 
        isOpen={!!viewPost} 
        onClose={() => setViewPost(null)} 
        title={viewPost?.title || 'Post Details'}
        size="lg"
      >
        {viewPost && (
          <div className="fade-in text-[13px] flex flex-col gap-5">
            {/* Hero Banner Section */}
            <div className="flex gap-5 flex-col sm:flex-row bg-gray-50/50 dark:bg-[#242740]/10 border border-gray-100 dark:border-[#2d3052] p-4 rounded-2xl">
              <div className="flex-1 h-[150px] dark:bg-[#242740] bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden border border-gray-200/50 dark:border-[#2d3052]/50 relative group">
                {viewPost.images && viewPost.images.length > 0 ? (
                  <img src={viewPost.images[0]} alt={viewPost.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <Building2 size={48} className="opacity-15 text-[#6c63ff]" />
                )}
                <div className="absolute bottom-3 left-3 flex gap-1.5 flex-wrap">
                  <Badge variant={viewPost.pgType === 'male' ? 'info' : viewPost.pgType === 'female' ? 'danger' : 'accent'} className="text-[9px] py-0.5 font-bold uppercase tracking-wider">
                    {viewPost.pgType}
                  </Badge>
                  {viewPost.occupancyTypes?.map(type => (
                    <Badge key={type} variant="ghost" className="text-[9px] py-0.5 capitalize font-bold">{type} Share</Badge>
                  ))}
                </div>
              </div>
              <div className="flex-[1.5] flex flex-col justify-between py-0.5">
                <div>
                  <div className="text-[10px] font-black text-[#00d4aa] dark:text-[#00e5b7] uppercase tracking-wider mb-1">{viewPost.pgId?.name}</div>
                  <h2 className="text-[22px] font-black dark:text-[#f0f0f8] text-gray-900 mb-1 leading-tight">{viewPost.title}</h2>
                  <p className="flex items-center gap-1 dark:text-[#6b6e82] text-gray-500 text-[12px] font-medium">
                    <MapPin size={13} className="text-[#6c63ff]" /> {viewPost.pgId?.address?.city}, {viewPost.pgId?.address?.state}
                  </p>
                </div>
                
                <div className="flex justify-between items-center gap-3 mt-4 flex-wrap sm:flex-nowrap">
                  <div className="flex flex-col gap-1">
                    <div className="text-[9px] dark:text-[#6b6e82] text-gray-400 font-bold uppercase tracking-wider">MONTHLY RENT</div>
                    <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#6c63ff]/10 text-[#6c63ff] border border-[#6c63ff]/20 rounded-xl font-extrabold text-[11px] uppercase tracking-wider shrink-0">
                      <span>{formatPrice(viewPost.minPrice)} - {formatPrice(viewPost.maxPrice)}</span>
                      <span className="text-[9px] opacity-80 font-bold">/mo</span>
                    </div>
                  </div>
                  
                  {viewPost.pgType === 'unisex' ? (
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ffa94d]/10 text-[#ffa94d] border border-[#ffa94d]/20 rounded-xl font-extrabold text-[11px] uppercase tracking-wider">
                        <Bed size={13} /> {viewPost.vacancyCount} Beds Left
                      </div>
                      <div className="text-[9.5px] dark:text-[#a0a3b1] text-gray-500 font-bold">
                        (♂ {viewPost.maleVacancyCount ?? 0} M · ♀ {viewPost.femaleVacancyCount ?? 0} F)
                      </div>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ffa94d]/10 text-[#ffa94d] border border-[#ffa94d]/20 rounded-xl font-extrabold text-[11px] uppercase tracking-wider shrink-0">
                      <Bed size={13} /> {viewPost.vacancyCount} Beds Left
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {viewPost.description && (
              <div className="dark:bg-[#242740]/20 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 dark:border-[#2d3052]">
                <div className="text-[11px] font-bold tracking-wider dark:text-[#f0f0f8] text-gray-700 uppercase mb-2.5">📝 About this Property</div>
                <div className="text-[12.5px] dark:text-[#a0a3b1] text-gray-600 leading-[1.6] dark:bg-[#1a1d2e] bg-white p-3.5 rounded-xl border-l-[3.5px] border-[#6c63ff] font-medium shadow-sm">
                  {viewPost.description}
                </div>
              </div>
            )}

            {/* Location details & Property details grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left card: Location details */}
              <div className="dark:bg-[#242740]/20 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 dark:border-[#2d3052] flex flex-col justify-between hover:border-[#6c63ff]/20 transition-all duration-200">
                <div>
                  <div className="text-[11px] font-bold tracking-wider text-[#6c63ff] dark:text-[#8c85ff] uppercase mb-2">📍 Location Details</div>
                  <div className="text-[12px] dark:text-[#a0a3b1] text-gray-600 leading-[1.5]">
                    <div className="font-extrabold dark:text-[#f0f0f8] text-gray-900 text-[13px] mb-0.5">{viewPost.pgId?.address?.landmark || 'Near Center'}</div>
                    <div>{viewPost.pgId?.address?.city}, {viewPost.pgId?.address?.state} - {viewPost.pgId?.address?.pincode || ''}</div>
                    <div className="mt-1 dark:text-[#6b6e82] text-gray-500 font-medium text-[11px]">
                      Located inside <strong className="dark:text-[#f0f0f8] text-gray-800 font-bold">{viewPost.pgId?.name}</strong>
                    </div>
                  </div>
                </div>
                {viewPost.pgId?.location?.coordinates && (
                  <a
                    href={userLocation.latitude && userLocation.longitude
                      ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${viewPost.pgId.location.coordinates[1]},${viewPost.pgId.location.coordinates[0]}`
                      : `https://www.google.com/maps/dir/?api=1&destination=${viewPost.pgId.location.coordinates[1]},${viewPost.pgId.location.coordinates[0]}`
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

              {/* Right card: Timings and Info */}
              <div className="dark:bg-[#242740]/20 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 dark:border-[#2d3052] flex flex-col justify-between hover:border-[#ffa94d]/20 transition-all duration-200">
                <div>
                  <div className="text-[11px] font-bold tracking-wider text-[#ffa94d] uppercase mb-3">🕒 Timings &amp; Info</div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <div className="text-[9px] dark:text-[#6b6e82] text-gray-400 font-bold uppercase tracking-wider">CHECK-IN</div>
                      <div className="text-[12px] font-extrabold dark:text-[#f0f0f8] text-gray-900 mt-0.5">{viewPost.pgId?.checkInTime || 'Anytime'}</div>
                    </div>
                    <div>
                      <div className="text-[9px] dark:text-[#6b6e82] text-gray-400 font-bold uppercase tracking-wider">CHECK-OUT</div>
                      <div className="text-[12px] font-extrabold dark:text-[#f0f0f8] text-gray-900 mt-0.5">{viewPost.pgId?.checkOutTime || 'Morning'}</div>
                    </div>
                    <div>
                      <div className="text-[9px] dark:text-[#6b6e82] text-gray-400 font-bold uppercase tracking-wider">AVAILABLE FROM</div>
                      <div className="text-[12px] font-extrabold dark:text-[#f0f0f8] text-gray-900 mt-0.5">{new Date(viewPost.availableFrom || Date.now()).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-[9px] dark:text-[#6b6e82] text-gray-400 font-bold uppercase tracking-wider">RATING</div>
                      <div className="text-[12px] font-black text-[#ffa94d] flex items-center gap-1 mt-0.5">★ {viewPost.pgId?.rating || '0'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Amenities & Facilities */}
            {viewPost.pgId?.facilities?.length > 0 && (
              <div className="dark:bg-[#242740]/20 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 dark:border-[#2d3052]">
                <div className="text-[11px] font-bold tracking-wider dark:text-[#f0f0f8] text-gray-700 uppercase mb-3">⭐ Amenities &amp; Facilities</div>
                <div className="flex flex-wrap gap-2">
                  {viewPost.pgId.facilities.map(f => (
                    <div key={f._id} className="flex items-center gap-2 px-3 py-1.5 dark:bg-[#1a1d2e] bg-white rounded-lg text-[11px] border border-gray-100 dark:border-[#2d3052] font-semibold dark:text-[#f0f0f8] text-gray-700 hover:border-[#6c63ff]/20 transition-all duration-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] shrink-0" />
                      {f.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {viewPost.images && viewPost.images.length > 0 && (
              <div className="dark:bg-[#242740]/20 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 dark:border-[#2d3052]">
                <div className="text-[11px] font-bold tracking-wider dark:text-[#f0f0f8] text-gray-700 uppercase mb-3">📸 Room Gallery</div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {viewPost.images.map((img, idx) => (
                    <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-[#2d3052] block hover:border-[#6c63ff] transition-all hover:scale-[1.02] shadow-sm">
                      <img src={img} alt={`Showcase ${idx + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Enquiry Action */}
            <div className="mt-2">
              {!viewPost.enquiryData ? (
                <Button 
                  onClick={() => handleEnquire(viewPost._id)}
                  loading={enquiryMut.isPending && enquiryMut.variables?.postId === viewPost._id}
                  variant="custom"
                  className="w-full h-10 text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm bg-[#6c63ff]/10 hover:bg-[#6c63ff]/20 text-[#6c63ff] border border-[#6c63ff]/25 hover:border-[#6c63ff]/50 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  Show Interest &amp; Connect
                </Button>
              ) : (
                <div className="dark:bg-[#1a1d2e] bg-[#51cf66]/5 rounded-2xl border border-[#51cf66]/20 p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-[#51cf66] font-black uppercase tracking-wider text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-[#51cf66] animate-pulse" />
                    Enquiry Active!
                  </div>

                  {viewPost.enquiryData.owner && (
                    <div className="flex justify-between items-center p-3 bg-white dark:bg-[#242740]/30 border border-gray-100 dark:border-[#2d3052] rounded-xl flex-wrap gap-3 sm:flex-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#ffa94d]/10 text-[#ffa94d] border border-[#ffa94d]/20 flex items-center justify-center font-black text-xs shrink-0">
                          {viewPost.enquiryData.owner.name?.charAt(0).toUpperCase() || 'O'}
                        </div>
                        <div>
                          <div className="text-[10px] dark:text-[#6b6e82] text-gray-500 uppercase font-extrabold">Property Owner</div>
                          <div className="text-[13px] font-bold dark:text-[#f0f0f8] text-gray-900">{viewPost.enquiryData.owner.name}</div>
                        </div>
                      </div>
                      
                      {viewPost.enquiryData.status === 'contacted' ? (
                        <a 
                          href={`tel:${viewPost.enquiryData.owner.mobNo1}`}
                          className="flex items-center justify-center gap-1.5 bg-[#51cf66]/10 hover:bg-[#51cf66]/20 text-[#51cf66] border border-[#51cf66]/25 hover:border-[#51cf66]/50 transition-all px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider w-full sm:w-auto text-center"
                        >
                          <Phone size={12} className="stroke-[2.5]" /> {viewPost.enquiryData.owner.mobNo1}
                        </a>
                      ) : (
                        <Button 
                          onClick={(e) => handleRevealNumber(e, viewPost.enquiryData.enquiryId)}
                          loading={updateEnquiryMut.isPending && updateEnquiryMut.variables?.id === viewPost.enquiryData.enquiryId}
                          variant="custom"
                          className="text-[11px] font-black px-4 py-2 rounded-xl uppercase tracking-wider bg-[#6c63ff]/10 hover:bg-[#6c63ff]/20 text-[#6c63ff] border border-[#6c63ff]/25 hover:border-[#6c63ff]/50 transition-all w-full sm:w-auto justify-center shadow-sm"
                        >
                          Reveal Phone Number
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
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
    </div>
  );
}
