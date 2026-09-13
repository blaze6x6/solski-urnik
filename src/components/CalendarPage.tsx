import { useState, useEffect, useMemo, useRef } from 'react';
import * as api from '../api';
import { CalendarEvent, Recurrence, EventReminder, SchoolClass } from '../types';
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
  classIds: string[];
  addToSchedule: boolean;
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
  classIds: [],
  addToSchedule: true,
});

const DAYS_SL = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned'];

import { getSlovenianHolidays } from '../holidays';

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [classesList, setClassesList] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));
  const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([]);
  const [dayLoading, setDayLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > minSwipeDistance) {
      setCurrentMonth(addMonths(currentMonth, 1));
    } else if (distance < -minSwipeDistance) {
      setCurrentMonth(subMonths(currentMonth, 1));
    }
  };

  const refresh = () => {
    Promise.all([
      api.getCalendarEvents(),
      api.getClasses()
    ]).then(([evs, cls]) => {
      setEvents(evs);
      setClassesList(cls);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (selectedDate) {
      setDayLoading(true);
      api.getCalendarEventsForDate(selectedDate).then(setDayEvents).finally(() => setDayLoading(false));
    }
  }, [selectedDate, events]);

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

  const eventCountForDay = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(e => {
      if (e.endDate && e.date <= dateStr && e.endDate >= dateStr) return true;
      if (!e.endDate && e.recurrence === 'range') {
        return e.date <= dateStr;
      }
      if (e.recurrence === 'none' || !e.recurrence) return e.date === dateStr;
      if (e.recurrence === 'daily') return e.date <= dateStr;
      if (e.recurrence === 'weekly') return e.date <= dateStr && date.getDay() === parseISO(e.date).getDay();
      if (e.recurrence === 'biweekly') {
        const diffDays = Math.floor((parseISO(dateStr).getTime() - parseISO(e.date).getTime()) / (1000 * 60 * 60 * 24));
        return e.date <= dateStr && date.getDay() === parseISO(e.date).getDay() && diffDays >= 0 && Math.floor(diffDays / 7) % 2 === 0;
      }
      if (e.recurrence === 'triweekly') {
        const diffDays = Math.floor((parseISO(dateStr).getTime() - parseISO(e.date).getTime()) / (1000 * 60 * 60 * 24));
        return e.date <= dateStr && date.getDay() === parseISO(e.date).getDay() && diffDays >= 0 && Math.floor(diffDays / 7) % 3 === 0;
      }
      if (e.recurrence === 'monthly') return e.date <= dateStr && parseISO(e.date).getDate() === parseISO(dateStr).getDate();
      return false;
    }).length;
  };

  const validate = () => {
    if (!form.title.trim() || !form.date || !form.startTime || !form.endTime) return false;
    if (form.startTime >= form.endTime) { alert('Ura začetka mora biti pred uro konca.'); return false; }
    if (form.recurrence !== 'none' && form.endDate && form.endDate < form.date) { alert('Končni datum mora biti po začetnem datumu.'); return false; }
    return true;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.createCalendarEvent({
        title: form.title, 
        color: form.color, 
        date: form.date,
        endDate: form.recurrence !== 'none' ? form.endDate || undefined : undefined,
        startTime: form.startTime, 
        endTime: form.endTime,
        recurrence: form.recurrence, 
        note: form.note || undefined,
        reminders: form.reminders,
      });

      if (form.addToSchedule) {
        await api.createEvent({
          title: form.title,
          color: form.color,
          date: form.date,
          endDate: form.recurrence !== 'none' ? form.endDate || undefined : undefined,
          startTime: form.startTime,
          endTime: form.endTime,
          recurrence: form.recurrence,
          classIds: form.classIds,
        });
      }

      setForm(emptyForm()); 
      setShowForm(false); 
      refresh();
    } finally { 
      setSaving(false); 
    }
  };

  const handleUpdate = async (id: string) => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.updateCalendarEvent(id, {
        title: form.title, 
        color: form.color, 
        date: form.date,
        endDate: form.recurrence !== 'none' ? form.endDate || undefined : undefined,
        startTime: form.startTime, 
        endTime: form.endTime,
        recurrence: form.recurrence, 
        note: form.note || undefined,
        reminders: form.reminders,
      });

      setEditingId(null); 
      refresh();
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Ali ste prepričani?')) { 
      await api.deleteCalendarEvent(id); 
      refresh(); 
    }
  };

  const startEdit = (e: CalendarEvent) => {
    setEditingId(e.id);
    setForm({ 
      title: e.title, 
      color: e.color, 
      date: e.date, 
      endDate: e.endDate || '', 
      startTime: e.startTime, 
      endTime: e.endTime, 
      recurrence: e.recurrence, 
      note: e.note || '', 
      reminders: e.reminders || [],
      classIds: [],
      addToSchedule: false 
    });
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  const holidays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const map = getSlovenianHolidays(year);
    const prev = getSlovenianHolidays(year - 1);
    const next = getSlovenianHolidays(year + 1);
    prev.forEach((v, k) => map.set(k, v));
    next.forEach((v, k) => map.set(k, v));
    return map;
  }, [currentMonth]);

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

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border-l-4 border-blue-500">
          <h3 className="font-semibold text-gray-800 mb-3">Nov koledarski dogodek</h3>
          <EventForm 
            form={form} 
            setForm={setForm} 
            classesList={classesList} 
            saving={saving} 
            onSave={handleCreate} 
            onCancel={() => setShowForm(false)} 
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div 
          className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-blue-100 rounded-lg transition"><ChevronLeft className="w-5 h-5" /></button>
            <span className="font-semibold text-gray-800">{format(currentMonth, 'MMMM yyyy', { locale: sl })}</span>
            <div className="flex gap-1">
              <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium">Danes</button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-blue-100 rounded-lg transition"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS_SL.map((d, idx) => (
              <div key={d} className={`p-2 text-center text-xs font-semibold ${idx >= 5 ? 'text-red-500' : 'text-gray-500'}`}>{d}</div>
            ))}
          </div>

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
                const holiday = holidays.get(dateStr);
                const isHoliday = !!holiday;
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`p-1.5 min-h-[60px] border-b border-r border-gray-100 cursor-pointer transition ${
                      !inMonth ? 'bg-gray-50 opacity-40' :
                      isSelected ? 'bg-blue-100' :
                      isToday ? 'bg-blue-50' :
                      isHoliday ? 'bg-red-50' :
                      isWeekend ? 'bg-red-50/50' : 'hover:bg-gray-50'
                    }`}
                    title={holiday || undefined}
                  >
                    <div className={`text-sm font-medium ${
                      isToday ? 'text-blue-600 font-bold' :
                      !inMonth ? 'text-gray-400' :
                      isHoliday ? 'text-red-600 font-bold' :
                      isWeekend ? 'text-red-500' :
                      'text-gray-700'
                    }`}>
                      {format(date, 'd')}
                    </div>
                    {isHoliday && inMonth && (
                      <div className="text-[8px] text-red-500 leading-tight truncate">{holiday}</div>
                    )}
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

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">
              {selectedDate ? format(parseISO(selectedDate), 'EEEE, d. MMMM yyyy', { locale: sl }) : 'Izberite dan'}
            </h3>
            {selectedDate && holidays.get(selectedDate) && (
              <p className="text-xs text-red-600 font-medium mt-0.5">🇸🇮 {holidays.get(selectedDate)}</p>
            )}
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
                        <EventForm 
                          form={form} 
                          setForm={setForm} 
                          classesList={classesList} 
                          saving={saving} 
                          onSave={() => handleUpdate(e.id)} 
                          onCancel={() => setEditingId(null)} 
                        />
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
                                {e.endDate && ` do ${format(parseISO(e.endDate), 'd.M.yyyy')}`}
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

