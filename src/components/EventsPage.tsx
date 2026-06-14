import { useState } from 'react';
import * as api from '../api';
import { useMultipleAsync } from '../hooks/useAsync';
import { DayEvent, SchoolClass, Recurrence } from '../types';
import { Plus, Trash2, Edit2, Save, X, CalendarCheck, Clock, Repeat } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { sl } from 'date-fns/locale';

const EVENT_COLORS = [
  { name: 'Rdeča', value: '#EF4444' },
  { name: 'Oranžna', value: '#F97316' },
  { name: 'Rumena', value: '#F59E0B' },
  { name: 'Zelena', value: '#10B981' },
  { name: 'Modra', value: '#3B82F6' },
  { name: 'Vijolična', value: '#8B5CF6' },
  { name: 'Roza', value: '#EC4899' },
  { name: 'Siva', value: '#6B7280' },
];

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Enkratno' },
  { value: 'daily', label: 'Vsak dan' },
  { value: 'weekly', label: 'Vsak teden' },
  { value: 'biweekly', label: 'Vsak drugi teden' },
  { value: 'triweekly', label: 'Vsak tretji teden' },
  { value: 'monthly', label: 'Vsak mesec' },
];

const recurrenceLabel = (r: Recurrence) =>
  RECURRENCE_OPTIONS.find(o => o.value === r)?.label || 'Enkratno';

interface FormState {
  date: string;
  title: string;
  color: string;
  classIds: string[];
  startTime: string;
  endTime: string;
  recurrence: Recurrence;
}

const emptyForm = (): FormState => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  title: '',
  color: EVENT_COLORS[4].value,
  classIds: [],
  startTime: '08:00',
  endTime: '09:00',
  recurrence: 'none',
});

