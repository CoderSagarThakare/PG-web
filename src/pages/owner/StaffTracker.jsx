import { useState, useEffect } from 'react';
import { useDebounce } from '../../utils/helpers';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Receipt, Wallet, Plus, CheckCircle2, XCircle, Clock,
  Banknote, Smartphone, Building2,
  UserPlus, TrendingUp, Edit3, Trash2, IndianRupee,
  FileText, Image, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  Button, Card, Badge, Modal, Input, Spinner, EmptyState, SelectDropdown
} from '../../components/common';
import { getMyPGsApi } from '../../api/pg.api';
import {
  getEmployeesApi, addEmployeeApi, updateEmployeeApi, removeEmployeeApi,
  getExpensesApi, createExpenseApi, processExpenseApi, markExpensePaidApi, deleteExpenseApi,
  getPayrollsApi, generatePayrollApi, markPayrollPaidApi, searchStaffUsersApi
} from '../../api/staff.api';
import { cn } from '../../utils/cn';

// ── Helpers ───────────────────────────────────────────────────────────────────
const f = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const getErrorMessage = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';

const CURRENT_MONTH = (() => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
})();

// Generate past 12 months for selector
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return { value: val, label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
});

// ── Status/Mode Badges ─────────────────────────────────────────────────────────
const statusVariants = {
  pending:     { variant: 'warning',  label: 'Pending' },
  approved:    { variant: 'success',  label: 'Approved' },
  rejected:    { variant: 'danger',   label: 'Rejected' },
  paid:        { variant: 'success',  label: 'Paid' },
  unpaid:      { variant: 'warning',  label: 'Unpaid' },
  active:      { variant: 'success',  label: 'Active' },
  inactive:    { variant: 'default',  label: 'Inactive' },
  direct:      { variant: 'accent',   label: 'Direct Pay' },
  add_to_salary: { variant: 'info',   label: 'Add to Salary' },
};

const PaymentModeSVG = ({ mode }) => {
  const icons = {
    cash:          <Banknote size={14} />,
    upi:           <Smartphone size={14} />,
    bank_transfer: <Building2 size={14} />,
    cheque:        <FileText size={14} />,
    online:        <TrendingUp size={14} />,
  };
  return <span className="inline-flex items-center gap-1">{icons[mode] || <IndianRupee size={14} />} {mode?.replace('_', ' ')}</span>;
};