function EventForm({ form, setForm, classesList, saving, onSave, onCancel }: {
  form: FormState;
  setForm: (f: FormState) => void;
  classesList: SchoolClass[];
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const toggleClass = (classId: string) => {
    setForm({
      ...form,
      classIds: form.classIds.includes(classId)
        ? form.classIds.filter(id => id !== classId)
        : [...form.classIds, classId],
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

      <div className={`grid gap-3 ${form.recurrence !== 'none' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            {form.recurrence === 'none' ? 'Datum' : 'Datum začetka (Od)'}
          </label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>

        {form.recurrence !== 'none' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Končni datum (Do) <span className="text-[10px] text-gray-400 font-normal">(opcijsko)</span>
            </label>
            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Prazno = do konca leta" />
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-500 mb-1">Ura (Začetek – Konec)</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Opomba (neobvezno)</label>
        <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="npr. ordinacija dr. Novak" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Razredi (za prikaz na šolskem urniku)</label>
        <div className="flex gap-1.5 flex-wrap">
          {classesList.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleClass(c.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                form.classIds.includes(c.id) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          {form.classIds.length === 0 ? 'Prazno = dogodek velja za vse razrede na urniku.' : `Izbrano razredov: ${form.classIds.length}`}
        </p>
      </div>

      {/* Opomniki */}
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

      <div className="flex gap-1 flex-wrap">
        {EVENT_COLORS.map(c => (
          <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={`w-6 h-6 rounded-full transition ${form.color === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
        ))}
      </div>

      <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
        <input
          type="checkbox"
          id="addToSchedule"
          checked={form.addToSchedule}
          onChange={e => setForm({ ...form, addToSchedule: e.target.checked })}
          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
        />
        <label htmlFor="addToSchedule" className="text-xs font-medium text-gray-700 cursor-pointer">
          Prikaži dogodek tudi med šolskimi dogodki (EventsPage in ScheduleView)
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <button onClick={onSave} disabled={saving} className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center gap-1 text-sm disabled:opacity-50"><Save className="w-4 h-4" /> Shrani</button>
        <button onClick={onCancel} className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition flex items-center justify-center gap-1 text-sm"><X className="w-4 h-4" /> Prekliči</button>
      </div>
    </div>
  );
}