export default function EventsPage() {
  const { data, loading, error, refresh } = useMultipleAsync({
    events: api.getEvents,
    classes: api.getClasses,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (error) {
    return <div className="bg-red-50 text-red-600 p-4 rounded-xl">Napaka: {error}</div>;
  }

  const { events, classes } = data;

  const validate = () => {
    if (!form.title.trim() || !form.date || !form.startTime || !form.endTime) return false;
    if (form.startTime >= form.endTime) {
      alert('Ura začetka mora biti pred uro konca.');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.createEvent({ ...form });
      setForm(emptyForm());
      setShowForm(false);
      refresh();
    } finally { setSaving(false); }
  };

  const handleUpdate = async (id: string) => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.updateEvent(id, { ...form });
      setEditingId(null);
      refresh();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Ali ste prepričani, da želite izbrisati ta dogodek?')) {
      await api.deleteEvent(id);
      refresh();
    }
  };

  const startEdit = (e: DayEvent) => {
    setEditingId(e.id);
    setForm({
      date: e.date,
      title: e.title,
      color: e.color,
      classIds: e.classIds,
      startTime: e.startTime || '08:00',
      endTime: e.endTime || '09:00',
      recurrence: e.recurrence || 'none',
    });
  };

  const toggleClass = (classId: string) => {
    setForm(f => ({
      ...f,
      classIds: f.classIds.includes(classId)
        ? f.classIds.filter(id => id !== classId)
        : [...f.classIds, classId],
    }));
  };

  const getClassName = (id: string) => classes?.find((c: SchoolClass) => c.id === id)?.name || '';

  /* ---- shared form fields ---- */
  const renderFormFields = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            {form.recurrence === 'none' ? 'Datum' : 'Datum začetka'}
          </label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Naziv dogodka</label>
          <input
            placeholder="npr. Trening, Športni dan"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Začetek</label>
          <input
            type="time"
            value={form.startTime}
            onChange={e => setForm({ ...form, startTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Konec</label>
          <input
            type="time"
            value={form.endTime}
            onChange={e => setForm({ ...form, endTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Recurrence */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-600 mb-2">Ponavljanje</label>
        <div className="flex gap-2 flex-wrap">
          {RECURRENCE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setForm({ ...form, recurrence: opt.value })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                form.recurrence === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.value !== 'none' && <Repeat className="w-3.5 h-3.5" />}
              {opt.label}
            </button>
          ))}
        </div>
        {form.recurrence !== 'none' && (
          <p className="text-xs text-indigo-600 mt-1">
            Dogodek se ponavlja od izbranega datuma naprej do konca šolskega leta.
          </p>
        )}
      </div>

      {/* Color */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-600 mb-2">Barva</label>
        <div className="flex gap-2 flex-wrap">
          {EVENT_COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => setForm({ ...form, color: c.value })}
              className={`w-8 h-8 rounded-full transition ${form.color === c.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'}`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
      </div>

      {/* Classes */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-600">Razredi</label>
          <button onClick={() => setForm({ ...form, classIds: [] })} className="text-xs text-blue-600 hover:underline">
            {form.classIds.length === 0 ? 'Vsi razredi izbrani' : 'Izberi vse'}
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {classes?.map((c: SchoolClass) => (
            <button
              key={c.id}
              onClick={() => toggleClass(c.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                form.classIds.length === 0 || form.classIds.includes(c.id)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {form.classIds.length === 0 ? 'Dogodek velja za vse razrede' : `Izbrani: ${form.classIds.length} razred(ov)`}
        </p>
      </div>
    </>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dogodki</h1>
          <p className="text-gray-500 text-sm mt-1">Enkratni ali ponavljajoči dogodki z uro začetka in konca</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm()); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Dodaj dogodek
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4 border-l-4 border-green-500">
          <h3 className="font-semibold text-gray-800 mb-3">Nov dogodek</h3>
          {renderFormFields()}
          <div className="flex gap-2 mt-4">
            <button onClick={handleCreate} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-1 disabled:opacity-50">
              <Save className="w-4 h-4" /> Shrani
            </button>
            <button onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition flex items-center gap-1">
              <X className="w-4 h-4" /> Prekliči
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {!events || events.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <CalendarCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Ni dogodkov.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {events.map((event: DayEvent) => {
              const isEditing = editingId === event.id;
              const eventClasses = event.classIds.length === 0
                ? 'Vsi razredi'
                : event.classIds.map(id => getClassName(id)).filter(Boolean).join(', ');

              return (
                <div key={event.id} className="p-4 hover:bg-gray-50">
                  {isEditing ? (
                    <div className="space-y-3">
                      {renderFormFields()}
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => handleUpdate(event.id)} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-1 disabled:opacity-50">
                          <Save className="w-4 h-4" /> Shrani
                        </button>
                        <button onClick={() => setEditingId(null)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition flex items-center gap-1">
                          <X className="w-4 h-4" /> Prekliči
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: event.color }}>
                          {event.recurrence !== 'none' ? <Repeat className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{event.title}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                            <span>
                              {event.recurrence === 'none'
                                ? format(parseISO(event.date), 'EEEE, d. MMMM yyyy', { locale: sl })
                                : `Od ${format(parseISO(event.date), 'd. M. yyyy')}`
                              }
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-blue-600 font-medium">{event.startTime} – {event.endTime}</span>
                            {event.recurrence !== 'none' && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                                  <Repeat className="w-3 h-3" />
                                  {recurrenceLabel(event.recurrence)}
                                </span>
                              </>
                            )}
                            <span className="text-gray-300">•</span>
                            <span>{eventClasses}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => startEdit(event)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(event.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-xl space-y-1">
        <p className="text-sm text-blue-700">
          <strong>Enkratno:</strong> Dogodek se prikaže samo na izbranem datumu.
        </p>
        <p className="text-sm text-blue-700">
          <strong>Ponavljajoče:</strong> Dogodek se ponavlja od izbranega datuma naprej do konca šolskega leta.
          Prikaže se v vseh celicah urnika, katerih čas se prekriva z dogodkom.
        </p>
      </div>
    </div>
  );
}
