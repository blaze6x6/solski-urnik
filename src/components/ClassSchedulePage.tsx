import { useState, useEffect } from 'react';
import * as api from '../api';
import { SchoolClass, Subject, ScheduleEntry, Period, AfternoonEntry } from '../types';
import { Calendar, X, School, Coffee, Plus, Trash2, Save } from 'lucide-react';
import ScheduleView from './ScheduleView';

const DAYS = ['Ponedeljek', 'Torek', 'Sreda', 'Četrtek', 'Petek'];

export default function ClassSchedulePage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [editCell, setEditCell] = useState<{ day: number; periodId: string } | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    Promise.all([
      api.getClasses(),
      api.getSubjects(),
      api.getPeriods(),
    ]).then(([c, s, p]) => {
      setClasses(c);
      setSubjects(s);
      setPeriods(p);
      if (c.length > 0) setSelectedClassId(c[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      api.getScheduleForClass(selectedClassId).then(setEntries);
    }
  }, [selectedClassId, refreshKey]);

  const getEntry = (day: number, periodId: string) =>
    entries.find(e => e.dayOfWeek === day && e.periodId === periodId);

  const handleSaveCell = async () => {
    if (!editCell || !selectedClassId) return;
    if (!editSubject) {
      await api.removeScheduleEntry(selectedClassId, editCell.day, editCell.periodId);
    } else {
      await api.setScheduleEntry({
        classId: selectedClassId,
        subjectId: editSubject,
        dayOfWeek: editCell.day,
        periodId: editCell.periodId,
        room: editRoom || undefined,
      });
    }
    setEditCell(null);
    setRefreshKey(k => k + 1);
  };

  const handleCellClick = (day: number, periodId: string) => {
    const entry = getEntry(day, periodId);
    setEditCell({ day, periodId });
    setEditSubject(entry?.subjectId || '');
    setEditRoom(entry?.room || '');
  };

  const handleRemoveCell = async (day: number, periodId: string) => {
    await api.removeScheduleEntry(selectedClassId, day, periodId);
    setRefreshKey(k => k + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const editingPeriod = editCell ? periods.find(p => p.id === editCell.periodId) : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Urnik razreda</h1>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <School className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-700">Razred:</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {classes.map(c => (
            <button
              key={c.id}
              onClick={() => { setSelectedClassId(c.id); setEditCell(null); }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                selectedClassId === c.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {!selectedClassId ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Izberite razred za urejanje urnika.</p>
        </div>
      ) : (
        <>
          {editCell && editingPeriod && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditCell(null)}>
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">
                    {DAYS[editCell.day]}, {editingPeriod.name}
                  </h3>
                  <button onClick={() => setEditCell(null)} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Predmet</label>
                    <select
                      value={editSubject}
                      onChange={e => setEditSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— Brez predmeta —</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.shortName})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Učilnica</label>
                    <input
                      value={editRoom}
                      onChange={e => setEditRoom(e.target.value)}
                      placeholder="npr. U12"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-5">
                  <button
                    onClick={handleSaveCell}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    Shrani
                  </button>
                  {getEntry(editCell.day, editCell.periodId) && (
                    <button
                      onClick={() => { handleRemoveCell(editCell.day, editCell.periodId); setEditCell(null); }}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition"
                    >
                      Izbriši
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-4 bg-blue-50 border-b border-blue-100">
              <p className="text-sm text-blue-700 font-medium">
                💡 Kliknite na celico za dodajanje ali urejanje predmeta. Odmori so označeni z ikono in niso klikabilni.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-3 text-left text-sm font-semibold text-gray-600 w-28 border-b border-r border-gray-200">Ura</th>
                    {DAYS.map((day, i) => (
                      <th key={i} className="p-3 text-center text-sm font-semibold text-gray-700 border-b border-r border-gray-200">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map(period => (
                    <tr key={period.id} className={period.isBreak ? 'bg-amber-50/50' : ''}>
                      <td className="p-2 text-center border-b border-r border-gray-100 bg-gray-50">
                        <div className="flex items-center justify-center gap-1">
                          {period.isBreak && <Coffee className="w-3 h-3 text-amber-600" />}
                          <span className={`text-sm font-bold ${period.isBreak ? 'text-amber-700' : 'text-gray-700'}`}>
                            {period.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400">{period.startTime} – {period.endTime}</div>
                      </td>
                      {[0, 1, 2, 3, 4].map(day => {
                        if (period.isBreak) {
                          return (
                            <td key={day} className="p-1 border-b border-r border-gray-100">
                              <div className="min-h-[48px] flex items-center justify-center">
                                <Coffee className="w-4 h-4 text-amber-300" />
                              </div>
                            </td>
                          );
                        }

                        const entry = getEntry(day, period.id);
                        const subject = entry ? subjects.find(s => s.id === entry.subjectId) : null;
                        return (
                          <td
                            key={day}
                            onClick={() => handleCellClick(day, period.id)}
                            className="p-1 border-b border-r border-gray-100 cursor-pointer hover:bg-blue-50 transition"
                          >
                            {subject ? (
                              <div
                                className="rounded-lg p-2 text-center min-h-[48px] flex flex-col items-center justify-center"
                                style={{
                                  backgroundColor: subject.color + '18',
                                  borderLeft: `3px solid ${subject.color}`,
                                }}
                              >
                                <span className="font-bold text-sm" style={{ color: subject.color }}>
                                  {subject.shortName}
                                </span>
                                {entry?.room && (
                                  <span className="text-[10px] text-gray-400">{entry.room}</span>
                                )}
                              </div>
                            ) : (
                              <div className="min-h-[48px] flex items-center justify-center text-gray-300 text-xs">
                                +
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Afternoon activities editor */}
          <AfternoonEditor classId={selectedClassId} refreshKey={refreshKey} onRefresh={() => setRefreshKey(k => k + 1)} />

          <h3 className="text-lg font-semibold text-gray-800 mb-3 mt-6">Predogled z datumskim koledarjem</h3>
          <ScheduleView
            key={refreshKey}
            classId={selectedClassId}
            title={`Urnik: ${selectedClass?.name || ''}`}
          />
        </>
      )}
    </div>
  );
}

const AFTERNOON_COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#F97316', '#EF4444', '#06B6D4',
];

function AfternoonEditor({ classId, refreshKey, onRefresh }: { classId: string; refreshKey: number; onRefresh: () => void }) {
  const [entries, setEntries] = useState<AfternoonEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    dayOfWeek: 0,
    name: '',
    color: AFTERNOON_COLORS[0],
    startTime: '14:00',
    endTime: '15:00',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getAfternoonForClass(classId).then(setEntries);
  }, [classId, refreshKey]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.startTime || !form.endTime) return;
    if (form.startTime >= form.endTime) {
      alert('Ura začetka mora biti pred uro konca.');
      return;
    }
    setSaving(true);
    try {
      await api.createAfternoon({ ...form, classId });
      setForm({ dayOfWeek: 0, name: '', color: AFTERNOON_COLORS[0], startTime: '14:00', endTime: '15:00' });
      setShowForm(false);
      api.getAfternoonForClass(classId).then(setEntries);
      onRefresh();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Ali ste prepričani?')) {
      await api.deleteAfternoon(id);
      api.getAfternoonForClass(classId).then(setEntries);
      onRefresh();
    }
  };

  const DAYS = ['Ponedeljek', 'Torek', 'Sreda', 'Četrtek', 'Petek'];

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">🌤️ Popoldanske dejavnosti</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Dodaj
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4 border-l-4 border-emerald-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ime dejavnosti</label>
              <input
                placeholder="npr. Trening košarke"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dan</label>
              <select
                value={form.dayOfWeek}
                onChange={e => setForm({ ...form, dayOfWeek: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Od</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={e => setForm({ ...form, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Do</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={e => setForm({ ...form, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-gray-500">Barva:</span>
            <div className="flex gap-1">
              {AFTERNOON_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-6 h-6 rounded-full transition ${form.color === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleCreate} disabled={saving} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition flex items-center gap-1 disabled:opacity-50">
              <Save className="w-4 h-4" /> Shrani
            </button>
            <button onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition flex items-center gap-1">
              <X className="w-4 h-4" /> Prekliči
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400 text-sm">
          Ni popoldanskih dejavnosti. Kliknite "Dodaj" za vnos.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-emerald-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">Dejavnost</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">Dan</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">Čas</th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="font-medium text-gray-800 text-sm">{entry.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">{DAYS[entry.dayOfWeek]}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 font-mono">{entry.startTime} – {entry.endTime}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleDelete(entry.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