// ── Tab navigation ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'staff',    label: 'Staff List',     icon: <Users size={16} /> },
  { id: 'expenses', label: 'Expense Claims', icon: <Receipt size={16} /> },
  { id: 'payroll',  label: 'Salary Payouts', icon: <Wallet size={16} /> },
];

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, colorClass }) => (
  <Card className="flex items-center gap-4 p-4">
    <div className={cn('p-3 rounded-xl', colorClass, 'bg-opacity-15')}>
      <span className={colorClass}>{icon}</span>
    </div>
    <div>
      <div className={cn('text-xl font-black', colorClass)}>{value}</div>
      <div className="text-[11px] font-semibold text-gray-500 dark:text-[#6b6e82] uppercase tracking-wide">{label}</div>
      {sub && <div className="text-[10px] text-gray-400 dark:text-[#6b6e82]">{sub}</div>}
    </div>
  </Card>
);

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function StaffTracker() {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const qc = useQueryClient();

  // Employees only see the Expenses tab
  const [activeTab, setActiveTab] = useState(isEmployee ? 'expenses' : 'staff');
  const [filterPgId, setFilterPgId] = useState('');
  const [filterMonth, setFilterMonth] = useState(CURRENT_MONTH);

  // Modals
  const [addStaffModal, setAddStaffModal] = useState(false);
  const [editStaffModal, setEditStaffModal] = useState(null);
  const [addExpenseModal, setAddExpenseModal] = useState(false);
  const [processExpenseModal, setProcessExpenseModal] = useState(null);
  const [payrollModal, setPayrollModal] = useState(null);
  const [markPaidModal, setMarkPaidModal] = useState(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  // Employees don't own PGs — fetch their own staff record to get the assigned PG
  const { data: myStaffRecord } = useQuery({
    queryKey: ['my-staff-record'],
    queryFn: async () => (await getEmployeesApi({ limit: 100 })).data?.data,
    enabled: isEmployee,
  });
  const myEmployees = myStaffRecord?.employees || [];
  const assignedPgs = myEmployees.flatMap(emp => emp.pgIds || []).filter(Boolean);
  const assignedPgOptions = assignedPgs.map(pg => ({ value: pg._id, label: pg.name }));

  // Owner/manager: fetch all their PGs for the filter dropdown
  const { data: pgsData } = useQuery({
    queryKey: ['staff-pgs'],
    queryFn: async () => (await getMyPGsApi()).data?.data,
    enabled: !isEmployee,
  });
  const pgList = pgsData?.pgs || pgsData || [];
  const pgOptions = (Array.isArray(pgList) ? pgList : []).map(pg => ({ value: pg._id, label: pg.name }));

  const { data: empData, isLoading: empLoading } = useQuery({
    queryKey: ['employees', filterPgId],
    queryFn: async () => (await getEmployeesApi({ pgId: filterPgId || undefined, limit: 100 })).data?.data,
    enabled: activeTab === 'staff',
  });
  const employees = empData?.employees || [];

  const { data: expData, isLoading: expLoading } = useQuery({
    queryKey: ['expenses', filterPgId],
    queryFn: async () => (
      await getExpensesApi({
        pgId: filterPgId || undefined,
        limit: 100,
      })
    ).data?.data,
    enabled: activeTab === 'expenses',
  });
  const expenses = expData?.expenses || [];

  const { data: payData, isLoading: payLoading } = useQuery({
    queryKey: ['payrolls', filterPgId, filterMonth],
    queryFn: async () => (await getPayrollsApi({ pgId: filterPgId || undefined, month: filterMonth, limit: 100 })).data?.data,
    enabled: activeTab === 'payroll',
  });
  const payrolls = payData?.payments || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['employees'] });
    qc.invalidateQueries({ queryKey: ['expenses'] });
    qc.invalidateQueries({ queryKey: ['payrolls'] });
  };

  // ── Mutations ────────────────────────────────────────────────────────────────
  const addEmpMut = useMutation({
    mutationFn: addEmployeeApi,
    onSuccess: () => { toast.success('Staff member added!'); invalidate(); setAddStaffModal(false); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateEmpMut = useMutation({
    mutationFn: ({ id, data }) => updateEmployeeApi(id, data),
    onSuccess: () => { toast.success('Staff record updated!'); invalidate(); setEditStaffModal(null); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const removeEmpMut = useMutation({
    mutationFn: removeEmployeeApi,
    onSuccess: () => { toast.success('Staff member removed'); invalidate(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const addExpMut = useMutation({
    mutationFn: createExpenseApi,
    onSuccess: () => { toast.success('Expense submitted!'); invalidate(); setAddExpenseModal(false); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const processExpMut = useMutation({
    mutationFn: ({ id, data }) => processExpenseApi(id, data),
    onSuccess: (_, { data }) => {
      toast.success(`Expense ${data.action}d!`);
      invalidate();
      setProcessExpenseModal(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const markExpPaidMut = useMutation({
    mutationFn: markExpensePaidApi,
    onSuccess: () => { toast.success('Expense marked as paid!'); invalidate(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteExpMut = useMutation({
    mutationFn: deleteExpenseApi,
    onSuccess: () => { toast.success('Expense deleted'); invalidate(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const genPayrollMut = useMutation({
    mutationFn: generatePayrollApi,
    onSuccess: () => { toast.success('Payroll generated!'); invalidate(); setPayrollModal(null); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const markPayPaidMut = useMutation({
    mutationFn: ({ id, data }) => markPayrollPaidApi(id, data),
    onSuccess: () => { toast.success('Payroll marked as paid!'); invalidate(); setMarkPaidModal(null); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ── Stats for current tab ─────────────────────────────────────────────────
  const activeEmp = employees.filter(e => e.status === 'active').length;
  const pendingExp = expenses.filter(e => e.status === 'pending').length;
  const approvedExpAmt = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0);
  const pendingPay = payrolls.filter(p => p.status === 'pending').length;
  const totalPayAmt = payrolls.reduce((s, p) => s + p.totalAmount, 0);

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900">
            {isEmployee ? 'My Expense Claims' : 'Staff & Expense Tracker'}
          </h1>
          <p className="text-sm dark:text-[#6b6e82] text-gray-500 mt-1">
            {isEmployee
              ? 'Submit and track your own expense claims for reimbursement'
              : 'Manage staff, track expense claims, and handle salary payouts'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {activeTab === 'staff' && !isEmployee && (
            <Button onClick={() => setAddStaffModal(true)}>
              <UserPlus size={16} /> Add Staff
            </Button>
          )}
          {activeTab === 'expenses' && (
            <Button onClick={() => setAddExpenseModal(true)}>
              <Plus size={16} /> {isEmployee ? 'Submit Expense' : 'Log Expense'}
            </Button>
          )}
          {activeTab === 'payroll' && !isEmployee && (
            <Button onClick={() => setPayrollModal({ employeeId: '', month: filterMonth })}>
              <Plus size={16} /> Generate Payroll
            </Button>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      {((!isEmployee && pgOptions.length > 0) || (isEmployee && assignedPgOptions.length > 1)) && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="w-52">
            <SelectDropdown
              value={filterPgId}
              onChange={e => setFilterPgId(e.target.value)}
              options={[
                { value: '', label: isEmployee ? 'All My PGs' : 'All PGs' },
                ...(isEmployee ? assignedPgOptions : pgOptions),
              ]}
              placeholder="Filter by PG"
            />
          </div>
          {activeTab === 'payroll' && !isEmployee && (
            <div className="w-52">
              <SelectDropdown
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                options={MONTH_OPTIONS}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className={`grid gap-4 mb-6 ${isEmployee ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
        {!isEmployee && <StatCard icon={<Users size={20} />} label="Active Staff" value={activeEmp} sub="members" colorClass="text-[#6c63ff]" />}
        <StatCard icon={<Clock size={20} />} label="Pending Claims" value={pendingExp} sub="awaiting approval" colorClass="text-[#ffa94d]" />
        <StatCard icon={<CheckCircle2 size={20} />} label="Approved" value={f(approvedExpAmt)} sub="to reimburse" colorClass="text-[#00d4aa]" />
        {!isEmployee && <StatCard icon={<Wallet size={20} />} label="Payroll Due" value={pendingPay} sub={`${f(totalPayAmt)} total`} colorClass="text-[#ff4d6d]" />}
      </div>

      {/* ── Tabs: employees only see Expenses ── */}
      {!isEmployee && (
        <div className="flex gap-1 mb-6 p-1 bg-gray-100 dark:bg-[#242740] rounded-xl w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#1a1d2e] text-[#6c63ff] shadow-sm'
                  : 'text-gray-500 dark:text-[#a0a3b1] hover:text-gray-700 dark:hover:text-[#f0f0f8]'
              )}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: STAFF LIST                                               */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'staff' && (
        <div>
          {empLoading ? <Spinner center /> : employees.length === 0 ? (
            <EmptyState
              icon={<Users size={48} />}
              title="No staff added yet"
              description="Add employees or managers from your existing user accounts"
              action={<Button onClick={() => setAddStaffModal(true)}><UserPlus size={16} /> Add First Staff Member</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map(emp => (
                <Card key={emp._id} className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={emp.userId?.picture || 'https://i.imgur.com/CR1iy7U.png'}
                        alt={emp.userId?.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-[#6c63ff]/20"
                      />
                      <div>
                        <div className="font-bold text-sm dark:text-[#f0f0f8] text-gray-900">{emp.userId?.name}</div>
                        <Badge variant={emp.userId?.role === 'manager' ? 'manager' : 'default'} className="text-[10px]">
                          {emp.userId?.role}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant={statusVariants[emp.status]?.variant || 'default'}>
                      {statusVariants[emp.status]?.label || emp.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-gray-50 dark:bg-[#242740] rounded-lg">
                      <div className="text-gray-400 dark:text-[#6b6e82]">Monthly Salary</div>
                      <div className="font-black text-[#6c63ff] text-sm">{f(emp.monthlySalary)}</div>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-[#242740] rounded-lg">
                      <div className="text-gray-400 dark:text-[#6b6e82]">Joined</div>
                      <div className="font-semibold dark:text-[#f0f0f8] text-gray-700">{formatDate(emp.joinedDate)}</div>
                    </div>
                  </div>

                  <div className="text-[11px] dark:text-[#6b6e82] text-gray-500">
                    <div className="font-semibold mb-0.5 line-clamp-1" title={emp.pgIds?.map(p => p.name).join(', ')}>
                      {emp.pgIds?.map(p => p.name).join(', ') || 'No PGs assigned'}
                    </div>
                    <div>{emp.userId?.mobNo1 || emp.userId?.email}</div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t dark:border-[#2d3052] border-gray-200">
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => setEditStaffModal(emp)}>
                      <Edit3 size={13} /> Edit
                    </Button>
                    <Button
                      size="sm" variant="danger"
                      onClick={() => {
                        if (window.confirm(`Remove ${emp.userId?.name} from staff?`)) {
                          removeEmpMut.mutate(emp._id);
                        }
                      }}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: EXPENSES                                                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'expenses' && (
        <div className="flex flex-col gap-3">
          {expLoading ? <Spinner center /> : expenses.length === 0 ? (
            <EmptyState
              icon={<Receipt size={48} />}
              title="No expense claims yet"
              description="Staff can log expenses for reimbursement here"
              action={<Button onClick={() => setAddExpenseModal(true)}><Plus size={16} /> Log First Expense</Button>}
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#2d3052]">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#242740]">
                    {['Staff', 'Description', 'Amount', 'Date', 'Status', 'Reimbursement', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-[#6b6e82]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp._id} className="border-t border-gray-100 dark:border-[#2d3052]/30 hover:bg-gray-50 dark:hover:bg-[#242740]/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold dark:text-[#f0f0f8] text-gray-900">{exp.spentBy?.name}</div>
                        <div className="text-[10px] text-gray-400 dark:text-[#6b6e82] capitalize">{exp.spentBy?.role}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="dark:text-[#f0f0f8] text-gray-700 max-w-[180px] truncate">{exp.description}</div>
                        <div className="text-[10px] text-gray-400 dark:text-[#6b6e82]">{exp.category}</div>
                      </td>
                      <td className="px-4 py-3 font-black text-[#6c63ff]">{f(exp.amount)}</td>
                      <td className="px-4 py-3 text-xs dark:text-[#a0a3b1] text-gray-600">{formatDate(exp.spentDate)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariants[exp.status]?.variant || 'default'}>
                          {statusVariants[exp.status]?.label || exp.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {exp.reimbursementType ? (
                          <Badge variant={statusVariants[exp.reimbursementType]?.variant || 'default'}>
                            {statusVariants[exp.reimbursementType]?.label}
                          </Badge>
                        ) : <span className="text-gray-400 dark:text-[#6b6e82] text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {exp.status === 'pending' && (user?.role === 'owner' || (user?.role === 'manager' && exp.spentBy?.role === 'employee')) && (
                            <Button size="sm" variant="success" onClick={() => setProcessExpenseModal(exp)}>
                              Review
                            </Button>
                          )}
                          {exp.status === 'approved' && exp.reimbursementType === 'direct' && exp.payoutStatus === 'unpaid' && (
                            <Button size="sm" variant="accent" onClick={() => markExpPaidMut.mutate(exp._id)}>
                              Pay
                            </Button>
                          )}
                          {exp.status === 'pending' && (
                            <Button size="sm" variant="danger" onClick={() => {
                              if (window.confirm('Delete this expense?')) deleteExpMut.mutate(exp._id);
                            }}>
                              <Trash2 size={13} />
                            </Button>
                          )}
                          {exp.photos?.length > 0 && (
                            <Button size="sm" variant="ghost" title={`${exp.photos.length} receipt(s)`}>
                              <Image size={13} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: PAYROLL                                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'payroll' && (
        <div className="flex flex-col gap-3">
          {payLoading ? <Spinner center /> : payrolls.length === 0 ? (
            <EmptyState
              icon={<Wallet size={48} />}
              title="No payroll records for this month"
              description="Generate payroll for each staff member to track salary payments"
              action={
                <Button onClick={() => setPayrollModal({ employeeId: '', month: filterMonth })}>
                  <Plus size={16} /> Generate Payroll
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {payrolls.map(pay => {
                const emp = pay.employeeId;
                const u = emp?.userId;
                return (
                  <Card key={pay._id} className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={u?.picture || 'https://i.imgur.com/CR1iy7U.png'}
                          alt={u?.name}
                          className="w-9 h-9 rounded-full object-cover border-2 border-[#6c63ff]/20"
                        />
                        <div>
                          <div className="font-bold text-sm dark:text-[#f0f0f8] text-gray-900">{u?.name}</div>
                          <div className="text-[10px] dark:text-[#6b6e82] text-gray-500 capitalize">{u?.role} · {pay.pgId?.name}</div>
                        </div>
                      </div>
                      <Badge variant={pay.status === 'paid' ? 'success' : 'warning'}>
                        {pay.status === 'paid' ? 'Paid' : 'Pending'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 bg-gray-50 dark:bg-[#242740] rounded-lg text-center">
                        <div className="text-gray-400 dark:text-[#6b6e82]">Salary</div>
                        <div className="font-black text-[#6c63ff]">{f(pay.salaryAmount)}</div>
                      </div>
                      <div className="p-2 bg-gray-50 dark:bg-[#242740] rounded-lg text-center">
                        <div className="text-gray-400 dark:text-[#6b6e82]">Expenses</div>
                        <div className="font-black text-[#00d4aa]">{f(pay.reimbursedExpenses)}</div>
                      </div>
                      <div className="p-2 bg-[#6c63ff]/10 dark:bg-[#6c63ff]/15 rounded-lg text-center border border-[#6c63ff]/20">
                        <div className="text-[#6c63ff]">Total</div>
                        <div className="font-black text-[#6c63ff]">{f(pay.totalAmount)}</div>
                      </div>
                    </div>

                    {pay.status === 'paid' && (
                      <div className="text-[11px] dark:text-[#6b6e82] text-gray-500 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-[#51cf66]" />
                        Paid on {formatDate(pay.paidDate)}
                        {pay.paymentMode && <span>· <PaymentModeSVG mode={pay.paymentMode} /></span>}
                        {pay.referenceNo && <span>· #{pay.referenceNo}</span>}
                      </div>
                    )}

                    {pay.status === 'pending' && (
                      <Button
                        variant="success"
                        className="w-full"
                        onClick={() => setMarkPaidModal(pay)}
                      >
                        <CheckCircle2 size={15} /> Mark as Paid
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODALS                                                         */}
      {/* ══════════════════════════════════════════════════════════════ */}

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={addStaffModal}
        onClose={() => setAddStaffModal(false)}
        pgOptions={pgOptions}
        onSubmit={(data) => addEmpMut.mutate(data)}
        loading={addEmpMut.isPending}
      />

      {/* Edit Staff Modal */}
      {editStaffModal && (
        <EditStaffModal
          isOpen={!!editStaffModal}
          employee={editStaffModal}
          pgOptions={pgOptions}
          onClose={() => setEditStaffModal(null)}
          onSubmit={(data) => updateEmpMut.mutate({ id: editStaffModal._id, data })}
          loading={updateEmpMut.isPending}
        />
      )}

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={addExpenseModal}
        onClose={() => setAddExpenseModal(false)}
        pgOptions={isEmployee ? assignedPgOptions : pgOptions}
        employees={employees}
        currentUser={user}
        defaultPgId={isEmployee && assignedPgOptions.length === 1 ? assignedPgOptions[0].value : ''}
        onSubmit={(data) => addExpMut.mutate(data)}
        loading={addExpMut.isPending}
      />

      {/* Process Expense Modal */}
      {processExpenseModal && (
        <ProcessExpenseModal
          isOpen={!!processExpenseModal}
          expense={processExpenseModal}
          onClose={() => setProcessExpenseModal(null)}
          onSubmit={(data) => processExpMut.mutate({ id: processExpenseModal._id, data })}
          loading={processExpMut.isPending}
        />
      )}

      {/* Generate Payroll Modal */}
      {payrollModal !== null && (
        <GeneratePayrollModal
          isOpen={payrollModal !== null}
          employees={employees}
          defaultMonth={filterMonth}
          onClose={() => setPayrollModal(null)}
          onSubmit={(data) => genPayrollMut.mutate(data)}
          loading={genPayrollMut.isPending}
        />
      )}

      {/* Mark Payroll Paid Modal */}
      {markPaidModal && (
        <MarkPaidModal
          isOpen={!!markPaidModal}
          payroll={markPaidModal}
          onClose={() => setMarkPaidModal(null)}
          onSubmit={(data) => markPayPaidMut.mutate({ id: markPaidModal._id, data })}
          loading={markPayPaidMut.isPending}
        />
      )}
    </div>
  );
}

// ── Modal: Add Staff ────────────────────────────────────────────────────────────
function AddStaffModal({ isOpen, onClose, pgOptions, onSubmit, loading }) {
  const [form, setForm] = useState({ pgIds: [], monthlySalary: '', joinedDate: '', notes: '' });
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Debounce the raw input — API fires only after 400ms of no typing
  const debouncedSearch = useDebounce(userSearch, 400);

  const { data: usersData, isFetching: isSearching } = useQuery({
    queryKey: ['staff-users', debouncedSearch],
    queryFn: async () => (await searchStaffUsersApi({ search: debouncedSearch, limit: 10 })).data?.data,
    enabled: debouncedSearch.trim().length >= 2,
  });
  const userList = usersData?.users || [];

  const handleSubmit = () => {
    if (!selectedUser) return toast.error('Please select a user');
    if (!form.pgIds || form.pgIds.length === 0) return toast.error('Please select at least one PG');
    if (!form.joinedDate) return toast.error('Please set joining date');
    if (!form.monthlySalary || Number(form.monthlySalary) <= 0) return toast.error('Please enter monthly salary');
    onSubmit({ userId: selectedUser._id, ...form, monthlySalary: Number(form.monthlySalary) });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Staff Member">
      <div className="flex flex-col gap-4 mt-1">
        <div className="p-3 bg-[#6c63ff]/10 text-[#6c63ff] border border-[#6c63ff]/20 rounded-lg text-xs font-semibold leading-relaxed">
          Select an existing user with an <strong>employee</strong> or <strong>manager</strong> role. Role is determined by their account type.
        </div>

        {/* User Search with debounce */}
        <div className="relative">
          <Input
            label="Search Staff User"
            placeholder="Type name or email..."
            value={selectedUser ? selectedUser.name : userSearch}
            onChange={e => {
              setUserSearch(e.target.value);
              setSelectedUser(null);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />

          {selectedUser && (
            <button
              className="absolute right-3 top-[34px] text-gray-400 hover:text-[#ff4d6d] transition-colors"
              onClick={() => { setSelectedUser(null); setUserSearch(''); }}
            >
              <X size={15} />
            </button>
          )}

          {!selectedUser && isSearching && (
            <div className="absolute right-3 top-[34px]">
              <svg className="animate-spinner w-4 h-4 text-[#6c63ff]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
          )}

          {showDropdown && !selectedUser && (
            <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-lg shadow-xl mt-1 overflow-hidden">
              {debouncedSearch.trim().length < 2 ? (
                <div className="px-4 py-3 text-xs text-gray-400 dark:text-[#6b6e82] text-center">
                  Type at least 2 characters to search…
                </div>
              ) : isSearching ? (
                <div className="px-4 py-3 text-xs text-gray-400 dark:text-[#6b6e82] text-center animate-pulse-soft">
                  Searching…
                </div>
              ) : userList.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-400 dark:text-[#6b6e82] text-center">
                  No employee / manager found for &ldquo;{debouncedSearch}&rdquo;
                </div>
              ) : (
                userList.map(u => (
                  <button
                    key={u._id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#242740] text-left transition-colors border-b border-gray-100 dark:border-[#2d3052]/40 last:border-b-0"
                    onClick={() => { setSelectedUser(u); setShowDropdown(false); setUserSearch(''); }}
                  >
                    <img
                      src={u.picture || 'https://i.imgur.com/CR1iy7U.png'}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-[#6c63ff]/20"
                      alt={u.name}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold dark:text-[#f0f0f8] text-gray-900 truncate">{u.name}</div>
                      <div className="text-[10px] text-gray-400 dark:text-[#6b6e82] truncate capitalize">{u.role} · {u.email}</div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#6c63ff]/10 text-[#6c63ff] font-bold capitalize flex-shrink-0">{u.role}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div>
          <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-1.5">
            Assign to PGs <span className="text-[#ff4d6d]">*</span>
          </label>
          <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto p-3 bg-gray-50 dark:bg-[#242740]/50 border border-gray-200 dark:border-[#2d3052] rounded-lg">
            {pgOptions.map(pg => (
              <label key={pg.value} className="flex items-center gap-2.5 text-sm dark:text-[#f0f0f8] text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.pgIds?.includes(pg.value)}
                  onChange={e => {
                    const checked = e.target.checked;
                    setForm(f => {
                      const pgIds = f.pgIds || [];
                      if (checked) {
                        return { ...f, pgIds: [...pgIds, pg.value] };
                      } else {
                        return { ...f, pgIds: pgIds.filter(id => id !== pg.value) };
                      }
                    });
                  }}
                  className="rounded border-gray-300 dark:border-[#2d3052] text-[#6c63ff] focus:ring-[#6c63ff] bg-white dark:bg-[#1a1d2e]"
                />
                <span>{pg.label}</span>
              </label>
            ))}
          </div>
        </div>

        <Input
          label="Monthly Salary (₹)"
          type="number"
          min="0"
          value={form.monthlySalary}
          onChange={e => setForm(f => ({ ...f, monthlySalary: e.target.value }))}
          placeholder="e.g. 15000"
          required
        />

        <Input
          label="Joining Date"
          type="date"
          value={form.joinedDate}
          onChange={e => setForm(f => ({ ...f, joinedDate: e.target.value }))}
          required
        />

        <Input
          label="Notes (optional)"
          as="textarea"
          rows={2}
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Any additional info..."
        />

        <div className="flex gap-3 pt-2 border-t dark:border-[#2d3052] border-gray-200">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={loading} onClick={handleSubmit}>Add Staff</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal: Edit Staff ────────────────────────────────────────────────────────────
function EditStaffModal({ isOpen, employee, pgOptions, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    monthlySalary: employee.monthlySalary || '',
    status: employee.status || 'active',
    notes: employee.notes || '',
    joinedDate: employee.joinedDate ? employee.joinedDate.slice(0, 10) : '',
    pgIds: employee.pgIds?.map(p => p._id || p) || [],
  });

  const handleSubmit = () => {
    if (!form.pgIds || form.pgIds.length === 0) return toast.error('Please select at least one PG');
    onSubmit({
      monthlySalary: Number(form.monthlySalary),
      status: form.status,
      notes: form.notes,
      joinedDate: form.joinedDate || undefined,
      pgIds: form.pgIds,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit — ${employee.userId?.name}`}>
      <div className="flex flex-col gap-4 mt-1">
        <Input
          label="Monthly Salary (₹)"
          type="number"
          min="0"
          value={form.monthlySalary}
          onChange={e => setForm(f => ({ ...f, monthlySalary: e.target.value }))}
          required
        />
        <div>
          <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-1.5">Status</label>
          <SelectDropdown
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
          />
        </div>

        <div>
          <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-1.5">
            Assign to PGs <span className="text-[#ff4d6d]">*</span>
          </label>
          <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto p-3 bg-gray-50 dark:bg-[#242740]/50 border border-gray-200 dark:border-[#2d3052] rounded-lg">
            {pgOptions.map(pg => (
              <label key={pg.value} className="flex items-center gap-2.5 text-sm dark:text-[#f0f0f8] text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.pgIds?.includes(pg.value)}
                  onChange={e => {
                    const checked = e.target.checked;
                    setForm(f => {
                      const pgIds = f.pgIds || [];
                      if (checked) {
                        return { ...f, pgIds: [...pgIds, pg.value] };
                      } else {
                        return { ...f, pgIds: pgIds.filter(id => id !== pg.value) };
                      }
                    });
                  }}
                  className="rounded border-gray-300 dark:border-[#2d3052] text-[#6c63ff] focus:ring-[#6c63ff] bg-white dark:bg-[#1a1d2e]"
                />
                <span>{pg.label}</span>
              </label>
            ))}
          </div>
        </div>

        <Input
          label="Joining Date"
          type="date"
          value={form.joinedDate}
          onChange={e => setForm(f => ({ ...f, joinedDate: e.target.value }))}
        />
        <Input
          label="Notes"
          as="textarea"
          rows={2}
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Any remarks..."
        />
        <div className="flex gap-3 pt-2 border-t dark:border-[#2d3052] border-gray-200">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={loading} onClick={handleSubmit}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal: Add Expense ──────────────────────────────────────────────────────────
function AddExpenseModal({ isOpen, onClose, pgOptions, employees, currentUser, defaultPgId, onSubmit, loading }) {
  const isEmployee = currentUser?.role === 'employee';
  const isStaff = currentUser?.role === 'owner' || currentUser?.role === 'manager';

  const [form, setForm] = useState({
    pgId: defaultPgId || '', amount: '', description: '', category: 'General',
    spentDate: new Date().toISOString().slice(0, 10), spentBy: '', reimbursementType: '',
  });

  // Sync defaultPgId when it resolves asynchronously (employee's PG loaded after component mount)
  useEffect(() => {
    if (defaultPgId && !form.pgId) {
      setForm(f => ({ ...f, pgId: defaultPgId }));
    }
  }, [defaultPgId]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        pgId: defaultPgId || '',
        amount: '', description: '', category: 'General',
        spentDate: new Date().toISOString().slice(0, 10),
        spentBy: '', reimbursementType: '',
      });
    }
  }, [isOpen, defaultPgId]);

  const CATEGORIES = ['General', 'Maintenance', 'Utilities', 'Supplies', 'Travel', 'Food', 'Other'];

  const handleSubmit = () => {
    if (!form.pgId) return toast.error('Select a PG');
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter a valid amount');
    if (!form.description.trim()) return toast.error('Enter expense description');
    if (!form.spentDate) return toast.error('Enter spent date');
    onSubmit({
      pgId: form.pgId,
      spentBy: isStaff && form.spentBy ? form.spentBy : undefined,
      amount: Number(form.amount),
      description: form.description,
      category: form.category,
      spentDate: form.spentDate,
      reimbursementType: form.reimbursementType || undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEmployee ? 'Submit Expense Claim' : 'Log Expense Claim'}>
      <div className="flex flex-col gap-4 mt-1">
        {/* Employee: PG is locked to their assigned PG if they only have 1, otherwise they can choose */}
        {isEmployee && pgOptions.length <= 1 ? (
          <div className="p-3 bg-[#6c63ff]/10 border border-[#6c63ff]/20 rounded-lg">
            <div className="text-[11px] font-bold text-[#6c63ff] uppercase tracking-wide mb-1">Assigned PG</div>
            <div className="text-sm font-semibold dark:text-[#f0f0f8] text-gray-800">
              {pgOptions.find(p => p.value === form.pgId)?.label || (form.pgId ? 'Your assigned PG' : 'Not yet assigned to a PG')}
            </div>
          </div>
        ) : (
          <div>
            <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-1.5">
              PG <span className="text-[#ff4d6d]">*</span>
            </label>
            <SelectDropdown
              value={form.pgId}
              onChange={e => setForm(f => ({ ...f, pgId: e.target.value }))}
              options={[{ value: '', label: 'Select PG...' }, ...pgOptions]}
            />
          </div>
        )}

        {/* On Behalf of: only for owner/manager */}
        {isStaff && employees.length > 0 && (
          <div>
            <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-1.5">
              On Behalf of (optional)
            </label>
            <SelectDropdown
              value={form.spentBy}
              onChange={e => setForm(f => ({ ...f, spentBy: e.target.value }))}
              options={[
                { value: '', label: 'Self (me)' },
                ...employees.map(e => ({ value: e.userId?._id, label: `${e.userId?.name} (${e.userId?.role})` }))
              ]}
            />
          </div>
        )}

        <Input
          label="Amount (₹)"
          type="number"
          min="0"
          value={form.amount}
          onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          placeholder="e.g. 500"
          required
        />

        <Input
          label="Description"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="What was this expense for?"
          required
        />

        <div>
          <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-1.5">Category</label>
          <SelectDropdown
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            options={CATEGORIES.map(c => ({ value: c, label: c }))}
          />
        </div>

        <Input
          label="Spent Date"
          type="date"
          value={form.spentDate}
          onChange={e => setForm(f => ({ ...f, spentDate: e.target.value }))}
          required
        />

        {/* Reimbursement type: only for owner/manager */}
        {isStaff && (
          <div>
            <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-1.5">
              Reimbursement Type
            </label>
            <SelectDropdown
              value={form.reimbursementType}
              onChange={e => setForm(f => ({ ...f, reimbursementType: e.target.value }))}
              options={[
                { value: '', label: 'Decide later during approval' },
                { value: 'direct', label: 'Direct Pay (cash/UPI now)' },
                { value: 'add_to_salary', label: 'Add to Next Salary' },
              ]}
            />
          </div>
        )}

        {isEmployee && (
          <div className="p-3 bg-amber-50 dark:bg-[#ffa94d]/10 border border-amber-200 dark:border-[#ffa94d]/20 rounded-lg text-xs text-amber-700 dark:text-[#ffa94d] leading-relaxed">
            💡 Your expense will be reviewed by the manager/owner before reimbursement.
          </div>
        )}

        <div className="flex gap-3 pt-2 border-t dark:border-[#2d3052] border-gray-200">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            loading={loading}
            onClick={handleSubmit}
            disabled={isEmployee && pgOptions.length === 0}
          >
            Submit Claim
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal: Process Expense (Approve/Reject) ────────────────────────────────────
function ProcessExpenseModal({ isOpen, expense, onClose, onSubmit, loading }) {
  const [action, setAction] = useState('approve');
  const [reimbursementType, setReimbursementType] = useState('direct');
  const [rejectionReason, setRejectionReason] = useState('');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review Expense Claim">
      <div className="flex flex-col gap-4 mt-1">
        <div className="p-3 bg-gray-50 dark:bg-[#242740] rounded-xl text-sm">
          <div className="font-bold dark:text-[#f0f0f8] text-gray-900">{expense.spentBy?.name}</div>
          <div className="text-[#6c63ff] font-black text-lg">{`₹${Number(expense.amount).toLocaleString('en-IN')}`}</div>
          <div className="text-gray-500 dark:text-[#a0a3b1] text-xs mt-1">{expense.description}</div>
          <div className="text-gray-400 dark:text-[#6b6e82] text-[10px] mt-1">{formatDate(expense.spentDate)} · {expense.category}</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setAction('approve')}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all',
              action === 'approve'
                ? 'bg-[#51cf66]/15 border-[#51cf66] text-[#51cf66]'
                : 'border-gray-200 dark:border-[#2d3052] text-gray-500 dark:text-[#a0a3b1]'
            )}
          >
            <CheckCircle2 size={16} className="inline mr-1" /> Approve
          </button>
          <button
            onClick={() => setAction('reject')}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all',
              action === 'reject'
                ? 'bg-[#ff4d6d]/15 border-[#ff4d6d] text-[#ff4d6d]'
                : 'border-gray-200 dark:border-[#2d3052] text-gray-500 dark:text-[#a0a3b1]'
            )}
          >
            <XCircle size={16} className="inline mr-1" /> Reject
          </button>
        </div>

        {action === 'approve' && (
          <div>
            <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-1.5">
              Reimbursement Method <span className="text-[#ff4d6d]">*</span>
            </label>
            <SelectDropdown
              value={reimbursementType}
              onChange={e => setReimbursementType(e.target.value)}
              options={[
                { value: 'direct', label: '💸 Direct Pay — Pay immediately' },
                { value: 'add_to_salary', label: '📅 Add to Salary — Include in next payroll' },
              ]}
            />
          </div>
        )}

        {action === 'reject' && (
          <Input
            label="Rejection Reason"
            as="textarea"
            rows={2}
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            placeholder="Why is this being rejected?"
          />
        )}

        <div className="flex gap-3 pt-2 border-t dark:border-[#2d3052] border-gray-200">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            variant={action === 'approve' ? 'success' : 'danger'}
            loading={loading}
            onClick={() => onSubmit({
              action,
              reimbursementType: action === 'approve' ? reimbursementType : undefined,
              rejectionReason: action === 'reject' ? rejectionReason : undefined,
            })}
          >
            {action === 'approve' ? 'Approve Claim' : 'Reject Claim'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal: Generate Payroll ─────────────────────────────────────────────────────
function GeneratePayrollModal({ isOpen, employees, defaultMonth, onClose, onSubmit, loading }) {
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(defaultMonth);

  const empOptions = employees
    .filter(e => e.status === 'active')
    .map(e => ({ value: e._id, label: `${e.userId?.name} (${e.userId?.role}) — ${f(e.monthlySalary)}/mo` }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Payroll Record">
      <div className="flex flex-col gap-4 mt-1">
        <div className="p-3 bg-[#6c63ff]/10 text-[#6c63ff] border border-[#6c63ff]/20 rounded-lg text-xs font-semibold">
          This creates a payroll entry for the selected month. Approved "Add to Salary" expenses for that month are automatically included.
        </div>

        <div>
          <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-1.5">
            Select Staff Member <span className="text-[#ff4d6d]">*</span>
          </label>
          <SelectDropdown
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
            options={[{ value: '', label: 'Choose staff...' }, ...empOptions]}
          />
        </div>

        <div>
          <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-1.5">
            Month <span className="text-[#ff4d6d]">*</span>
          </label>
          <SelectDropdown
            value={month}
            onChange={e => setMonth(e.target.value)}
            options={MONTH_OPTIONS}
          />
        </div>

        <div className="flex gap-3 pt-2 border-t dark:border-[#2d3052] border-gray-200">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            loading={loading}
            onClick={() => {
              if (!employeeId) return toast.error('Select a staff member');
              onSubmit({ employeeId, month });
            }}
          >
            Generate
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal: Mark Payroll as Paid ─────────────────────────────────────────────────
function MarkPaidModal({ isOpen, payroll, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    paidDate: CURRENT_MONTH + '-' + new Date().getDate().toString().padStart(2, '0'),
    paymentMode: 'cash',
    referenceNo: '',
    notes: '',
  });

  const emp = payroll.employeeId;
  const u = emp?.userId;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mark Salary as Paid">
      <div className="flex flex-col gap-4 mt-1">
        <div className="p-3.5 bg-[#51cf66]/10 border border-[#51cf66]/20 rounded-xl">
          <div className="text-sm font-bold dark:text-[#f0f0f8] text-gray-900">{u?.name}</div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[11px] text-gray-500 dark:text-[#6b6e82]">Salary: {f(payroll.salaryAmount)}</span>
            {payroll.reimbursedExpenses > 0 && (
              <span className="text-[11px] text-[#00d4aa]">+ Expenses: {f(payroll.reimbursedExpenses)}</span>
            )}
            <span className="text-sm font-black text-[#51cf66] ml-auto">Total: {f(payroll.totalAmount)}</span>
          </div>
        </div>

        <div>
          <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-1.5">Payment Mode</label>
          <SelectDropdown
            value={form.paymentMode}
            onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'upi', label: 'UPI / Scanner' },
              { value: 'bank_transfer', label: 'Bank Transfer' },
              { value: 'cheque', label: 'Cheque' },
              { value: 'online', label: 'Online' },
            ]}
          />
        </div>

        <Input
          label="Payment Date"
          type="date"
          value={form.paidDate}
          onChange={e => setForm(f => ({ ...f, paidDate: e.target.value }))}
          required
        />

        <Input
          label="Reference / Transaction ID"
          value={form.referenceNo}
          onChange={e => setForm(f => ({ ...f, referenceNo: e.target.value }))}
          placeholder="UPI ID, cheque no, etc."
        />

        <Input
          label="Notes"
          as="textarea"
          rows={2}
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Any remarks..."
        />

        <div className="flex gap-3 pt-2 border-t dark:border-[#2d3052] border-gray-200">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" variant="success" loading={loading} onClick={() => onSubmit(form)}>
            <CheckCircle2 size={15} /> Confirm Payment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
