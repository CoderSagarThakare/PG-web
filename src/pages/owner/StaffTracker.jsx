import { useState, useEffect } from 'react';
import { useDebounce } from '../../utils/helpers';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Receipt, Wallet, Plus, CheckCircle2, XCircle, Clock,
  Banknote, Smartphone, Building2,
  UserPlus, TrendingUp, Edit3, Trash2, IndianRupee,
  FileText, Image, X, Eye, Download
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
  getPayrollsApi, generatePayrollApi, markPayrollPaidApi, searchStaffUsersApi, updatePayrollApi
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

// Generate past 36 months for selector
const MONTH_OPTIONS = Array.from({ length: 36 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return { value: val, label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
});

const handlePaySlipAction = (payOrGroup, action = 'download') => {
  const isGroup = payOrGroup.isGroup;
  const records = isGroup ? payOrGroup.records : [payOrGroup];
  const firstRec = records[0];
  const empName = firstRec.employeeId?.userId?.name || 'Employee';
  const pgNamesStr = isGroup ? payOrGroup.records.map(r => r.pgId?.name).join(', ') : (firstRec.pgId?.name || 'PG');
  const monthStr = firstRec.month || '';
  const formattedMonth = firstRec.month ? new Date(firstRec.month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '';
  const title = `PaySlip_${monthStr}_${empName.replace(/\s+/g, '_')}_${isGroup ? 'Combined' : pgNamesStr.replace(/\s+/g, '_')}`;

  let printWindow = null;
  if (action === 'view') {
    printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked! Please allow pop-ups for this site.');
      return;
    }
  }

  const totalSalary = records.reduce((s, r) => s + (r.salaryAmount || 0), 0);
  const totalExpenses = records.reduce((s, r) => s + (r.reimbursedExpenses || 0), 0);
  const totalNet = records.reduce((s, r) => s + (r.totalAmount || 0), 0);

  const htmlContent = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            color: #1f2937;
            padding: 40px;
            margin: 0;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #6c63ff;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            color: #6c63ff;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .invoice-title {
            font-size: 20px;
            font-weight: 700;
            text-align: right;
            color: #111827;
          }
          .invoice-meta {
            text-align: right;
            font-size: 13px;
            color: #6b7280;
            margin-top: 5px;
          }
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .details-box h3 {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #9ca3af;
            margin: 0 0 8px 0;
            letter-spacing: 0.5px;
          }
          .details-box p {
            margin: 4px 0;
            font-size: 14px;
            color: #374151;
          }
          .details-box .name {
            font-weight: 700;
            font-size: 16px;
            color: #111827;
          }
          .table-container {
            margin-bottom: 30px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
          }
          th {
            background-color: #f9fafb;
            color: #4b5563;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            padding: 12px 16px;
            border-bottom: 1px solid #e5e7eb;
          }
          td {
            padding: 16px;
            font-size: 14px;
            border-bottom: 1px solid #f3f4f6;
            color: #4b5563;
          }
          .font-bold {
            font-weight: 700;
          }
          .text-right {
            text-align: right;
          }
          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-top: 20px;
          }
          .totals-table {
            width: 300px;
          }
          .totals-table td {
            padding: 8px 0;
            border: none;
          }
          .total-row td {
            border-top: 1px solid #e5e7eb;
            border-bottom: 2px double #6c63ff;
            padding-top: 12px;
            font-weight: 700;
            font-size: 16px;
            color: #6c63ff;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
            border-top: 1px solid #f3f4f6;
            padding-top: 20px;
          }
          @media print {
            body {
              padding: 0;
            }
            .container {
              border: none;
              box-shadow: none;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div>
              <div class="logo">StaySync</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Smart PG Management Solutions</div>
            </div>
            <div>
              <div class="invoice-title">PAY SLIP</div>
              <div class="invoice-meta">Month: ${formattedMonth}</div>
              <div class="invoice-meta">Generated: ${new Date().toLocaleDateString('en-IN')}</div>
            </div>
          </div>

          <div class="details-grid">
            <div class="details-box">
              <h3>Employee Details</h3>
              <p class="name">${empName}</p>
              <p>Role: <span style="text-transform: capitalize;">${firstRec.employeeId?.userId?.role || 'Staff'}</span></p>
              <p>Email: ${firstRec.employeeId?.userId?.email || '—'}</p>
              <p>Mobile: ${firstRec.employeeId?.userId?.mobNo1 || '—'}</p>
            </div>
            <div class="details-box">
              <h3>Payment Summary</h3>
              <p><strong>PGs Included:</strong> ${pgNamesStr}</p>
              <p><strong>Status:</strong> <span style="color: #10b981; font-weight: 600;">PAID</span></p>
            </div>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Description / PG Allocation</th>
                  <th class="text-right">Salary Amount</th>
                  <th class="text-right">Reimbursed Expenses</th>
                  <th class="text-right">Total Payout</th>
                </tr>
              </thead>
              <tbody>
                ${records.map(r => `
                <tr>
                  <td>
                    <div class="font-bold" style="color: #111827;">${r.pgId?.name || 'PG Share'}</div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                      Status: PAID ${r.paidDate ? `on ${new Date(r.paidDate).toLocaleDateString('en-IN')} via ${r.paymentMode?.toUpperCase() || ''}` : ''}
                    </div>
                  </td>
                  <td class="text-right font-bold">₹${Number(r.salaryAmount || 0).toLocaleString('en-IN')}</td>
                  <td class="text-right font-bold" style="color: ${r.reimbursedExpenses > 0 ? '#10b981' : '#4b5563'};">₹${Number(r.reimbursedExpenses || 0).toLocaleString('en-IN')}</td>
                  <td class="text-right font-bold">₹${Number(r.totalAmount || 0).toLocaleString('en-IN')}</td>
                </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td>Subtotal Salary</td>
                <td class="text-right">₹${Number(totalSalary).toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td>Subtotal Expenses</td>
                <td class="text-right">₹${Number(totalExpenses).toLocaleString('en-IN')}</td>
              </tr>
              <tr class="total-row">
                <td>Net Combined Payout</td>
                <td class="text-right">₹${Number(totalNet).toLocaleString('en-IN')}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p>This is a computer-generated document and does not require a physical signature.</p>
            <p>© ${new Date().getFullYear()} StaySync. All rights reserved.</p>
          </div>
        </div>
        ${action === 'view' ? '' : `
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
        `}
      </body>
    </html>
  `;

  if (action === 'view') {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

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

  // Employees see Expenses and Salary Payouts, but not Staff List
  const tabs = TABS.filter(tab => !isEmployee || tab.id !== 'staff');
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
  const [editPayrollModal, setEditPayrollModal] = useState(null);

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
    enabled: !isEmployee,
  });
  const employees = empData?.employees || [];

  const { data: expData, isLoading: expLoading } = useQuery({
    queryKey: ['expenses', filterPgId, filterMonth],
    queryFn: async () => (
      await getExpensesApi({
        pgId: filterPgId || undefined,
        month: filterMonth || undefined,
        limit: 100,
      })
    ).data?.data,
  });
  const expenses = expData?.expenses || [];

  const { data: payData, isLoading: payLoading } = useQuery({
    queryKey: ['payrolls', filterPgId, filterMonth],
    queryFn: async () => (await getPayrollsApi({ pgId: filterPgId || undefined, month: filterMonth, limit: 100 })).data?.data,
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
    onSuccess: (data, variables) => {
      toast.success('Payroll generated!');
      if (variables?.month) {
        setFilterMonth(variables.month);
      }
      invalidate();
      setPayrollModal(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const markPayPaidMut = useMutation({
    mutationFn: ({ id, data }) => markPayrollPaidApi(id, data),
    onSuccess: () => { toast.success('Payroll marked as paid!'); invalidate(); setMarkPaidModal(null); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updatePayrollMut = useMutation({
    mutationFn: ({ id, data }) => updatePayrollApi(id, data),
    onSuccess: () => { toast.success('Payroll record updated!'); invalidate(); setEditPayrollModal(null); },
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
      {((!isEmployee && pgOptions.length > 0) || (isEmployee && assignedPgOptions.length > 1) || activeTab === 'payroll' || activeTab === 'expenses') && (
        <div className="flex flex-wrap gap-3 mb-6">
          {((!isEmployee && pgOptions.length > 0) || (isEmployee && assignedPgOptions.length > 1)) && (
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
          )}
          {(activeTab === 'payroll' || activeTab === 'expenses') && (
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

      {/* ── Tabs: employees see filtered tabs ── */}
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 dark:bg-[#242740] rounded-xl w-fit">
        {tabs.map(tab => (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-[fadeIn_0.3s_ease]">
              {employees.map(emp => (
                <Card key={emp._id} className="flex flex-col min-h-[380px] justify-between">
                  <div className="flex flex-col gap-3.5 flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <img
                          src={emp.userId?.picture || 'https://i.imgur.com/CR1iy7U.png'}
                          alt={emp.userId?.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-[#6c63ff]/20 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-sm dark:text-[#f0f0f8] text-gray-900 truncate" title={emp.userId?.name}>
                            {emp.userId?.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <Badge variant={emp.userId?.role === 'manager' ? 'manager' : 'default'} className="text-[9px] px-1.5 py-0 uppercase">
                              {emp.userId?.role}
                            </Badge>
                            {emp.designation && (
                              <Badge variant="accent" className="text-[9px] px-1.5 py-0 capitalize">
                                {emp.designation}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 dark:text-[#6b6e82] mt-1 flex flex-col gap-0.5">
                            <span className="font-semibold">{emp.userId?.mobNo1 || '—'}</span>
                            <span className="truncate max-w-[140px]" title={emp.userId?.email}>{emp.userId?.email}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={statusVariants[emp.status]?.variant || 'default'} className="flex-shrink-0">
                        {statusVariants[emp.status]?.label || emp.status}
                      </Badge>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-gray-50 dark:bg-[#242740] rounded-xl">
                        <div className="text-gray-400 dark:text-[#6b6e82] text-[10px] font-bold uppercase tracking-wider">Monthly Salary</div>
                        <div className="font-black text-[#6c63ff] text-sm mt-0.5">{f(emp.monthlySalary)}</div>
                      </div>
                      <div className="p-2.5 bg-gray-50 dark:bg-[#242740] rounded-xl">
                        <div className="text-gray-400 dark:text-[#6b6e82] text-[10px] font-bold uppercase tracking-wider">Joined</div>
                        <div className="font-semibold dark:text-[#f0f0f8] text-gray-700 mt-0.5">{formatDate(emp.joinedDate)}</div>
                      </div>
                    </div>

                    {/* Assigned PGs Section */}
                    <div className="text-xs dark:text-[#6b6e82] text-gray-500 flex flex-col gap-1.5 mt-1 border-t dark:border-[#2d3052]/40 border-gray-100 pt-3 flex-1">
                      <div className="font-bold text-[10px] uppercase text-gray-400 dark:text-[#6b6e82] tracking-wider mb-1">
                        Assigned PGs & Salaries ({emp.pgIds?.length || 0})
                      </div>
                      
                      <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                        {emp.pgIds?.map(pg => {
                          const pgId = pg._id || pg;
                          const pgSalary = emp.pgSalaries?.[pgId] !== undefined
                            ? emp.pgSalaries[pgId]
                            : (emp.pgIds.length > 0 ? Math.round(emp.monthlySalary / emp.pgIds.length) : 0);
                          return (
                            <div 
                              key={pgId} 
                              className="flex justify-between items-center gap-3 bg-gray-50/50 dark:bg-[#242740]/40 p-2 rounded-xl border border-gray-100/30 dark:border-[#2d3052]/20 hover:border-[#6c63ff]/30 dark:hover:border-[#6c63ff]/20 transition-colors"
                              title={pg.name}
                            >
                              <span className="truncate font-semibold text-gray-700 dark:text-[#e0e0f0] flex-1">
                                {pg.name}
                              </span>
                              <span className="font-black text-[#6c63ff] text-xs flex-shrink-0">
                                {f(pgSalary)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Actions (pushed to bottom) */}
                  {(user?.role === 'owner' || (user?.role === 'manager' && emp.userId?.role === 'employee')) && (
                    <div className="flex gap-2 pt-3 border-t dark:border-[#2d3052] border-gray-200 mt-auto">
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
                  )}
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
      {/* TAB: PAYROLL                                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'payroll' && (() => {
        const displayPayrolls = !filterPgId ? (() => {
          const groups = {};
          payrolls.forEach(pay => {
            const empId = pay.employeeId?._id || pay.employeeId;
            if (!empId) return;
            if (!groups[empId]) {
              groups[empId] = {
                isGroup: true,
                employeeId: pay.employeeId,
                records: [],
                totalSalary: 0,
                totalExpenses: 0,
                totalAmount: 0,
              };
            }
            groups[empId].records.push(pay);
            groups[empId].totalSalary += pay.salaryAmount || 0;
            groups[empId].totalExpenses += pay.reimbursedExpenses || 0;
            groups[empId].totalAmount += pay.totalAmount || 0;
          });
          return Object.values(groups);
        })() : payrolls;

        return (
          <div className="flex flex-col gap-3">
            {payLoading ? <Spinner center /> : payrolls.length === 0 ? (
              <EmptyState
                icon={<Wallet size={48} />}
                title={isEmployee ? "No pay slips available" : "No payroll records for this month"}
                description={isEmployee ? "Your salary payouts will appear here once generated." : "Generate payroll for each staff member to track salary payments"}
                action={
                  !isEmployee && (
                    <Button onClick={() => setPayrollModal({ employeeId: '', month: filterMonth })}>
                      <Plus size={16} /> Generate Payroll
                    </Button>
                  )
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayPayrolls.map(pay => {
                  if (pay.isGroup) {
                    const emp = pay.employeeId;
                    const u = emp?.userId;
                    const allPaid = pay.records.every(r => r.status === 'paid');
                    const allPending = pay.records.every(r => r.status === 'pending');
                    return (
                      <Card key={pay.employeeId?._id || pay.employeeId} className="flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={u?.picture || 'https://i.imgur.com/CR1iy7U.png'}
                              alt={u?.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-[#6c63ff]/20"
                            />
                            <div>
                              <div className="font-bold text-sm dark:text-[#f0f0f8] text-gray-900">{u?.name}</div>
                              <div className="text-[10px] dark:text-[#6b6e82] text-gray-500 capitalize">{u?.role} · {pay.records.length} PGs Assigned</div>
                            </div>
                          </div>
                          <Badge variant={allPaid ? 'success' : allPending ? 'warning' : 'warning'}>
                            {allPaid ? 'All Paid' : allPending ? 'Pending Payout' : 'Partially Paid'}
                          </Badge>
                        </div>

                        {/* PG Breakdown List */}
                        <div className="flex flex-col gap-2 bg-gray-50 dark:bg-[#242740] rounded-xl p-3 border border-gray-100 dark:border-[#2d3052]/40">
                          <div className="text-[10px] font-bold text-gray-400 dark:text-[#6b6e82] uppercase tracking-wider mb-1">PG Breakdown</div>
                          {pay.records.map(rec => (
                            <div key={rec._id} className="flex items-center justify-between py-1.5 border-b border-gray-200/40 dark:border-[#2d3052]/30 last:border-0 flex-wrap gap-2">
                              <div className="min-w-[150px]">
                                <div className="text-xs font-semibold dark:text-[#e0e0f0] text-gray-800">{rec.pgId?.name}</div>
                                <div className="text-[10px] text-gray-400 dark:text-[#6b6e82]">
                                  Salary: {f(rec.salaryAmount)} · Expenses: {f(rec.reimbursedExpenses)}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={rec.status === 'paid' ? 'success' : 'warning'} className="text-[9px] px-1.5 py-0.5">
                                  {rec.status === 'paid' ? 'Paid' : 'Pending'}
                                </Badge>
                                {rec.status === 'pending' && (
                                  <div className="flex gap-1.5 items-center">
                                    {!isEmployee && (rec.employeeId?.userId?.role !== 'manager' || user?.role === 'owner') ? (
                                      <>
                                        <Button
                                          variant="success"
                                          size="xs"
                                          className="py-1 px-2.5 text-[10px]"
                                          onClick={() => setMarkPaidModal(rec)}
                                        >
                                          Pay
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="xs"
                                          className="py-1 px-2 text-[10px] flex items-center gap-1 border border-gray-200 dark:border-[#2d3052]"
                                          title="Edit Payroll"
                                          onClick={() => setEditPayrollModal(rec)}
                                        >
                                          <Edit3 size={11} /> Edit
                                        </Button>
                                      </>
                                    ) : (
                                      <span className="text-[10px] text-yellow-500 font-semibold">
                                        {isEmployee ? 'Awaiting Payout' : 'Owner Action Required'}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {rec.status === 'paid' && (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      className="p-1"
                                      title="View Pay Slip"
                                      onClick={() => handlePaySlipAction(rec, 'view')}
                                    >
                                      <Eye size={12} className="text-[#6c63ff]" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      className="p-1"
                                      title="Download Pay Slip"
                                      onClick={() => handlePaySlipAction(rec, 'download')}
                                    >
                                      <Download size={12} className="text-[#6c63ff]" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Totals Summary */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="p-2 bg-gray-50 dark:bg-[#242740] rounded-lg text-center">
                            <div className="text-gray-400 dark:text-[#6b6e82]">Salary</div>
                            <div className="font-black text-[#6c63ff]">{f(pay.totalSalary)}</div>
                          </div>
                          <div className="p-2 bg-gray-50 dark:bg-[#242740] rounded-lg text-center">
                            <div className="text-gray-400 dark:text-[#6b6e82]">Expenses</div>
                            <div className="font-black text-[#00d4aa]">{f(pay.totalExpenses)}</div>
                          </div>
                          <div className="p-2 bg-[#6c63ff]/10 dark:bg-[#6c63ff]/15 rounded-lg text-center border border-[#6c63ff]/20">
                            <div className="text-[#6c63ff]">Total</div>
                            <div className="font-black text-[#6c63ff]">{f(pay.totalAmount)}</div>
                          </div>
                        </div>

                        {/* Combined Action Button */}
                        {allPaid && (
                          <div className="flex gap-2 mt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 flex items-center justify-center gap-1.5 border border-dashed border-gray-200 dark:border-[#2d3052] hover:bg-gray-50 dark:hover:bg-[#242740] text-xs"
                              title="View Combined Pay Slip"
                              onClick={() => handlePaySlipAction(pay, 'view')}
                            >
                              <Eye size={14} /> View Combined Pay Slip
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 flex items-center justify-center gap-1.5 border border-dashed border-gray-200 dark:border-[#2d3052] hover:bg-gray-50 dark:hover:bg-[#242740] text-xs"
                              title="Download Combined Pay Slip"
                              onClick={() => handlePaySlipAction(pay, 'download')}
                            >
                              <Download size={14} /> Download Combined Pay Slip
                            </Button>
                          </div>
                        )}
                      </Card>
                    );
                  } else {
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
                          <>
                            <div className="text-[11px] dark:text-[#6b6e82] text-gray-500 flex items-center gap-2">
                              <CheckCircle2 size={12} className="text-[#51cf66]" />
                              Paid on {formatDate(pay.paidDate)}
                              {pay.paymentMode && <span>· <PaymentModeSVG mode={pay.paymentMode} /></span>}
                              {pay.referenceNo && <span>· #{pay.referenceNo}</span>}
                            </div>
                            <div className="flex gap-2 mt-1 w-full">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1 flex items-center justify-center gap-1.5 border border-dashed border-gray-200 dark:border-[#2d3052] hover:bg-gray-50 dark:hover:bg-[#242740] text-xs"
                                title="View Pay Slip"
                                onClick={() => handlePaySlipAction(pay, 'view')}
                              >
                                <Eye size={14} /> View Pay Slip
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1 flex items-center justify-center gap-1.5 border border-dashed border-gray-200 dark:border-[#2d3052] hover:bg-gray-50 dark:hover:bg-[#242740] text-xs"
                                title="Download Pay Slip"
                                onClick={() => handlePaySlipAction(pay, 'download')}
                              >
                                <Download size={14} /> Download Pay Slip
                              </Button>
                            </div>
                          </>
                        )}

                        {pay.status === 'pending' && (
                          <div className="flex gap-2 w-full">
                            {!isEmployee && (pay.employeeId?.userId?.role !== 'manager' || user?.role === 'owner') ? (
                              <>
                                <Button
                                  variant="success"
                                  className="flex-1 flex items-center justify-center gap-1.5"
                                  onClick={() => setMarkPaidModal(pay)}
                                >
                                  <CheckCircle2 size={15} /> Mark Paid
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 dark:border-[#2d3052]"
                                  title="Edit Payroll"
                                  onClick={() => setEditPayrollModal(pay)}
                                >
                                  <Edit3 size={14} /> Edit
                                </Button>
                              </>
                            ) : (
                              <div className="w-full text-center py-2 px-3 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-500 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5">
                                <Clock size={14} /> {isEmployee ? 'Awaiting Payout' : 'Owner Action Required'}
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  }
                })}
              </div>
            )}
          </div>
        );
      })()}

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
          pgOptions={pgOptions}
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

      {/* Edit Payroll Modal */}
      {editPayrollModal && (
        <EditPayrollModal
          isOpen={!!editPayrollModal}
          payroll={editPayrollModal}
          onClose={() => setEditPayrollModal(null)}
          onSubmit={(data) => updatePayrollMut.mutate({ id: editPayrollModal._id, data })}
          loading={updatePayrollMut.isPending}
        />
      )}
    </div>
  );
}

// ── Modal: Add Staff ────────────────────────────────────────────────────────────
function AddStaffModal({ isOpen, onClose, pgOptions, onSubmit, loading }) {
  const [form, setForm] = useState({ pgIds: [], joinedDate: '', notes: '', designation: 'other' });
  const [pgSalaries, setPgSalaries] = useState({});
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Reset form to clean values when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({ pgIds: [], joinedDate: '', notes: '', designation: 'other' });
      setPgSalaries({});
      setUserSearch('');
      setSelectedUser(null);
      setShowDropdown(false);
    }
  }, [isOpen]);

  // Debounce the raw input — API fires only after 400ms of no typing
  const debouncedSearch = useDebounce(userSearch, 400);

  const { user: currentUser } = useAuth();

  const { data: usersData, isFetching: isSearching } = useQuery({
    queryKey: ['staff-users', debouncedSearch],
    queryFn: async () => (await searchStaffUsersApi({ search: debouncedSearch, limit: 10 })).data?.data,
    enabled: debouncedSearch.trim().length >= 2,
  });
  const rawUserList = usersData?.users || [];
  const userList = rawUserList.filter(u => {
    if (currentUser?.role === 'manager' && u.role === 'manager') return false;
    return true;
  });


  const handleSubmit = () => {
    if (!selectedUser) return toast.error('Please select a user');
    if (!form.pgIds || form.pgIds.length === 0) return toast.error('Please select at least one PG');
    if (!form.joinedDate) return toast.error('Please set joining date');
    
    const totalSalary = Object.values(pgSalaries).reduce((s, v) => s + (Number(v) || 0), 0);
    if (totalSalary <= 0) return toast.error('Total monthly salary must be greater than 0');
    if (Object.values(pgSalaries).some(v => v === '' || Number(v) < 0)) {
      return toast.error('Please enter a valid salary for each assigned PG');
    }

    onSubmit({
      userId: selectedUser._id,
      ...form,
      monthlySalary: totalSalary,
      pgSalaries,
    });
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
                    onClick={() => {
                      setSelectedUser(u);
                      setShowDropdown(false);
                      setUserSearch('');
                      setForm(f => ({ ...f, designation: u.role === 'manager' ? 'manager' : 'caretaker' }));
                    }}
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

        {selectedUser && (
          <div>
            <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-1.5">Designation</label>
            <SelectDropdown
              value={form.designation}
              onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
              options={
                selectedUser.role === 'manager'
                  ? [{ value: 'manager', label: 'Manager' }]
                  : [
                      { value: 'caretaker', label: 'Caretaker' },
                      { value: 'cook', label: 'Cook' },
                      { value: 'cleaner', label: 'Cleaner' },
                      { value: 'security', label: 'Security Guard' },
                      { value: 'warden', label: 'Warden' },
                      { value: 'maintenance', label: 'Maintenance Staff' },
                      { value: 'other', label: 'Other' },
                    ]
              }
            />
          </div>
        )}

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
                      const pgIds = checked ? [...f.pgIds, pg.value] : f.pgIds.filter(id => id !== pg.value);
                      setPgSalaries(prev => {
                        const updated = { ...prev };
                        if (checked) {
                          updated[pg.value] = prev[pg.value] !== undefined ? prev[pg.value] : '';
                        } else {
                          delete updated[pg.value];
                        }
                        return updated;
                      });
                      return { ...f, pgIds };
                    });
                  }}
                  className="rounded border-gray-300 dark:border-[#2d3052] text-[#6c63ff] focus:ring-[#6c63ff] bg-white dark:bg-[#1a1d2e]"
                />
                <span>{pg.label}</span>
              </label>
            ))}
          </div>
        </div>

        {form.pgIds.length > 0 && (
          <div className="p-3 bg-gray-50 dark:bg-[#242740] rounded-xl border border-gray-100 dark:border-[#2d3052]/40 flex flex-col gap-3">
            <div className="text-xs font-bold text-gray-400 dark:text-[#6b6e82] uppercase tracking-wide">
              Salary per PG
            </div>
            <div className="flex flex-col gap-2">
              {form.pgIds.map(pgId => {
                const pg = pgOptions.find(p => p.value === pgId);
                const name = pg?.label || 'PG';
                return (
                  <div key={pgId} className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold dark:text-[#a0a3b1] text-gray-700 truncate max-w-[180px]" title={name}>
                      {name}
                    </span>
                    <div className="w-28 flex-shrink-0">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Amount"
                        value={pgSalaries[pgId] !== undefined ? pgSalaries[pgId] : ''}
                        onChange={e => {
                          const val = e.target.value;
                          setPgSalaries(prev => ({
                            ...prev,
                            [pgId]: val === '' ? '' : Number(val),
                          }));
                        }}
                        className="py-1 px-2 text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-[#6c63ff] font-semibold pt-1 border-t border-gray-200/50 dark:border-[#2d3052]/30 flex justify-between">
              <span>Total Monthly Salary:</span>
              <span>{f(Object.values(pgSalaries).reduce((s, v) => s + (Number(v) || 0), 0))}</span>
            </div>
          </div>
        )}

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
    status: employee.status || 'active',
    notes: employee.notes || '',
    joinedDate: employee.joinedDate ? employee.joinedDate.slice(0, 10) : '',
    pgIds: employee.pgIds?.map(p => p._id || p) || [],
    designation: employee.designation || 'other',
  });

  const [pgSalaries, setPgSalaries] = useState(() => {
    const initial = {};
    const ids = employee.pgIds?.map(p => p._id || p) || [];
    ids.forEach(pgId => {
      if (employee.pgSalaries && employee.pgSalaries[pgId] !== undefined) {
        initial[pgId] = employee.pgSalaries[pgId];
      } else {
        // Fallback to average salary per PG
        initial[pgId] = ids.length > 0 ? Math.round((employee.monthlySalary || 0) / ids.length) : '';
      }
    });
    return initial;
  });

  const handleSubmit = () => {
    if (!form.pgIds || form.pgIds.length === 0) return toast.error('Please select at least one PG');
    
    const totalSalary = Object.values(pgSalaries).reduce((s, v) => s + (Number(v) || 0), 0);
    if (totalSalary <= 0) return toast.error('Total monthly salary must be greater than 0');
    if (Object.values(pgSalaries).some(v => v === '' || Number(v) < 0)) {
      return toast.error('Please enter a valid salary for each assigned PG');
    }

    onSubmit({
      monthlySalary: totalSalary,
      status: form.status,
      notes: form.notes,
      joinedDate: form.joinedDate || undefined,
      pgIds: form.pgIds,
      pgSalaries,
      designation: form.designation,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit — ${employee.userId?.name}`}>
      <div className="flex flex-col gap-4 mt-1">
        <div>
          <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-1.5">Status</label>
          <SelectDropdown
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
          />
        </div>

        <div>
          <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-1.5">Designation</label>
          <SelectDropdown
            value={form.designation}
            onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
            options={
              employee.userId?.role === 'manager'
                ? [{ value: 'manager', label: 'Manager' }]
                : [
                    { value: 'caretaker', label: 'Caretaker' },
                    { value: 'cook', label: 'Cook' },
                    { value: 'cleaner', label: 'Cleaner' },
                    { value: 'security', label: 'Security Guard' },
                    { value: 'warden', label: 'Warden' },
                    { value: 'maintenance', label: 'Maintenance Staff' },
                    { value: 'other', label: 'Other' },
                  ]
            }
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
                      const pgIds = checked ? [...f.pgIds, pg.value] : f.pgIds.filter(id => id !== pg.value);
                      setPgSalaries(prev => {
                        const updated = { ...prev };
                        if (checked) {
                          updated[pg.value] = prev[pg.value] !== undefined ? prev[pg.value] : '';
                        } else {
                          delete updated[pg.value];
                        }
                        return updated;
                      });
                      return { ...f, pgIds };
                    });
                  }}
                  className="rounded border-gray-300 dark:border-[#2d3052] text-[#6c63ff] focus:ring-[#6c63ff] bg-white dark:bg-[#1a1d2e]"
                />
                <span>{pg.label}</span>
              </label>
            ))}
          </div>
        </div>

        {form.pgIds.length > 0 && (
          <div className="p-3 bg-gray-50 dark:bg-[#242740] rounded-xl border border-gray-100 dark:border-[#2d3052]/40 flex flex-col gap-3">
            <div className="text-xs font-bold text-gray-400 dark:text-[#6b6e82] uppercase tracking-wide">
              Salary per PG
            </div>
            <div className="flex flex-col gap-2">
              {form.pgIds.map(pgId => {
                const pg = pgOptions.find(p => p.value === pgId);
                const name = pg?.label || 'PG';
                return (
                  <div key={pgId} className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold dark:text-[#a0a3b1] text-gray-700 truncate max-w-[180px]" title={name}>
                      {name}
                    </span>
                    <div className="w-28 flex-shrink-0">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Amount"
                        value={pgSalaries[pgId] !== undefined ? pgSalaries[pgId] : ''}
                        onChange={e => {
                          const val = e.target.value;
                          setPgSalaries(prev => ({
                            ...prev,
                            [pgId]: val === '' ? '' : Number(val),
                          }));
                        }}
                        className="py-1 px-2 text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-[#6c63ff] font-semibold pt-1 border-t border-gray-200/50 dark:border-[#2d3052]/30 flex justify-between">
              <span>Total Monthly Salary:</span>
              <span>{f(Object.values(pgSalaries).reduce((s, v) => s + (Number(v) || 0), 0))}</span>
            </div>
          </div>
        )}

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
  );}

// ── Modal: Add Expense ──────────────────────────────────────────────────────────
function AddExpenseModal({ isOpen, onClose, pgOptions, employees, currentUser, defaultPgId, onSubmit, loading }) {
  const isEmployee = currentUser?.role === 'employee';
  const isStaff = currentUser?.role === 'owner' || currentUser?.role === 'manager';

  const getLocalDateString = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [form, setForm] = useState({
    pgId: defaultPgId || '', amount: '', description: '', category: 'General',
    spentDate: getLocalDateString(), spentBy: '', reimbursementType: '',
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
        spentDate: getLocalDateString(),
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
function GeneratePayrollModal({ isOpen, employees, pgOptions, defaultMonth, onClose, onSubmit, loading }) {
  const [selectedPgId, setSelectedPgId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(defaultMonth);
  const [customSalaries, setCustomSalaries] = useState({});

  // Filter employees based on selected PG
  const filteredEmployees = selectedPgId
    ? employees.filter(e => e.pgIds?.some(p => String(p._id || p) === String(selectedPgId)))
    : employees;

  const empOptions = filteredEmployees
    .filter(e => e.status === 'active')
    .map(e => ({ value: e._id, label: `${e.userId?.name} (${e.userId?.role}) — ${f(e.monthlySalary)}/mo` }));

  const selectedEmp = employees.find(e => e._id === employeeId);
  const assignedPgs = selectedEmp?.pgIds || [];

  // Reset custom salaries when employee selection changes
  useEffect(() => {
    if (selectedEmp) {
      const pgs = selectedEmp.pgIds || [];
      const pgCount = pgs.length;
      const splitVal = pgCount > 0 ? Math.round(selectedEmp.monthlySalary / pgCount) : 0;
      const initial = {};
      pgs.forEach(pg => {
        const id = pg._id || pg;
        initial[id] = splitVal;
      });
      setCustomSalaries(initial);
    } else {
      setCustomSalaries({});
    }
  }, [employeeId, selectedEmp]);

  const handleSalaryChange = (pgId, val) => {
    setCustomSalaries(prev => ({
      ...prev,
      [pgId]: val === '' ? '' : Number(val),
    }));
  };

  const handlePgChange = (e) => {
    setSelectedPgId(e.target.value);
    setEmployeeId('');
  };

  const totalAllocated = Object.values(customSalaries).reduce((sum, val) => sum + (Number(val) || 0), 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Payroll Record">
      <div className="flex flex-col gap-4 mt-1">
        <div className="p-3 bg-[#6c63ff]/10 text-[#6c63ff] border border-[#6c63ff]/20 rounded-lg text-xs font-semibold">
          This creates a payroll entry for the selected month. Approved "Add to Salary" expenses for that month are automatically included.
        </div>

        <div>
          <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] block mb-1.5">
            Filter by PG (optional)
          </label>
          <SelectDropdown
            value={selectedPgId}
            onChange={handlePgChange}
            options={[{ value: '', label: 'All PGs / No filter' }, ...pgOptions]}
          />
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

        {selectedEmp && assignedPgs.length > 1 && (
          <div className="p-3.5 bg-gray-50 dark:bg-[#242740] rounded-xl border border-gray-100 dark:border-[#2d3052]/40 flex flex-col gap-3">
            <div className="text-xs font-bold text-gray-400 dark:text-[#6b6e82] uppercase tracking-wide">
              Salary Allocation per PG
            </div>
            <div className="text-[11px] text-[#6c63ff] font-semibold">
              Expected Total: {f(selectedEmp.monthlySalary)} · Allocated: {f(totalAllocated)}
            </div>
            <div className="flex flex-col gap-2">
              {assignedPgs.map(pg => {
                const id = pg._id || pg;
                const name = pg.name || 'PG';
                return (
                  <div key={id} className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold dark:text-[#a0a3b1] text-gray-700 truncate max-w-[180px]" title={name}>
                      {name}
                    </span>
                    <div className="w-28 flex-shrink-0">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Amount"
                        value={customSalaries[id] !== undefined ? customSalaries[id] : ''}
                        onChange={e => handleSalaryChange(id, e.target.value)}
                        className="py-1 px-2 text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
              if (Object.values(customSalaries).some(v => Number(v) < 0)) {
                return toast.error('Salary allocation cannot be negative');
              }
              onSubmit({ employeeId, month, customSalaries });
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

// ── Modal: Edit Payroll ──────────────────────────────────────────────────────────
function EditPayrollModal({ isOpen, payroll, onClose, onSubmit, loading }) {
  const [salaryAmount, setSalaryAmount] = useState(payroll.salaryAmount || 0);
  const [reimbursedExpenses, setReimbursedExpenses] = useState(payroll.reimbursedExpenses || 0);

  useEffect(() => {
    if (payroll) {
      setSalaryAmount(payroll.salaryAmount || 0);
      setReimbursedExpenses(payroll.reimbursedExpenses || 0);
    }
  }, [payroll]);

  const emp = payroll.employeeId;
  const u = emp?.userId;

  const total = Number(salaryAmount || 0) + Number(reimbursedExpenses || 0);

  const handleSubmit = () => {
    if (salaryAmount === '' || Number(salaryAmount) < 0) return toast.error('Salary amount cannot be negative');
    if (reimbursedExpenses === '' || Number(reimbursedExpenses) < 0) return toast.error('Reimbursed expenses cannot be negative');
    onSubmit({
      salaryAmount: Number(salaryAmount),
      reimbursedExpenses: Number(reimbursedExpenses),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Salary Payout">
      <div className="flex flex-col gap-4 mt-1">
        <div className="p-3 bg-gray-50 dark:bg-[#242740] rounded-xl border border-gray-100 dark:border-[#2d3052]/40">
          <div className="text-sm font-bold dark:text-[#f0f0f8] text-gray-900">{u?.name}</div>
          <div className="text-xs text-gray-500 dark:text-[#6b6e82] mt-0.5 capitalize">{u?.role} · {payroll.pgId?.name}</div>
        </div>

        <Input
          label="Salary Amount (₹)"
          type="number"
          min="0"
          value={salaryAmount}
          onChange={e => setSalaryAmount(e.target.value === '' ? '' : Number(e.target.value))}
          required
        />

        <Input
          label="Reimbursed Expenses (₹)"
          type="number"
          min="0"
          value={reimbursedExpenses}
          onChange={e => setReimbursedExpenses(e.target.value === '' ? '' : Number(e.target.value))}
          required
        />

        <div className="p-3 bg-[#6c63ff]/10 border border-[#6c63ff]/20 rounded-lg text-xs font-semibold flex justify-between">
          <span>Recalculated Total:</span>
          <span className="font-bold text-[#6c63ff]">{f(total)}</span>
        </div>

        <div className="flex gap-3 pt-2 border-t dark:border-[#2d3052] border-gray-200">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={loading} onClick={handleSubmit}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
