import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getEnquiriesApi, updateEnquiryApi } from '../../api/enquiry.api';
import { getMyPGsApi } from '../../api/pg.api';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Search, ChevronLeft, ChevronRight, Phone, CheckCircle2, Building2, ClipboardList, Edit } from 'lucide-react';
import { Badge, Card, Spinner, EmptyState, QueryError, Modal, Input, Button, SelectDropdown } from '../../components/common';
import { getErrorMessage, formatDate, formatTime, capitalize } from '../../utils/helpers';
import { cn } from '../../utils/cn';

const statusOptions = [
  { value: 'interested', label: 'Interested' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'visited', label: 'Visited' },
  { value: 'dealDone', label: 'Deal Done' },
  { value: 'rejected', label: 'Rejected' },
];

const statusVariant = {
  interested: 'info',
  contacted: 'warning',
  visited: 'purple',
  dealdone: 'success',
  dealDone: 'success',
  rejected: 'danger',
  inventoryfull: 'dark',
  inventoryFull: 'dark',
};

const LIMIT = 10;

export default function Enquiries() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isUserRole = user?.role === 'user';
  const isStaff = !isUserRole;

  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
  const [filterPgId, setFilterPgId] = useState(searchParams.get('pgId') || '');
  const [searchInput, setSearchInput] = useState(searchParams.get('userName') || '');
  const [userName, setUserName] = useState(searchParams.get('userName') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [selected, setSelected] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [onboardingPrompt, setOnboardingPrompt] = useState(null); // { enquiryId, userId, userName, pgName }

  // Sync state changes to searchParams
  useEffect(() => {
    const nextParams = {};
    if (filterStatus) nextParams.status = filterStatus;
    if (filterPgId) nextParams.pgId = filterPgId;
    if (userName) nextParams.userName = userName;
    if (page > 1) nextParams.page = page;
    setSearchParams(nextParams, { replace: true });
  }, [filterStatus, filterPgId, userName, page, setSearchParams]);

  // Debounce userName search
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchInput.trim();
      setUserName(trimmed);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset page on filter change (except when initializing from URL)
  useEffect(() => {
    // Only reset if query is changing dynamically
    const currentStatusInUrl = searchParams.get('status') || '';
    const currentPgInUrl = searchParams.get('pgId') || '';
    if (filterStatus !== currentStatusInUrl || filterPgId !== currentPgInUrl) {
      setPage(1);
    }
  }, [filterStatus, filterPgId]);

  const params = {
    page,
    limit: LIMIT,
    ...(filterStatus && { status: filterStatus }),
    ...(filterPgId && { pgId: filterPgId }),
    ...(userName && !isUserRole && { userName }),
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['enquiries', params],
    queryFn: async () => (await getEnquiriesApi(params)).data?.data,
    retry: 1,
  });

  // PG list for staff filter — use a long staleTime so the cached result from
  // the dashboard or sidebar is reused. No new network call on every tab visit.
  const { data: pgData } = useQuery({
    queryKey: ['my-pgs'],
    queryFn: async () => (await getMyPGsApi()).data?.data,
    enabled: isStaff,
    staleTime: 5 * 60 * 1000,   // 5 minutes — reuse cache across page navigations
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateEnquiryApi(id, data),
    onSuccess: (_, variables) => {
      toast.success('Enquiry updated!');
      qc.invalidateQueries(['enquiries']);
      
      // If deal is done, prompt to start onboarding
      if (variables.data.status === 'dealDone') {
        setOnboardingPrompt({
          enquiryId: selected._id,
          userId:    selected.userId?._id,
          userName:  selected.userId?.name,
          pgName:    selected.pgId?.name,
        });
      }
      
      setSelected(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Dedicated mutation for owner clicking "Call" — only fires when status === interested
  const callMut = useMutation({
    mutationFn: (enquiryId) => updateEnquiryApi(enquiryId, { status: 'contacted' }),
    onSuccess: () => {
      qc.invalidateQueries(['enquiries']);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const enquiries = data?.enquiries || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / LIMIT);
  const pgs = pgData?.pgs || [];

  const openUpdate = (enq) => {
    setSelected(enq);
    setNewStatus(enq.status);
    setRemarks(enq.staffRemarks || '');
  };

  const handleUpdate = () => {
    updateMut.mutate({ id: selected._id, data: { status: newStatus, staffRemarks: remarks } });
  };

  if (isLoading) return <Spinner center />;
  if (isError) return <QueryError onRetry={refetch} error={error} />;

  return (
    <div className="fade-in">
      <div className="flex items-start justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900">{isUserRole ? 'My Enquiries' : 'Enquiries'}</h1>
          <p className="text-sm dark:text-[#6b6e82] text-gray-500 mt-1">
            {isUserRole ? 'Track your PG applications' : `${total} total enquiries`}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        {/* Search by user name (staff only) */}
        {isStaff && (
          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-[#6b6e82] text-gray-400 pointer-events-none" />
            <input
              className="pl-9 w-full dark:bg-[#242740] bg-white dark:border-[#2d3052] border-gray-200 border rounded-lg px-3 py-2 text-sm dark:text-[#f0f0f8] text-gray-900 outline-none focus:border-[#6c63ff] transition-colors"
              placeholder="Search by user name..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
        )}

        {/* PG filter (staff only) */}
        {isStaff && pgs.length > 0 && (
          <SelectDropdown
            value={filterPgId}
            onChange={e => setFilterPgId(e.target.value)}
            options={[{ value: '', label: 'All PGs' }, ...pgs.map(pg => ({ value: pg._id, label: pg.name }))]}
            className="min-w-[160px]"
          />
        )}

        {/* Status pills */}
        <div className="flex gap-1.5 flex-wrap">
          {['', ...statusOptions.map(s => s.value)].map(s => (
            <button
              key={s}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-full transition-all border',
                filterStatus === s
                  ? 'bg-[#6c63ff] border-[#6c63ff] text-white'
                  : 'bg-transparent border-gray-200 dark:border-[#2d3052] text-gray-600 dark:text-[#a0a3b1] hover:bg-gray-100 dark:hover:bg-[#2d3052] hover:text-gray-900 dark:hover:text-[#f0f0f8]'
              )}
              onClick={() => setFilterStatus(s)}
            >
              {s ? capitalize(s) : 'All'}
            </button>
          ))}
        </div>
      </div>

      {enquiries.length === 0 ? (
        <EmptyState icon={<MessageSquare size={64} />} title="No enquiries found"
          description="No enquiries match your current filters." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#2d3052]">
            <table className="w-full border-collapse">
              <thead>
                 <tr className="dark:bg-[#242740] bg-gray-50 border-b border-gray-200 dark:border-[#2d3052]">
                  {!isUserRole && <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">User</th>}
                  <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Post</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">PG</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Date</th>
                  {isStaff && <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Contact</th>}
                  {isStaff && <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Action</th>}
                </tr>
              </thead>
              <tbody>
                {enquiries.map(enq => (
                  <tr key={enq._id} className="transition-colors hover:bg-gray-50 dark:hover:bg-[#242740]">
                    {!isUserRole && (
                      <td className="px-4 py-3.5 text-sm dark:text-[#f0f0f8] text-gray-900 border-b border-[#2d3052]/30 dark:border-[#2d3052]/30">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full dark:bg-[#6c63ff]/20 bg-[#6c63ff]/10 flex items-center justify-center text-[12px] font-bold text-[#6c63ff]">
                            {enq.userId?.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-semibold text-[13px] dark:text-[#f0f0f8] text-gray-900">{enq.userId?.name || '—'}</div>
                            <div className="text-xs dark:text-[#6b6e82] text-gray-500">{enq.userId?.mobNo1 || '—'}</div>
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-sm dark:text-[#f0f0f8] text-gray-900 border-b border-[#2d3052]/30 dark:border-[#2d3052]/30">
                      <div className="font-medium text-[13px] flex items-center gap-1.5 flex-wrap">
                        {enq.postId?.title || '—'}
                        {enq.postId?.isDeleted && <Badge variant="danger" className="text-[10px] px-1.5 py-0.5">Deleted</Badge>}
                        {enq.postId && !enq.postId.isActive && !enq.postId.isDeleted && <Badge variant="warning" className="text-[10px] px-1.5 py-0.5">Inactive</Badge>}
                      </div>
                      <div className="text-xs dark:text-[#6b6e82] text-gray-500 mt-1.5 flex items-center gap-1.5 flex-wrap">
                        {enq.postId?.occupancyType && (
                          <Badge variant="accent">{enq.postId.occupancyType}</Badge>
                        )}
                        {enq.postId?.pgType && (
                          <Badge variant={enq.postId.pgType === 'male' ? 'info' : enq.postId.pgType === 'female' ? 'danger' : 'accent'}>
                            {enq.postId.pgType}
                          </Badge>
                        )}
                        <span className="font-semibold text-gray-600 dark:text-[#a0a3b1] ml-1">
                          ₹{enq.postId?.minPrice?.toLocaleString() || '—'} - ₹{enq.postId?.maxPrice?.toLocaleString() || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm dark:text-[#f0f0f8] text-gray-900 border-b border-[#2d3052]/30 dark:border-[#2d3052]/30">{enq.pgId?.name || '—'}</td>
                    <td className="px-4 py-3.5 text-sm dark:text-[#f0f0f8] text-gray-900 border-b border-[#2d3052]/30 dark:border-[#2d3052]/30"><Badge variant={statusVariant[enq.status?.toLowerCase()] || statusVariant[enq.status] || 'default'}>{enq.status}</Badge></td>
                    <td className="px-4 py-3.5 text-sm dark:text-[#f0f0f8] text-gray-900 border-b border-[#2d3052]/30 dark:border-[#2d3052]/30">
                      <div className="text-sm font-medium">{formatDate(enq.createdAt)}</div>
                      <div className="text-xs dark:text-[#6b6e82] text-gray-500">{formatTime(enq.createdAt)}</div>
                    </td>

                    {/* Contact / Call column — staff only */}
                    {isStaff && (
                      <td className="px-4 py-3.5 text-sm dark:text-[#f0f0f8] text-gray-900 border-b border-[#2d3052]/30 dark:border-[#2d3052]/30">
                        {enq.userId?.mobNo1 ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${enq.userId.mobNo1}`}
                              onClick={() => {
                                if (enq.status === 'interested') {
                                  callMut.mutate(enq._id);
                                }
                              }}
                              className={[
                                'inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-md font-semibold text-[12px] no-underline transition-all whitespace-nowrap border',
                                enq.status === 'interested'
                                  ? 'dark:bg-[#51cf66]/10 bg-[#51cf66]/10 text-[#51cf66] border-[#51cf66]/30'
                                  : 'dark:bg-[#242740] bg-gray-100 dark:text-[#a0a3b1] text-gray-500 dark:border-[#2d3052] border-gray-200',
                              ].join(' ')}
                            >
                              <Phone size={12} />
                              {enq.userId.mobNo1}
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs dark:text-[#6b6e82] text-gray-500">—</span>
                        )}
                      </td>
                    )}

                     {/* Action column */}
                     {isStaff && (
                       <td className="px-4 py-3.5 text-sm dark:text-[#f0f0f8] text-gray-900 border-b border-[#2d3052]/30 dark:border-[#2d3052]/30">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => openUpdate(enq)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2d3052] rounded-lg transition-colors text-gray-500 dark:text-[#a0a3b1] border-none bg-transparent cursor-pointer flex items-center justify-center"
                              title="Update Status"
                            >
                              <Edit size={16} />
                            </button>
                            {enq.status === 'dealDone' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/onboarding/new?enquiryId=${enq._id}`)}
                                className="text-[#6c63ff] border-[#6c63ff]/20"
                              >
                                <ClipboardList size={13} /> Onboard
                              </Button>
                            )}
                          </div>
                       </td>
                     )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-5">
              <span className="text-sm dark:text-[#6b6e82] text-gray-500">
                Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}
              </span>
              <div className="flex gap-2 items-center">
                <Button variant="ghost" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                  <ChevronLeft size={16} />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && arr[i - 1] !== p - 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) => p === '...'
                    ? <span key={`dot-${i}`} className="dark:text-[#6b6e82] text-gray-500 px-1">…</span>
                    : <button
                        key={p}
                        className={cn(
                          'px-2.5 py-1 text-xs font-bold rounded-lg transition-all min-w-[28px] h-7 border',
                          page === p
                            ? 'bg-[#6c63ff] border-[#6c63ff] text-white'
                            : 'bg-transparent border-gray-200 dark:border-[#2d3052] text-gray-600 dark:text-[#a0a3b1] hover:bg-gray-100 dark:hover:bg-[#2d3052] hover:text-gray-900 dark:hover:text-[#f0f0f8]'
                        )}
                        onClick={() => setPage(p)}
                      >{p}</button>
                  )
                }
                <Button variant="ghost" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Update Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Update Enquiry Status">
        {selected && (
          <div>
            <div className="px-4 py-3 dark:bg-[#242740] bg-gray-50 rounded-lg mb-5">
              <div className="font-semibold dark:text-[#f0f0f8] text-gray-900">{selected.userId?.name}</div>
              <div className="text-sm dark:text-[#6b6e82] text-gray-500">{selected.postId?.title}</div>
              <div className="text-xs dark:text-[#6b6e82] text-gray-500 mt-4">{selected.userId?.email}</div>
            </div>
            <div className="flex flex-col gap-4">
              <Input label="New Status" name="status" as="select" value={newStatus}
                onChange={e => setNewStatus(e.target.value)} options={statusOptions} />
              <Input label="Staff Remarks" name="remarks" as="textarea"
                value={remarks} onChange={e => setRemarks(e.target.value)}
                placeholder="Add notes about this enquiry..." rows={3} />
            </div>
            <div className="flex gap-3 justify-end mt-6 pt-5 border-t dark:border-[#2d3052] border-gray-200 flex-col-reverse sm:flex-row">
              <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
              <Button onClick={handleUpdate} loading={updateMut.isPending}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Start Onboarding Modal (replaces old assign-bed modal) */}
      <Modal isOpen={!!onboardingPrompt} onClose={() => setOnboardingPrompt(null)} title="Start Onboarding 🎉">
        {onboardingPrompt && (
          <div className="text-center py-2.5">
            <div className="w-16 h-16 dark:bg-[#51cf66]/10 bg-[#51cf66]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#51cf66]">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="mb-2 font-bold text-lg dark:text-[#f0f0f8] text-gray-900">Deal Confirmed!</h3>
            <p className="dark:text-[#6b6e82] text-gray-500 text-sm mb-6">
              Start the onboarding process for{' '}
              <strong>{onboardingPrompt.userName}</strong> at{' '}
              <strong>{onboardingPrompt.pgName}</strong>.
            </p>
            <div className="flex flex-col gap-2.5">
              <Button
                onClick={() => {
                  setOnboardingPrompt(null);
                  navigate(`/onboarding/new?enquiryId=${onboardingPrompt.enquiryId}`);
                }}
                className="w-full"
              >
                <ClipboardList size={16} />
                Start Onboarding
              </Button>
              <Button variant="ghost" onClick={() => setOnboardingPrompt(null)} className="w-full">
                I'll do it later
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
