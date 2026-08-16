import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Logo } from '@/components/Logo';
import type {
  Admin, Event, Category, Contestant, VotePackage,
  Transaction, VoteBatch, AuditLog, RegistrationCode, DashboardStats,
} from '@/lib/types';
import {
  formatGHS, formatNumber, formatDate, formatDateTime, timeAgo,
  PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
  downloadFile, toCSV,
} from '@/lib/utils';
import {
  LayoutDashboard, Calendar, Tag, Users, Package, Receipt,
  Layers, ShieldCheck, ScrollText, UserCog, LogOut, Menu, X,
  TrendingUp, Vote as VoteIcon, DollarSign, CheckCircle2, AlertCircle,
  Plus, Pencil, Trash2, Download, Copy, RefreshCw, Eye, EyeOff,
  Search, Loader2, ArrowLeft, Sparkles, KeyRound, Ban, RotateCcw,
} from 'lucide-react';

type Tab =
  | 'overview' | 'events' | 'categories' | 'contestants' | 'packages'
  | 'transactions' | 'batches' | 'reconciliation' | 'audit' | 'admins';

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'contestants', label: 'Contestants', icon: Users },
  { id: 'packages', label: 'Vote Packages', icon: Package },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'batches', label: 'Vote Batches', icon: Layers },
  { id: 'reconciliation', label: 'Reconciliation', icon: ShieldCheck },
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
  { id: 'admins', label: 'Admins', icon: UserCog },
];

interface AdminShellProps {
  admin: Admin;
  onLogout: () => void;
}

