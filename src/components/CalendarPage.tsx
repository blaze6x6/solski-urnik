import { useState, useEffect, useMemo } from 'react';
import * as api from '../api';
import { CalendarEvent, Recurrence, EventReminder } from '../types';
import { Plus, Trash2, Edit2, Save, X, CalendarDays, ChevronLeft, ChevronRight, Clock, Repeat, Bell } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, isSameMonth, parseISO, addMonths, subMonths } from 'date-fns';
import { sl } from 'date-fns/locale';
const EVENT_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280',
];
const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Enkratno' },
  { value: 'range', label: 'Razpon datumov' },
  { value: 'daily', label: 'Vsak dan' },
  { value: 'weekly', label: 'Vsak teden' },
  { value: 'biweekly', label: 'Vsak drugi teden' },
  { value: 'triweekly', label: 'Vsak tretji teden' },
  { value: 'monthly', label: 'Vsak mesec' },
];
const recurrenceLabel = (r: Recurrence) =>
  RECURRENCE_OPTIONS.find(o => o.value === r)?.label || 'Enkratno';
interface FormState {
  title: string;
  color: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  recurrence: Recurrence;
  note: string;
  reminders: EventReminder[];
}
const emptyForm = (): FormState => ({
  title: '',
  color: EVENT_COLORS[4],
  date: format(new Date(), 'yyyy-MM-dd'),
  endDate: '',
  startTime: '09:00',
  endTime: '10:00',
  recurrence: 'none',
  note: '',
  reminders: [],
});
const DAYS_SL = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned'];
export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));
  const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([]);
  const [dayLoading, setDayLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const refresh = () => {
    api.getCalendarEvents().then(setEvents).finally(() => setLoading(false));
  };
  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (selectedDate) {
      setDayLoading(true);
      api.getCalendarEventsForDate(selectedDate).then(setDayEvents).finally(() => setDayLoading(false));
    }
  }, [selectedDate, events]);
  // Build calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const days: Date[] = [];
    let day = gridStart;
    while (day <= monthEnd || days.length % 7 !== 0) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);
  // Count events per day (simple: check master list for matching dates)
  const eventCountForDay = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(e => {
      if (e.recurrence === 'range') {
        return e.date <= dateStr && (e.endDate || e.date) >= dateStr;
      }
      if (e.recurrence === 'none' || !e.recurrence) return e.date === dateStr;
      if (e.recurrence === 'daily') return e.date <= dateStr;
      if (e.recurrence === 'weekly') return e.date <= dateStr && date.getDay() === parseISO(e.date).getDay();
      if (e.recurrence === 'monthly') return e.date <= dateStr && parseISO(e.date).getDate() === date.getDate();
      return false;
    }).length;
  };
  const validate = () => {
    if (!form.title.trim() || !form.date || !form.startTime || !form.endTime) return false;
    if (form.startTime >= form.endTime) { alert('Ura začetka mora biti pred uro konca.'); return false; }
    if (form.recurrence === 'range' && !form.endDate) { alert('Razpon zahteva končni datum.'); return false; }
    if (form.recurrence === 'range' && form.endDate < form.date) { alert('Končni datum mora biti po začetnem.'); return false; }
    return true;
  };
  const handleCreate = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.createCalendarEvent({
        title: form.title, color: form.color, date: form.date,
        endDate: form.recurrence === 'range' ? form.endDate : undefined,
        startTime: form.startTime, endTime: form.endTime,
        recurrence: form.recurrence, note: form.note || undefined,
        reminders: form.reminders,
      });
      setForm(emptyForm()); setShowForm(false); refresh();
    } finally { setSaving(false); }
  };
  const handleUpdate = async (id: string) => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.updateCalendarEvent(id, {
        title: form.title, color: form.color, date: form.date,
        endDate: form.recurrence === 'range' ? form.endDate : undefined,
        startTime: form.startTime, endTime: form.endTime,
        recurrence: form.recurrence, note: form.note || undefined,
        reminders: form.reminders,
      });
      setEditingId(null); refresh();
    } finally { setSaving(false); }
  };
  const handleDelete = async (id: string) => {
    if (confirm('Ali ste prepričani?')) { await api.deleteCalendarEvent(id); refresh(); }
  };
  const startEdit = (e: CalendarEvent) => {
    setEditingId(e.id);
    setForm({ title: e.title, color: e.color, date: e.date, endDate: e.endDate || '', startTime: e.startTime, endTime: e.endTime, recurrence: e.recurrence, note: e.note || '', reminders: e.reminders || [] });
  };
  const today = format(new Date(), 'yyyy-MM-dd');
  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Koledar dogodkov</h1>
          <p className="text-gray-500 text-sm mt-1">Vsi dnevi v tednu, celotno leto</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm()); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Dodaj dogodek
        </button>
      </div>
      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border-l-4 border-blue-500">
          <h3 className="font-semibold text-gray-800 mb-3">Nov koledarski dogodek</h3>
          <EventForm form={form} setForm={setForm} saving={saving} onSave={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-blue-100 rounded-lg transition"><ChevronLeft className="w-5 h-5" /></button>
            <span className="font-semibold text-gray-800">{format(currentMonth, 'MMMM yyyy', { locale: sl })}</span>
            <div className="flex gap-1">
              <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium">Danes</button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-blue-100 rounded-lg transition"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS_SL.map(d => (
              <div key={d} className="p-2 text-center text-xs font-semibold text-gray-500">{d}</div>
            ))}
          </div>
          {/* Day cells */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {calendarDays.map((date, i) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const inMonth = isSameMonth(date, currentMonth);
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                const count = eventCountForDay(date);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`p-1.5 min-h-[60px] border-b border-r border-gray-100 cursor-pointer transition ${
                      !inMonth ? 'bg-gray-50 opacity-40' :
                      isSelected ? 'bg-blue-100' :
                      isToday ? 'bg-blue-50' :
                      isWeekend ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`text-sm font-medium ${isToday ? 'text-blue-600 font-bold' : inMonth ? 'text-gray-700' : 'text-gray-400'}`}>
                      {format(date, 'd')}
                    </div>
                    {count > 0 && (
                      <div className="mt-0.5 flex gap-0.5 flex-wrap">
                        {Array.from({ length: Math.min(count, 3) }).map((_, j) => (
                          <div key={j} className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        ))}
                        {count > 3 && <span className="text-[9px] text-gray-400">+{count - 3}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* Selected day detail */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">
              {selectedDate ? format(parseISO(selectedDate), 'EEEE, d. MMMM yyyy', { locale: sl }) : 'Izberite dan'}
            </h3>
          </div>
          {!selectedDate ? (
            <div className="p-6 text-center text-gray-400 text-sm">Kliknite na dan v koledarju.</div>
          ) : dayLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : dayEvents.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              Ni dogodkov na ta dan.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {dayEvents.map(e => {
                const isEditing = editingId === e.id;
                return (
                  <div key={e.id} className="p-3">
                    {isEditing ? (
                      <div className="space-y-3">
                        <EventForm form={form} setForm={setForm} saving={saving} onSave={() => handleUpdate(e.id)} onCancel={() => setEditingId(null)} compact />
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: e.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm">{e.title}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {e.startTime} – {e.endTime}</span>
                            {e.recurrence !== 'none' && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-medium">
                                <Repeat className="w-2.5 h-2.5" />
                                {recurrenceLabel(e.recurrence)}
                                {e.recurrence === 'range' && e.endDate && ` do ${format(parseISO(e.endDate), 'd.M.yyyy')}`}
                              </span>
                            )}
                          </div>
                          {e.note && <p className="text-xs text-gray-400 mt-1">{e.note}</p>}
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <button onClick={() => startEdit(e)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(e.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
/* Shared form component */
function EventForm({ form, setForm, saving, onSave, onCancel, compact }: {
  form: FormState;
  setForm: (f: FormState) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Naziv</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="npr. Zobozdravnik" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Ponavljanje</label>
          <select value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value as Recurrence })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
            {RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{form.recurrence === 'range' ? 'Od' : 'Datum'}</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        {form.recurrence === 'range' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Do</label>
            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
        )}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Začetek</label>
          <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Konec</label>
          <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
      </div>
      {!compact && (
        <>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Opomba (neobvezno)</label>
            <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="npr. ordinacija dr. Novak" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          {/* Reminders */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs text-gray-500 flex items-center gap-1"><Bell className="w-3 h-3" /> Email opomniki</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, reminders: [...form.reminders, { type: 'hours', value: 1 }] })}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Dodaj opomnik
              </button>
            </div>
            {form.reminders.length === 0 && (
              <p className="text-xs text-gray-400">Brez opomnikov.</p>
            )}
            <div className="space-y-2">
              {form.reminders.map((rem, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                  <select
                    value={rem.type}
                    onChange={e => {
                      const updated = [...form.reminders];
                      updated[idx] = { ...updated[idx], type: e.target.value as 'hours' | 'days' | 'custom', value: e.target.value === 'custom' ? 0 : updated[idx].value || 1 };
                      setForm({ ...form, reminders: updated });
                    }}
                    className="px-2 py-1 border rounded text-xs"
                  >
                    <option value="hours">Ur prej</option>
                    <option value="days">Dni prej</option>
                    <option value="custom">Točen datum</option>
                  </select>
                  {rem.type === 'hours' && (
                    <select
                      value={rem.value}
                      onChange={e => {
                        const updated = [...form.reminders];
                        updated[idx] = { ...updated[idx], value: parseInt(e.target.value) };
                        setForm({ ...form, reminders: updated });
                      }}
                      className="px-2 py-1 border rounded text-xs"
                    >
                      {Array.from({ length: 23 }, (_, i) => i + 1).map(h => (
                        <option key={h} value={h}>{h}h</option>
                      ))}
                    </select>
                  )}
                  {rem.type === 'days' && (
                    <select
                      value={rem.value}
                      onChange={e => {
                        const updated = [...form.reminders];
                        updated[idx] = { ...updated[idx], value: parseInt(e.target.value) };
                        setForm({ ...form, reminders: updated });
                      }}
                      className="px-2 py-1 border rounded text-xs"
                    >
                      {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d} {d === 1 ? 'dan' : d === 2 ? 'dneva' : d <= 4 ? 'dni' : 'dni'}</option>
                      ))}
                    </select>
                  )}
                  {rem.type === 'custom' && (
                    <>
                      <input
                        type="date"
                        value={rem.customDate || ''}
                        onChange={e => {
                          const updated = [...form.reminders];
                          updated[idx] = { ...updated[idx], customDate: e.target.value };
                          setForm({ ...form, reminders: updated });
                        }}
                        className="px-2 py-1 border rounded text-xs"
                      />
                      <input
                        type="time"
                        value={rem.customTime || '09:00'}
                        onChange={e => {
                          const updated = [...form.reminders];
                          updated[idx] = { ...updated[idx], customTime: e.target.value };
                          setForm({ ...form, reminders: updated });
                        }}
                        className="px-2 py-1 border rounded text-xs"
                      />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, reminders: form.reminders.filter((_, i) => i !== idx) })}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {EVENT_COLORS.map(c => (
            <button key={c} onClick={() => setForm({ ...form, color: c })} className={`w-6 h-6 rounded-full transition ${form.color === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={onSave} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-1 text-sm disabled:opacity-50"><Save className="w-4 h-4" /> Shrani</button>
        <button onClick={onCancel} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition flex items-center gap-1 text-sm"><X className="w-4 h-4" /> Prekliči</button>
      </div>
    </div>
  );
}
