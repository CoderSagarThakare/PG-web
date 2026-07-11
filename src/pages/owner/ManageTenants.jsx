import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listTenantsApi } from '../../api/onboarding.api';
import { getMyPGsApi } from '../../api/pg.api';
import {
  Badge, Card, Spinner, EmptyState, Button, Input
} from '../../components/common';
import { formatDate } from '../../utils/helpers';
import OffboardingModal from '../../components/owner/OffboardingModal';
import {
  Users, Search, Building2, Phone, Calendar, Filter,
  LogOut, Eye, User, ChevronRight, RefreshCw, Home
} from 'lucide-react';

// ── Status badge helper ────────────────────────────────────────────────────────
const STATUS_MAP = {
  onboarding_completed: { label: 'Active Stay',           variant: 'success' },
  settlement_pending:   { label: 'Checkout Pending',      variant: 'warning' },
  initiated:            { label: 'Onboarding Started',    variant: 'info' },
  docs_reviewed:        { label: 'Docs Reviewed',         variant: 'info' },
  deposit_confirmed:    { label: 'Deposit Confirmed',     variant: 'info' },
  removed:              { label: 'Checked Out',           variant: 'default' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, variant: 'default' };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ── Tenant Detail Drawer ───────────────────────────────────────────────────────
function TenantDrawer({ tenant, onClose, onOffboard }) {
  if (!tenant) return null;
  const u = tenant.userId || {};
  const ft = tenant.financialTerms || {};

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md h-full dark:bg-[#1a1d2e] bg-white shadow-2xl overflow-y-auto border-l dark:border-[#2d3052] border-gray-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer header */}
        <div className="p-6 border-b dark:border-[#2d3052] border-gray-200 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#a855f7] flex items-center justify-center text-white font-black text-xl shrink-0">
            {u.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black dark:text-[#f0f0f8] text-gray-900 text-lg truncate">{u.name || '—'}</h2>
            <p className="text-sm dark:text-[#6b6e82] text-gray-500 truncate">{u.email || '—'}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full dark:hover:bg-[#2d3052] hover:bg-gray-100 transition-colors dark:text-[#6b6e82] text-gray-400"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 p-6 flex flex-col gap-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-xs dark:text-[#6b6e82] text-gray-500 font-bold uppercase tracking-wider">Stay Status</span>
            <StatusBadge status={tenant.status} />
          </div>

          {/* PG & Bed */}
          <Card className="p-4 dark:bg-[#242740] bg-gray-50 rounded-xl border dark:border-[#2d3052] border-gray-200">
            <h4 className="text-xs font-extrabold dark:text-[#6b6e82] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Home size={12} /> PG &amp; Room
            </h4>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="dark:text-[#6b6e82] text-gray-500">PG</span>
                <span className="font-semibold dark:text-[#f0f0f8] text-gray-900">{tenant.pgId?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="dark:text-[#6b6e82] text-gray-500">Joining Date</span>
                <span className="font-semibold dark:text-[#f0f0f8] text-gray-900">
                  {tenant.joiningDate ? formatDate(tenant.joiningDate) : '—'}
                </span>
              </div>
              {tenant.currentBedId && (
                <>
                  <div className="flex justify-between">
                    <span className="dark:text-[#6b6e82] text-gray-500">Room</span>
                    <span className="font-semibold dark:text-[#f0f0f8] text-gray-900">
                      Room {tenant.currentBedId.roomId?.roomNumber || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="dark:text-[#6b6e82] text-gray-500">Bed</span>
                    <span className="font-semibold dark:text-[#f0f0f8] text-gray-900">
                      Bed {tenant.currentBedId.bedNumber?.split('-')?.[1] || tenant.currentBedId.bedNumber || '—'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Contact */}
          <Card className="p-4 dark:bg-[#242740] bg-gray-50 rounded-xl border dark:border-[#2d3052] border-gray-200">
            <h4 className="text-xs font-extrabold dark:text-[#6b6e82] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Phone size={12} /> Contact
            </h4>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="dark:text-[#6b6e82] text-gray-500">Mobile</span>
                <a href={`tel:${u.mobNo1}`} className="font-semibold text-[#6c63ff]">{u.mobNo1 || '—'}</a>
              </div>
              {u.mobNo2 && (
                <div className="flex justify-between">
                  <span className="dark:text-[#6b6e82] text-gray-500">Alt. Mobile</span>
                  <a href={`tel:${u.mobNo2}`} className="font-semibold text-[#6c63ff]">{u.mobNo2}</a>
                </div>
              )}
              <div className="flex justify-between">
                <span className="dark:text-[#6b6e82] text-gray-500">Gender</span>
                <span className="font-semibold dark:text-[#f0f0f8] text-gray-900 capitalize">{u.gender || '—'}</span>
              </div>
            </div>
          </Card>

          {/* Emergency Contact */}
          {tenant.emergencyContact?.name && (
            <Card className="p-4 dark:bg-[#242740] bg-gray-50 rounded-xl border dark:border-[#2d3052] border-gray-200">
              <h4 className="text-xs font-extrabold dark:text-[#6b6e82] text-gray-500 uppercase tracking-wider mb-3">
                Emergency Contact
              </h4>
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="dark:text-[#6b6e82] text-gray-500">Name</span>
                  <span className="font-semibold dark:text-[#f0f0f8] text-gray-900">{tenant.emergencyContact.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="dark:text-[#6b6e82] text-gray-500">Relation</span>
                  <span className="font-semibold dark:text-[#f0f0f8] text-gray-900 capitalize">{tenant.emergencyContact.relation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="dark:text-[#6b6e82] text-gray-500">Phone</span>
                  <a href={`tel:${tenant.emergencyContact.phone}`} className="font-semibold text-[#6c63ff]">{tenant.emergencyContact.phone}</a>
                </div>
              </div>
            </Card>
          )}

          {/* Financial Terms */}
          <Card className="p-4 dark:bg-[#242740] bg-gray-50 rounded-xl border dark:border-[#2d3052] border-gray-200">
            <h4 className="text-xs font-extrabold dark:text-[#6b6e82] text-gray-500 uppercase tracking-wider mb-3">
              Financial Terms
            </h4>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="dark:text-[#6b6e82] text-gray-500">Agreed Rent</span>
                <span className="font-semibold text-[#6c63ff]">
                  ₹{Number(ft.agreedRent || tenant.currentBedId?.price || 0).toLocaleString('en-IN')}/mo
                </span>
              </div>
              <div className="flex justify-between">
                <span className="dark:text-[#6b6e82] text-gray-500">Security Deposit</span>
                <span className="font-semibold dark:text-[#f0f0f8] text-gray-900">
                  ₹{Number(ft.securityDepositAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="dark:text-[#6b6e82] text-gray-500">Deposit Received</span>
                <Badge variant={ft.securityDepositReceived ? 'success' : 'warning'}>
                  {ft.securityDepositReceived ? 'Yes' : 'Pending'}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Notes */}
          {tenant.notes && (
            <div className="p-4 dark:bg-[#242740] bg-gray-50 rounded-xl border dark:border-[#2d3052] border-gray-200">
              <h4 className="text-xs font-extrabold dark:text-[#6b6e82] text-gray-500 uppercase tracking-wider mb-2">Notes</h4>
              <p className="text-sm dark:text-[#a0a3b1] text-gray-600">{tenant.notes}</p>
            </div>
          )}
        </div>

        {/* Drawer footer */}
        {tenant.status === 'onboarding_completed' && (
          <div className="p-6 border-t dark:border-[#2d3052] border-gray-200">
            <Button
              variant="danger"
              onClick={() => { onClose(); onOffboard(tenant); }}
              className="w-full flex items-center justify-center gap-2"
            >
              <LogOut size={16} /> Initiate Offboarding
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tenant Row Card ────────────────────────────────────────────────────────────
function TenantCard({ tenant, onView, onOffboard }) {
  const u = tenant.userId || {};
  return (
    <div className="p-5 dark:bg-[#242740] bg-white rounded-[14px] border dark:border-[#2d3052] border-gray-200 hover:border-[#6c63ff]/40 transition-all flex flex-col sm:flex-row sm:items-center gap-4">
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#a855f7] flex items-center justify-center text-white font-black text-lg shrink-0">
        {u.name?.[0]?.toUpperCase() || '?'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold dark:text-[#f0f0f8] text-gray-900">{u.name || '—'}</h3>
          <StatusBadge status={tenant.status} />
        </div>
        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-xs dark:text-[#6b6e82] text-gray-500">
            <Building2 size={11} /> {tenant.pgId?.name || '—'}
          </span>
          <span className="flex items-center gap-1 text-xs dark:text-[#6b6e82] text-gray-500">
            <Phone size={11} /> {u.mobNo1 || '—'}
          </span>
          {tenant.joiningDate && (
            <span className="flex items-center gap-1 text-xs dark:text-[#6b6e82] text-gray-500">
              <Calendar size={11} /> Joined {formatDate(tenant.joiningDate)}
            </span>
          )}
          {tenant.currentBedId && (
            <span className="flex items-center gap-1 text-xs dark:text-[#6b6e82] text-gray-500">
              <Home size={11} /> Room {tenant.currentBedId.roomId?.roomNumber || '—'} · Bed {tenant.currentBedId.bedNumber?.split('-')?.[1] || tenant.currentBedId.bedNumber || '—'}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          onClick={() => onView(tenant)}
          className="text-xs flex items-center gap-1.5 h-8 px-3"
        >
          <Eye size={13} /> View
        </Button>
        {tenant.status === 'onboarding_completed' && (
          <Button
            variant="danger"
            onClick={() => onOffboard(tenant)}
            className="text-xs flex items-center gap-1.5 h-8 px-3"
          >
            <LogOut size={13} /> Offboard
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main ManageTenants page ────────────────────────────────────────────────────
export default function ManageTenants() {
  const [search, setSearch]             = useState('');
  const [pgFilter, setPgFilter]         = useState('');
  const [statusFilter, setStatusFilter] = useState('onboarding_completed');
  const [page, setPage]                 = useState(1);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [offboardTarget, setOffboardTarget] = useState(null);

  // Fetch managed PGs for filter dropdown
  const { data: pgsData } = useQuery({
    queryKey: ['my-pgs'],
    queryFn: async () => (await getMyPGsApi()).data?.data,
  });

  // Fetch tenants with filters
  const { data: tenantsData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['tenants', search, pgFilter, statusFilter, page],
    queryFn: async () =>
      (await listTenantsApi({
        search: search || undefined,
        pgId:   pgFilter || undefined,
        status: statusFilter === '' ? 'all' : (statusFilter || undefined),
        page,
        limit: 20,
      })).data?.data,
    keepPreviousData: true,
  });

  const tenants     = tenantsData?.results || [];
  const total       = tenantsData?.totalResults || 0;
  const totalPages  = Math.ceil(total / 20);

  const handleStatusFilter = (s) => { setStatusFilter(s); setPage(1); };
  const handlePgFilter     = (v) => { setPgFilter(v); setPage(1); };
  const handleSearch       = (v) => { setSearch(v); setPage(1); };

  return (
    <div className="fade-in pb-10 max-w-6xl mx-auto px-4">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black dark:text-[#f0f0f8] text-gray-900 flex items-center gap-3">
            <Users size={28} className="text-[#6c63ff]" /> My Tenants
          </h1>
          <p className="text-sm dark:text-[#6b6e82] text-gray-500 mt-1">
            Central directory of all tenants across your managed PGs.
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => refetch()}
          loading={isFetching}
          className="flex items-center gap-2 text-sm"
        >
          {!isFetching && <RefreshCw size={14} />} Refresh
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-[#6b6e82] text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, phone, or email…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg dark:bg-[#242740] bg-white border dark:border-[#2d3052] border-gray-200 dark:text-[#f0f0f8] text-gray-900 text-sm focus:outline-none focus:border-[#6c63ff] transition-colors"
          />
        </div>

        {/* PG filter */}
        {Array.isArray(pgsData?.pgs) && pgsData.pgs.length > 0 && (
          <select
            value={pgFilter}
            onChange={(e) => handlePgFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg dark:bg-[#242740] bg-white border dark:border-[#2d3052] border-gray-200 dark:text-[#f0f0f8] text-gray-900 text-sm focus:outline-none focus:border-[#6c63ff] transition-colors"
          >
            <option value="">All PGs</option>
            {pgsData.pgs.map((pg) => (
              <option key={pg._id} value={pg._id}>{pg.name}</option>
            ))}
          </select>
        )}

        {/* Status tabs */}
        <div className="flex bg-gray-100 dark:bg-[#242740] rounded-lg p-1 gap-1 flex-wrap">
          {[
            { value: 'onboarding_completed', label: 'Active' },
            { value: 'settlement_pending',   label: 'Checkout Pending' },
            { value: '',                     label: 'All' },
            { value: 'removed',              label: 'Checked Out' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleStatusFilter(value)}
              className={[
                'px-3 py-1.5 rounded-md text-xs font-bold transition-all',
                statusFilter === value
                  ? 'bg-[#6c63ff] text-white shadow-sm'
                  : 'dark:text-[#6b6e82] text-gray-500 hover:dark:text-[#f0f0f8] hover:text-gray-900',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-2 mb-5 text-sm dark:text-[#6b6e82] text-gray-500">
        <span className="font-bold dark:text-[#f0f0f8] text-gray-900">{total}</span> tenant{total !== 1 ? 's' : ''} found
        {statusFilter && <> · Filtered: <StatusBadge status={statusFilter} /></>}
      </div>

      {/* Tenant list */}
      {isLoading ? (
        <Spinner center />
      ) : tenants.length === 0 ? (
        <EmptyState
          icon={<Users size={56} className="text-gray-400 dark:text-[#6b6e82]" />}
          title="No Tenants Found"
          description={
            statusFilter === 'onboarding_completed'
              ? "No active tenants found. Onboard a tenant to get started."
              : "No tenants match your current filters."
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {tenants.map((tenant) => (
            <TenantCard
              key={tenant._id}
              tenant={tenant}
              onView={setSelectedTenant}
              onOffboard={setOffboardTarget}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <Button
            variant="ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-sm"
          >
            Previous
          </Button>
          <span className="text-sm dark:text-[#6b6e82] text-gray-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-sm"
          >
            Next
          </Button>
        </div>
      )}

      {/* Tenant Detail Drawer */}
      {selectedTenant && (
        <TenantDrawer
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
          onOffboard={(t) => { setSelectedTenant(null); setOffboardTarget(t); }}
        />
      )}

      {/* Offboarding Modal */}
      <OffboardingModal
        isOpen={!!offboardTarget}
        onClose={() => setOffboardTarget(null)}
        onboarding={offboardTarget}
      />
    </div>
  );
}