export function AdminShell({ admin, onLogout }: AdminShellProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');

  const loadEvents = useCallback(async () => {
    const { data } = await supabase.from('events').select('*').order('created_at');
    if (data) setEvents(data);
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || null;
  const logAction = useCallback(
    (action: string, entityType?: string, entityId?: string, details?: Record<string, unknown>) => {
      supabase.rpc('log_audit_action', {
        p_action: action,
        p_entity_type: entityType ?? null,
        p_entity_id: entityId ?? null,
        p_details: details ?? null,
      }).then(() => {});
    },
    [],
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-gray-300 flex flex-col transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-gray-800">
          <Logo />
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gold-500 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center text-xs font-bold text-gold-400">
              {admin.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{admin.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{admin.email}</p>
            </div>
          </div>
          <a
            href="/"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Site
          </a>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <h1 className="font-display text-lg font-bold text-gray-900 capitalize">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h1>
          </div>

          {/* Event filter */}
          {activeTab !== 'overview' && activeTab !== 'admins' && activeTab !== 'audit' && events.length > 0 && (
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none"
            >
              <option value="all">All Events</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          )}
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6 max-w-7xl mx-auto">
          {activeTab === 'overview' && <OverviewTab admin={admin} events={events} />}
          {activeTab === 'events' && <EventsTab events={events} onReload={loadEvents} logAction={logAction} />}
          {activeTab === 'categories' && <CategoriesTab events={events} selectedEventId={selectedEventId} logAction={logAction} />}
          {activeTab === 'contestants' && <ContestantsTab events={events} selectedEventId={selectedEventId} logAction={logAction} />}
          {activeTab === 'packages' && <PackagesTab events={events} selectedEventId={selectedEventId} logAction={logAction} />}
          {activeTab === 'transactions' && <TransactionsTab selectedEventId={selectedEventId} logAction={logAction} />}
          {activeTab === 'batches' && <BatchesTab selectedEventId={selectedEventId} />}
          {activeTab === 'reconciliation' && <ReconciliationTab selectedEventId={selectedEventId} logAction={logAction} />}
          {activeTab === 'audit' && <AuditTab />}
          {activeTab === 'admins' && <AdminsTab admin={admin} />}
        </main>
      </div>
    </div>
  );
}

// === Shared UI helpers ===

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string; icon: typeof TrendingUp; color: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-display text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function Badge({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {text}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p>{message}</p>
    </div>
  );
}

function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left font-semibold text-gray-700 px-4 py-3 border-b border-gray-100 whitespace-nowrap ${className ?? ''}`}>{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 border-b border-gray-50 ${className ?? ''}`}>{children}</td>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none transition-all';

function ExportButtons({ data, filename }: { data: Record<string, unknown>[]; filename: string }) {
  const exportCSV = () => {
    downloadFile(toCSV(data), `${filename}.csv`, 'text/csv');
  };
  const exportExcel = () => {
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const rows = data.map((r) => headers.map((h) => r[h]).join('\t'));
    downloadFile([headers.join('\t'), ...rows].join('\n'), `${filename}.xls`, 'application/vnd.ms-excel');
  };
  const exportPDF = () => {
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const html = `<html><head><title>${filename}</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f4f4f4}</style></head><body><h2>${filename}</h2><table><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>${data.map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };
  const exportWord = () => {
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'></head><body><h2>${filename}</h2><table border='1'><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>${data.map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
    downloadFile(html, `${filename}.doc`, 'application/msword');
  };
  return (
    <div className="flex items-center gap-2">
      <button onClick={exportCSV} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"><Download className="h-3.5 w-3.5" />CSV</button>
      <button onClick={exportExcel} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"><Download className="h-3.5 w-3.5" />Excel</button>
      <button onClick={exportPDF} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"><Download className="h-3.5 w-3.5" />PDF</button>
      <button onClick={exportWord} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"><Download className="h-3.5 w-3.5" />Word</button>
    </div>
  );
}

// === Overview Tab ===
function OverviewTab({ admin, events }: { admin: Admin; events: Event[] }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc('get_dashboard_stats', { p_event_id: null }).then(({ data }) => {
      if (data) setStats(data as DashboardStats);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-gray-400 animate-spin" /></div>;
  if (!stats) return <EmptyState message="No stats available." />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="Total Events" value={formatNumber(stats.total_events)} icon={Calendar} color="bg-blue-100 text-blue-600" />
        <StatCard label="Contestants" value={formatNumber(stats.total_contestants)} icon={Users} color="bg-purple-100 text-purple-600" />
        <StatCard label="Total Votes" value={formatNumber(stats.total_votes)} icon={VoteIcon} color="bg-gold-100 text-gold-600" />
        <StatCard label="Revenue" value={formatGHS(stats.total_revenue)} icon={DollarSign} color="bg-forest-100 text-forest-600" />
        <StatCard label="Transactions" value={formatNumber(stats.total_transactions)} icon={Receipt} color="bg-gray-100 text-gray-600" sub={`${stats.confirmed_transactions} confirmed`} />
        <StatCard label="Pending" value={formatNumber(stats.pending_transactions)} icon={AlertCircle} color="bg-amber-100 text-amber-600" />
        <StatCard label="Reconciled" value={formatNumber(stats.reconciled_transactions)} icon={CheckCircle2} color="bg-emerald-100 text-emerald-600" />
        <StatCard label="Admins" value={formatNumber(stats.total_admins)} icon={UserCog} color="bg-red-100 text-red-600" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-display font-bold text-gray-900 mb-4">Events Overview</h3>
        <div className="space-y-3">
          {events.map((ev) => (
            <div key={ev.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{ev.name}</p>
                <p className="text-xs text-gray-500">{ev.venue}, {ev.city} · {formatDate(ev.start_date)}</p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatNumber(ev.total_votes)}</p>
                  <p className="text-xs text-gray-400">votes</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-forest-600">{formatGHS(ev.total_revenue)}</p>
                  <p className="text-xs text-gray-400">revenue</p>
                </div>
                <Badge text={ev.status} className={ev.status === 'active' ? 'bg-forest-100 text-forest-700 border-forest-200' : 'bg-gray-100 text-gray-600 border-gray-200'} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-display font-bold text-gray-900 mb-2">Welcome, {admin.full_name}</h3>
        <p className="text-sm text-gray-500">
          You are signed in as <span className="font-medium text-gray-700">{admin.role}</span>. Use the sidebar to manage events,
          contestants, vote packages, transactions, and reconciliation.
        </p>
      </div>
    </div>
  );
}

// === Events Tab ===
function EventsTab({ events, onReload, logAction }: { events: Event[]; onReload: () => void; logAction: (a: string, et?: string, ei?: string, d?: Record<string, unknown>) => void }) {
  const [editing, setEditing] = useState<Event | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete event "${name}"? This will also delete all related data.`)) return;
    await supabase.from('events').delete().eq('id', id);
    logAction('delete_event', 'event', id, { name });
    onReload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{events.length} events</p>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Event
        </button>
      </div>

      <TableShell>
        <thead>
          <tr>
            <Th>Name</Th><Th>City</Th><Th>Status</Th><Th>Votes</Th><Th>Revenue</Th><Th>Dates</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.id} className="hover:bg-gray-50">
              <Td><div><p className="font-medium text-gray-900">{ev.name}</p>{ev.is_sandbox && <span className="text-xs text-amber-600">Sandbox</span>}</div></Td>
              <Td>{ev.city}</Td>
              <Td><Badge text={ev.status} className={ev.status === 'active' ? 'bg-forest-100 text-forest-700 border-forest-200' : 'bg-gray-100 text-gray-600 border-gray-200'} /></Td>
              <Td>{formatNumber(ev.total_votes)}</Td>
              <Td className="font-medium text-forest-600">{formatGHS(ev.total_revenue)}</Td>
              <Td className="text-gray-500 text-xs whitespace-nowrap">{formatDate(ev.start_date)} — {formatDate(ev.end_date)}</Td>
              <Td>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditing(ev); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil className="h-4 w-4 text-gray-500" /></button>
                  <button onClick={() => handleDelete(ev.id, ev.name)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="h-4 w-4 text-red-500" /></button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      {events.length > 0 && <ExportButtons data={events as unknown as Record<string, unknown>[]} filename="events" />}

      {showForm && (
        <EventForm
          event={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); onReload(); }}
          logAction={logAction}
        />
      )}
    </div>
  );
}

function EventForm({ event, onClose, onSaved, logAction }: { event: Event | null; onClose: () => void; onSaved: () => void; logAction: (a: string, et?: string, ei?: string, d?: Record<string, unknown>) => void }) {
  const [name, setName] = useState(event?.name ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [venue, setVenue] = useState(event?.venue ?? '');
  const [city, setCity] = useState(event?.city ?? '');
  const [status, setStatus] = useState<Event['status']>(event?.status ?? 'active');
  const [startDate, setStartDate] = useState(event?.start_date ?? '');
  const [endDate, setEndDate] = useState(event?.end_date ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const payload = {
      name, description, venue, city, status,
      start_date: startDate || null,
      end_date: endDate || null,
      slug,
      is_sandbox: true,
    };
    if (event) {
      await supabase.from('events').update(payload).eq('id', event.id);
      logAction('update_event', 'event', event.id, { name });
    } else {
      await supabase.from('events').insert(payload);
      logAction('create_event', 'event', undefined, { name });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal title={event ? 'Edit Event' : 'New Event'} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <FormField label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required /></FormField>
        <FormField label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Venue"><input value={venue} onChange={(e) => setVenue(e.target.value)} className={inputClass} /></FormField>
          <FormField label="City"><input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start Date"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} /></FormField>
          <FormField label="End Date"><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} /></FormField>
        </div>
        <FormField label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as Event['status'])} className={inputClass}>
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </FormField>
        <button type="submit" disabled={saving} className="w-full py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {event ? 'Update' : 'Create'}
        </button>
      </form>
    </Modal>
  );
}

// === Categories Tab ===
function CategoriesTab({ events, selectedEventId, logAction }: { events: Event[]; selectedEventId: string; logAction: (a: string, et?: string, ei?: string, d?: Record<string, unknown>) => void }) {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('categories').select('*, event:events(name)').order('name');
    if (selectedEventId !== 'all') q = q.eq('event_id', selectedEventId);
    const { data } = await q;
    setItems(data || []);
    setLoading(false);
  }, [selectedEventId]);

  useEffect(() => { load(); }, [load]);

  const openForm = (cat?: Category) => {
    setEditing(cat ?? null);
    setName(cat?.name ?? '');
    setDescription(cat?.description ?? '');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEventId === 'all' && !editing) { alert('Select an event first'); return; }
    const eventId = editing?.event_id ?? selectedEventId;
    if (editing) {
      await supabase.from('categories').update({ name, description }).eq('id', editing.id);
      logAction('update_category', 'category', editing.id, { name });
    } else {
      await supabase.from('categories').insert({ event_id: eventId, name, description });
      logAction('create_category', 'category', undefined, { name, event_id: eventId });
    }
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string, n: string) => {
    if (!confirm(`Delete category "${n}"?`)) return;
    await supabase.from('categories').delete().eq('id', id);
    logAction('delete_category', 'category', id, { name: n });
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-gray-400 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{items.length} categories</p>
        <button onClick={() => openForm()} disabled={selectedEventId === 'all'} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Category
        </button>
      </div>
      {items.length === 0 ? <EmptyState message="No categories yet." /> : (
        <TableShell>
          <thead><tr><Th>Name</Th><Th>Event</Th><Th>Description</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {items.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <Td className="font-medium text-gray-900">{cat.name}</Td>
                <Td className="text-gray-500 text-xs">{(cat as unknown as { event?: { name: string } }).event?.name ?? '—'}</Td>
                <Td className="text-gray-500 text-xs">{cat.description || '—'}</Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openForm(cat)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil className="h-4 w-4 text-gray-500" /></button>
                    <button onClick={() => handleDelete(cat.id, cat.name)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="h-4 w-4 text-red-500" /></button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
      {items.length > 0 && <ExportButtons data={items as unknown as Record<string, unknown>[]} filename="categories" />}
      {showForm && (
        <Modal title={editing ? 'Edit Category' : 'New Category'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <FormField label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required /></FormField>
            <FormField label="Description"><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} /></FormField>
            <button type="submit" className="w-full py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800">{editing ? 'Update' : 'Create'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// === Contestants Tab ===
function ContestantsTab({ events, selectedEventId, logAction }: { events: Event[]; selectedEventId: string; logAction: (a: string, et?: string, ei?: string, d?: Record<string, unknown>) => void }) {
  const [items, setItems] = useState<Contestant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contestant | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('contestants').select('*, category:categories(*)').order('vote_count', { ascending: false });
    if (selectedEventId !== 'all') q = q.eq('event_id', selectedEventId);
    const { data } = await q;
    setItems(data || []);
    if (selectedEventId !== 'all') {
      const { data: cats } = await supabase.from('categories').select('*').eq('event_id', selectedEventId).order('name');
      setCategories(cats || []);
    } else {
      setCategories([]);
    }
    setLoading(false);
  }, [selectedEventId]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-gray-400 animate-spin" /></div>;

  return (
    <ContestantsContent
      items={filtered} categories={categories} selectedEventId={selectedEventId}
      search={search} setSearch={setSearch} showForm={showForm} setShowForm={setShowForm}
      editing={editing} setEditing={setEditing} load={load} logAction={logAction}
    />
  );
}

function ContestantsContent({
  items, categories, selectedEventId, search, setSearch, showForm, setShowForm,
  editing, setEditing, load, logAction,
}: {
  items: Contestant[]; categories: Category[]; selectedEventId: string;
  search: string; setSearch: (v: string) => void; showForm: boolean; setShowForm: (v: boolean) => void;
  editing: Contestant | null; setEditing: (c: Contestant | null) => void; load: () => void;
  logAction: (a: string, et?: string, ei?: string, d?: Record<string, unknown>) => void;
}) {
  const handleDelete = async (id: string, n: string) => {
    if (!confirm(`Delete contestant "${n}"?`)) return;
    await supabase.from('contestants').delete().eq('id', id);
    logAction('delete_contestant', 'contestant', id, { name: n });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className={`${inputClass} pl-10 py-2`} />
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} disabled={selectedEventId === 'all'} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Contestant
        </button>
      </div>

      {items.length === 0 ? <EmptyState message="No contestants yet." /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden flex">
              <div className="w-20 h-20 flex-shrink-0 bg-gray-100">
                {c.photo_url ? <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-300">{c.name.charAt(0)}</div>}
              </div>
              <div className="flex-1 p-3 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.category?.name ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1 rounded-lg hover:bg-gray-100"><Pencil className="h-3.5 w-3.5 text-gray-500" /></button>
                    <button onClick={() => handleDelete(c.id, c.name)} className="p-1 rounded-lg hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                  </div>
                </div>
                <p className="text-sm font-bold text-gold-600 mt-1">{formatNumber(c.vote_count)} votes</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && <ExportButtons data={items as unknown as Record<string, unknown>[]} filename="contestants" />}

      {showForm && (
        <ContestantForm
          contestant={editing} categories={categories} eventId={selectedEventId}
          onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} logAction={logAction}
        />
      )}
    </div>
  );
}

function ContestantForm({
  contestant, categories, eventId, onClose, onSaved, logAction,
}: {
  contestant: Contestant | null; categories: Category[]; eventId: string;
  onClose: () => void; onSaved: () => void; logAction: (a: string, et?: string, ei?: string, d?: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState(contestant?.name ?? '');
  const [bio, setBio] = useState(contestant?.bio ?? '');
  const [photoUrl, setPhotoUrl] = useState(contestant?.photo_url ?? '');
  const [categoryId, setCategoryId] = useState(contestant?.category_id ?? categories[0]?.id ?? '');
  const [isActive, setIsActive] = useState(contestant?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const evId = contestant?.event_id ?? eventId;
    const payload = { name, bio, photo_url: photoUrl, category_id: categoryId, is_active: isActive, event_id: evId };
    if (contestant) {
      await supabase.from('contestants').update(payload).eq('id', contestant.id);
      logAction('update_contestant', 'contestant', contestant.id, { name });
    } else {
      await supabase.from('contestants').insert(payload);
      logAction('create_contestant', 'contestant', undefined, { name });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal title={contestant ? 'Edit Contestant' : 'New Contestant'} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <FormField label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required /></FormField>
        <FormField label="Bio"><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={inputClass} /></FormField>
        <FormField label="Photo URL"><input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" className={inputClass} /></FormField>
        <FormField label="Category">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass} required>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormField>
        <FormField label="Active">
          <label className="flex items-center gap-2"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" /> Show on public site</label>
        </FormField>
        <button type="submit" disabled={saving} className="w-full py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {contestant ? 'Update' : 'Create'}
        </button>
      </form>
    </Modal>
  );
}

// === Vote Packages Tab ===
function PackagesTab({ events, selectedEventId, logAction }: { events: Event[]; selectedEventId: string; logAction: (a: string, et?: string, ei?: string, d?: Record<string, unknown>) => void }) {
  const [items, setItems] = useState<VotePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VotePackage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('vote_packages').select('*, event:events(name)').order('price_ghs');
    if (selectedEventId !== 'all') q = q.eq('event_id', selectedEventId);
    const { data } = await q;
    setItems(data || []);
    setLoading(false);
  }, [selectedEventId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string, n: string) => {
    if (!confirm(`Delete package "${n}"?`)) return;
    await supabase.from('vote_packages').delete().eq('id', id);
    logAction('delete_package', 'vote_package', id, { name: n });
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-gray-400 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{items.length} packages</p>
        <button onClick={() => { setEditing(null); setShowForm(true); }} disabled={selectedEventId === 'all'} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Package
        </button>
      </div>
      {items.length === 0 ? <EmptyState message="No packages yet." /> : (
        <TableShell>
          <thead><tr><Th>Name</Th><Th>Votes</Th><Th>Bonus</Th><Th>Total</Th><Th>Price</Th><Th>Popular</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {items.map((pkg) => (
              <tr key={pkg.id} className="hover:bg-gray-50">
                <Td className="font-medium text-gray-900">{pkg.name}</Td>
                <Td>{pkg.votes}</Td>
                <Td>{pkg.bonus_votes > 0 ? `+${pkg.bonus_votes}` : '—'}</Td>
                <Td className="font-bold text-forest-600">{pkg.votes + pkg.bonus_votes}</Td>
                <Td className="font-medium">{formatGHS(pkg.price_ghs)}</Td>
                <Td>{pkg.is_popular ? <Badge text="Yes" className="bg-gold-100 text-gold-700 border-gold-200" /> : <Badge text="No" />}</Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditing(pkg); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil className="h-4 w-4 text-gray-500" /></button>
                    <button onClick={() => handleDelete(pkg.id, pkg.name)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="h-4 w-4 text-red-500" /></button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
      {items.length > 0 && <ExportButtons data={items as unknown as Record<string, unknown>[]} filename="vote_packages" />}
      {showForm && (
        <PackageForm pkg={editing} eventId={selectedEventId} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} logAction={logAction} />
      )}
    </div>
  );
}

function PackageForm({ pkg, eventId, onClose, onSaved, logAction }: { pkg: VotePackage | null; eventId: string; onClose: () => void; onSaved: () => void; logAction: (a: string, et?: string, ei?: string, d?: Record<string, unknown>) => void }) {
  const [name, setName] = useState(pkg?.name ?? '');
  const [votes, setVotes] = useState(pkg?.votes ?? 5);
  const [bonusVotes, setBonusVotes] = useState(pkg?.bonus_votes ?? 0);
  const [priceGhs, setPriceGhs] = useState(pkg?.price_ghs ?? 5);
  const [isPopular, setIsPopular] = useState(pkg?.is_popular ?? false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const evId = pkg?.event_id ?? eventId;
    const payload = { name, votes: Number(votes), bonus_votes: Number(bonusVotes), price_ghs: Number(priceGhs), is_popular: isPopular, event_id: evId };
    if (pkg) {
      await supabase.from('vote_packages').update(payload).eq('id', pkg.id);
      logAction('update_package', 'vote_package', pkg.id, { name });
    } else {
      await supabase.from('vote_packages').insert(payload);
      logAction('create_package', 'vote_package', undefined, { name });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal title={pkg ? 'Edit Package' : 'New Package'} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <FormField label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Votes"><input type="number" min={1} value={votes} onChange={(e) => setVotes(Number(e.target.value))} className={inputClass} required /></FormField>
          <FormField label="Bonus Votes"><input type="number" min={0} value={bonusVotes} onChange={(e) => setBonusVotes(Number(e.target.value))} className={inputClass} /></FormField>
        </div>
        <FormField label="Price (GHS)"><input type="number" min={0} step="0.01" value={priceGhs} onChange={(e) => setPriceGhs(Number(e.target.value))} className={inputClass} required /></FormField>
        <FormField label="Popular">
          <label className="flex items-center gap-2"><input type="checkbox" checked={isPopular} onChange={(e) => setIsPopular(e.target.checked)} className="rounded" /> Mark as "Most Popular" on site</label>
        </FormField>
        <button type="submit" disabled={saving} className="w-full py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {pkg ? 'Update' : 'Create'}
        </button>
      </form>
    </Modal>
  );
}

// === Transactions Tab ===
function TransactionsTab({ selectedEventId, logAction }: { selectedEventId: string; logAction: (a: string, et?: string, ei?: string, d?: Record<string, unknown>) => void }) {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('transactions').select('*, contestant:contestants(name), vote_package:vote_packages(name)').order('created_at', { ascending: false });
    if (selectedEventId !== 'all') q = q.eq('event_id', selectedEventId);
    const { data } = await q;
    setItems(data || []);
    setLoading(false);
  }, [selectedEventId]);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = async (id: string) => {
    const { error } = await supabase.rpc('confirm_transaction', { p_transaction_id: id });
    if (error) { alert(error.message); return; }
    load();
  };

  const handleReverse = async (id: string) => {
    if (!confirm('Reverse this transaction? Votes will be removed.')) return;
    const { error } = await supabase.rpc('reverse_transaction', { p_transaction_id: id });
    if (error) { alert(error.message); return; }
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-gray-400 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{items.length} transactions</p>
        {items.length > 0 && <ExportButtons data={items as unknown as Record<string, unknown>[]} filename="transactions" />}
      </div>
      {items.length === 0 ? <EmptyState message="No transactions yet." /> : (
        <TableShell>
          <thead><tr><Th>Voter</Th><Th>Phone</Th><Th>Contestant</Th><Th>Package</Th><Th>Method</Th><Th>Amount</Th><Th>Votes</Th><Th>Status</Th><Th>Date</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {items.map((txn) => (
              <tr key={txn.id} className="hover:bg-gray-50">
                <Td className="font-medium text-gray-900 whitespace-nowrap">{txn.voter_name}</Td>
                <Td className="text-xs text-gray-500">{txn.voter_phone}</Td>
                <Td className="whitespace-nowrap">{txn.contestant?.name ?? '—'}</Td>
                <Td className="text-xs">{txn.vote_package?.name ?? '—'}</Td>
                <Td className="text-xs">{PAYMENT_METHOD_LABELS[txn.payment_method]}</Td>
                <Td className="font-medium">{formatGHS(txn.amount)}</Td>
                <Td className="font-bold text-forest-600">{txn.votes_purchased}</Td>
                <Td><Badge text={PAYMENT_STATUS_LABELS[txn.payment_status]} className={PAYMENT_STATUS_COLORS[txn.payment_status]} /></Td>
                <Td className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(txn.created_at)}</Td>
                <Td>
                  <div className="flex items-center gap-1">
                    {txn.payment_status === 'pending' && (
                      <button onClick={() => handleConfirm(txn.id)} className="p-1.5 rounded-lg hover:bg-forest-50 text-forest-600" title="Confirm"><CheckCircle2 className="h-4 w-4" /></button>
                    )}
                    {txn.payment_status === 'confirmed' && (
                      <button onClick={() => handleReverse(txn.id)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="Reverse"><RotateCcw className="h-4 w-4" /></button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}

// === Vote Batches Tab ===
function BatchesTab({ selectedEventId }: { selectedEventId: string }) {
  const [items, setItems] = useState<VoteBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('vote_batches').select('*, contestant:contestants(name), transaction:transactions(voter_name)').order('created_at', { ascending: false });
    if (selectedEventId !== 'all') q = q.eq('event_id', selectedEventId);
    const { data } = await q;
    setItems(data || []);
    setLoading(false);
  }, [selectedEventId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-gray-400 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{items.length} vote batches</p>
        {items.length > 0 && <ExportButtons data={items as unknown as Record<string, unknown>[]} filename="vote_batches" />}
      </div>
      {items.length === 0 ? <EmptyState message="No vote batches yet." /> : (
        <TableShell>
          <thead><tr><Th>Contestant</Th><Th>Voter</Th><Th>Votes</Th><Th>Status</Th><Th>Applied</Th><Th>Created</Th></tr></thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <Td className="font-medium text-gray-900">{b.contestant?.name ?? '—'}</Td>
                <Td className="text-xs text-gray-500">{b.transaction?.voter_name ?? '—'}</Td>
                <Td className="font-bold text-gold-600">+{b.votes_count}</Td>
                <Td>
                  <Badge text={b.status} className={b.status === 'applied' ? 'bg-forest-100 text-forest-700 border-forest-200' : b.status === 'reversed' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'} />
                </Td>
                <Td className="text-xs text-gray-500">{formatDateTime(b.applied_at)}</Td>
                <Td className="text-xs text-gray-500">{formatDateTime(b.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}

// === Reconciliation Tab ===
function ReconciliationTab({ selectedEventId, logAction }: { selectedEventId: string; logAction: (a: string, et?: string, ei?: string, d?: Record<string, unknown>) => void }) {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('transactions').select('*, contestant:contestants(name), vote_package:vote_packages(name)').eq('payment_status', 'confirmed').order('confirmed_at', { ascending: false });
    if (selectedEventId !== 'all') q = q.eq('event_id', selectedEventId);
    const { data } = await q;
    setItems(data || []);
    setLoading(false);
  }, [selectedEventId]);

  useEffect(() => { load(); }, [load]);

  const handleReconcile = async (id: string) => {
    const { error } = await supabase.rpc('reconcile_transaction', { p_transaction_id: id });
    if (error) { alert(error.message); return; }
    load();
  };

  const handleReconcileAll = async () => {
    const unreconciled = items.filter((t) => !t.reconciled);
    if (unreconciled.length === 0) return;
    for (const txn of unreconciled) {
      await supabase.rpc('reconcile_transaction', { p_transaction_id: txn.id });
    }
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-gray-400 animate-spin" /></div>;

  const reconciled = items.filter((t) => t.reconciled);
  const unreconciled = items.filter((t) => !t.reconciled);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Confirmed" value={formatNumber(items.length)} icon={Receipt} color="bg-blue-100 text-blue-600" />
        <StatCard label="Reconciled" value={formatNumber(reconciled.length)} icon={CheckCircle2} color="bg-forest-100 text-forest-600" />
        <StatCard label="Unreconciled" value={formatNumber(unreconciled.length)} icon={AlertCircle} color="bg-amber-100 text-amber-600" />
      </div>

      {unreconciled.length > 0 && (
        <button onClick={handleReconcileAll} className="px-4 py-2 bg-forest-600 text-white rounded-lg text-sm font-medium hover:bg-forest-700 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Reconcile All ({unreconciled.length})
        </button>
      )}

      {items.length === 0 ? <EmptyState message="No confirmed transactions to reconcile." /> : (
        <TableShell>
          <thead><tr><Th>Voter</Th><Th>Contestant</Th><Th>Amount</Th><Th>Votes</Th><Th>Method</Th><Th>Reference</Th><Th>Reconciled</Th><Th>Action</Th></tr></thead>
          <tbody>
            {items.map((txn) => (
              <tr key={txn.id} className={txn.reconciled ? 'bg-forest-50/50' : 'hover:bg-gray-50'}>
                <Td className="font-medium text-gray-900">{txn.voter_name}</Td>
                <Td>{txn.contestant?.name ?? '—'}</Td>
                <Td className="font-medium">{formatGHS(txn.amount)}</Td>
                <Td className="font-bold text-forest-600">{txn.votes_purchased}</Td>
                <Td className="text-xs">{PAYMENT_METHOD_LABELS[txn.payment_method]}</Td>
                <Td className="text-xs font-mono text-gray-500">{txn.momo_reference ?? '—'}</Td>
                <Td>
                  {txn.reconciled
                    ? <Badge text="Yes" className="bg-forest-100 text-forest-700 border-forest-200" />
                    : <Badge text="No" className="bg-amber-100 text-amber-700 border-amber-200" />}
                </Td>
                <Td>
                  {!txn.reconciled && (
                    <button onClick={() => handleReconcile(txn.id)} className="px-2 py-1 rounded-lg bg-forest-100 text-forest-700 text-xs font-medium hover:bg-forest-200 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Reconcile
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
      {items.length > 0 && <ExportButtons data={items as unknown as Record<string, unknown>[]} filename="reconciliation" />}
    </div>
  );
}

// === Audit Log Tab ===
function AuditTab() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('audit_logs').select('*, admin:admins(full_name, email)').order('created_at', { ascending: false }).limit(100).then(({ data }) => {
      setItems(data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-gray-400 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{items.length} recent actions</p>
      {items.length === 0 ? <EmptyState message="No audit logs yet." /> : (
        <TableShell>
          <thead><tr><Th>Action</Th><Th>Admin</Th><Th>Entity</Th><Th>Details</Th><Th>Time</Th></tr></thead>
          <tbody>
            {items.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <Td><code className="text-xs font-medium text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">{log.action}</code></Td>
                <Td className="text-xs">{(log as unknown as { admin?: { full_name: string } }).admin?.full_name ?? '—'}</Td>
                <Td className="text-xs text-gray-500">{log.entity_type ?? '—'}</Td>
                <Td className="text-xs text-gray-500 max-w-xs truncate">{log.details ? JSON.stringify(log.details) : '—'}</Td>
                <Td className="text-xs text-gray-500 whitespace-nowrap">{timeAgo(log.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
      {items.length > 0 && <ExportButtons data={items as unknown as Record<string, unknown>[]} filename="audit_logs" />}
    </div>
  );
}

// === Admins Tab ===
function AdminsTab({ admin }: { admin: Admin }) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [codes, setCodes] = useState<RegistrationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCode, setShowCode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: adminData }, { data: codeData }] = await Promise.all([
      supabase.from('admins').select('*').order('created_at', { ascending: false }),
      supabase.from('registration_codes').select('*').order('created_at', { ascending: false }),
    ]);
    setAdmins(adminData || []);
    setCodes(codeData || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generateCode = async () => {
    const { data, error } = await supabase.rpc('generate_registration_code');
    if (error) { alert(error.message); return; }
    setShowCode(true);
    setTimeout(() => setShowCode(false), 5000);
    load();
  };

  const toggleActive = async (a: Admin) => {
    if (a.id === admin.id) { alert("You can't deactivate yourself"); return; }
    await supabase.from('admins').update({ is_active: !a.is_active }).eq('id', a.id);
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-gray-400 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Admins List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-gray-900">Admin Accounts</h3>
          <button onClick={generateCode} className="px-4 py-2 bg-gold-500 text-white rounded-lg text-sm font-medium hover:bg-gold-600 flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Generate Registration Code
          </button>
        </div>

        {showCode && codes[0] && (
          <div className="p-4 bg-gold-50 border border-gold-200 rounded-xl flex items-center gap-3 animate-slide-down">
            <Sparkles className="h-5 w-5 text-gold-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">New code generated!</p>
              <p className="font-mono text-lg font-bold text-gold-700">{codes[0].code}</p>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(codes[0].code); }} className="px-3 py-1.5 rounded-lg bg-white border border-gold-200 text-sm hover:bg-gold-50 flex items-center gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
        )}

        <TableShell>
          <thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Status</Th><Th>Created</Th><Th>Action</Th></tr></thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <Td className="font-medium text-gray-900">
                  {a.full_name}
                  {a.id === admin.id && <span className="text-xs text-gray-400 ml-1">(you)</span>}
                </Td>
                <Td className="text-xs text-gray-500">{a.email}</Td>
                <Td><Badge text={a.role} className={a.role === 'super_admin' ? 'bg-gold-100 text-gold-700 border-gold-200' : 'bg-gray-100 text-gray-600 border-gray-200'} /></Td>
                <Td><Badge text={a.is_active ? 'Active' : 'Inactive'} className={a.is_active ? 'bg-forest-100 text-forest-700 border-forest-200' : 'bg-red-100 text-red-700 border-red-200'} /></Td>
                <Td className="text-xs text-gray-500">{formatDate(a.created_at)}</Td>
                <Td>
                  {a.id !== admin.id && (
                    <button onClick={() => toggleActive(a)} className="p-1.5 rounded-lg hover:bg-gray-100" title={a.is_active ? 'Deactivate' : 'Activate'}>
                      {a.is_active ? <Ban className="h-4 w-4 text-red-500" /> : <CheckCircle2 className="h-4 w-4 text-forest-500" />}
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </div>

      {/* Registration Codes */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-gray-900">Registration Codes</h3>
        {codes.length === 0 ? <EmptyState message="No codes generated yet." /> : (
          <TableShell>
            <thead><tr><Th>Code</Th><Th>Status</Th><Th>Created</Th><Th>Used</Th></tr></thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <Td className="font-mono font-bold text-gray-900">{c.code}</Td>
                  <Td><Badge text={c.is_used ? 'Used' : 'Available'} className={c.is_used ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-forest-100 text-forest-700 border-forest-200'} /></Td>
                  <Td className="text-xs text-gray-500">{timeAgo(c.created_at)}</Td>
                  <Td className="text-xs text-gray-500">{c.used_at ? timeAgo(c.used_at) : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </div>
    </div>
  );
}
