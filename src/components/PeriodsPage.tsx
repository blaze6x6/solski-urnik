import { useState } from 'react';
import * as api from '../api';
import { useAsync } from '../hooks/useAsync';
import { Period } from '../types';
import { Plus, Trash2, Edit2, Save, X, Clock, Coffee, Palette } from 'lucide-react';

const COLOR_PALETTE = [
  '#3B82F6', // Modra
  '#10B981', // Zelena
  '#F59E0B', // Oranžna
  '#EF4444', // Rdeča
  '#8B5CF6', // Vijolična
  '#EC4899', // Roza
  '#6B7280', // Siva
];

export default function PeriodsPage() {
  const { data: periods, loading, error, refresh } = useAsync(api.getPeriods);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    name: '', 
    startTime: '08:00', 
    endTime: '08:45', 
    isBreak: false,
    color: '#3B82F6' 
  });
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

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.createPeriod(form);
      setForm({ name: '', startTime: '08:00', endTime: '08:45', isBreak: false, color: '#3B82F6' });
      setShowForm(false);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      await api.updatePeriod(id, form);
      setEditingId(null);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const period = periods?.find((p: Period) => p.id === id);
    const msg = period?.isBreak 
      ? 'Ali ste prepričani, da želite izbrisati ta odmor?' 
      : 'Ali ste prepričani? To bo izbrisalo tudi vnose urnika za to uro.';
    if (confirm(msg)) {
      await api.deletePeriod(id);
      refresh();
    }
  };

  const startEdit = (p: Period & { color?: string }) => {
    setEditingId(p.id);
    setForm({ 
      name: p.name, 
      startTime: p.startTime, 
      endTime: p.endTime, 
      isBreak: p.isBreak || false,
      color: p.color || '#3B82F6'
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Šolske ure</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">Določite časovne razpone za ure in odmore (razvrščeni po času)</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setForm({ name: '', startTime: '08:00', endTime: '08:45', isBreak: false, color: '#3B82F6' });
          }}
          className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Dodaj
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 mb-4 border-l-4 border-cyan-500">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">Nova ura / odmor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ime</label>
              <input
                placeholder="npr. 1. ura ali Odmor"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Začetek</label>
              <input
                type="time"
                value={form.startTime}
                onChange={e => setForm({ ...form, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Konec</label>
              <input
                type="time"
                value={form.endTime}
                onChange={e => setForm({ ...form, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-100">
                <input
                  type="checkbox"
                  checked={form.isBreak}
                  onChange={e => setForm({ ...form, isBreak: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <Coffee className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-gray-700">Je odmor</span>
              </label>
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1.5 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" /> Barvna označba
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PALETTE.map(col => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setForm({ ...form, color: col })}
                  className={`w-7 h-7 rounded-full transition transform hover:scale-110 ${
                    form.color === col ? 'ring-2 ring-offset-2 ring-blue-600 scale-105' : ''
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={handleCreate} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-1 disabled:opacity-50 text-sm">
              <Save className="w-4 h-4" /> Shrani
            </button>
            <button onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition flex items-center gap-1 text-sm">
              <X className="w-4 h-4" /> Prekliči
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {!periods || periods.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Ni definiranih ur.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-600">Ime</th>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-600">Začetek</th>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-600">Konec</th>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-600">Trajanje</th>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-600">Tip</th>
                  <th className="px-4 py-3 text-right text-xs sm:text-sm font-semibold text-gray-600">Dejanja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {periods.map((p: Period & { color?: string }) => {
                  const isEditing = editingId === p.id;
                  const [sh, sm] = p.startTime.split(':').map(Number);
                  const [eh, em] = p.endTime.split(':').map(Number);
                  const duration = (eh * 60 + em) - (sh * 60 + sm);

                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 ${p.isBreak ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              value={form.name}
                              onChange={e => setForm({ ...form, name: e.target.value })}
                              className="px-2 py-1 border rounded w-28 sm:w-32 text-xs sm:text-sm"
                            />
                            <div className="flex items-center gap-1.5">
                              {COLOR_PALETTE.map(col => (
                                <button
                                  key={col}
                                  type="button"
                                  onClick={() => setForm({ ...form, color: col })}
                                  className={`w-5 h-5 rounded-full ${form.color === col ? 'ring-2 ring-blue-600' : ''}`}
                                  style={{ backgroundColor: col }}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-3 h-3 rounded-full shrink-0" 
                              style={{ backgroundColor: p.color || '#3B82F6' }} 
                            />
                            {p.isBreak && <Coffee className="w-4 h-4 text-amber-600 shrink-0" />}
                            <span className={`text-xs sm:text-sm font-medium ${p.isBreak ? 'text-amber-700' : 'text-gray-800'}`}>{p.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="time"
                            value={form.startTime}
                            onChange={e => setForm({ ...form, startTime: e.target.value })}
                            className="px-2 py-1 border rounded text-xs sm:text-sm"
                          />
                        ) : (
                          <span className="text-gray-700 font-mono text-xs sm:text-sm">{p.startTime}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="time"
                            value={form.endTime}
                            onChange={e => setForm({ ...form, endTime: e.target.value })}
                            className="px-2 py-1 border rounded text-xs sm:text-sm"
                          />
                        ) : (
                          <span className="text-gray-700 font-mono text-xs sm:text-sm">{p.endTime}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs sm:text-sm text-gray-500">{duration} min</span>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.isBreak}
                              onChange={e => setForm({ ...form, isBreak: e.target.checked })}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                            <span className="text-xs">Odmor</span>
                          </label>
                        ) : (
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            p.isBreak 
                              ? 'bg-amber-100 text-amber-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {p.isBreak ? 'Odmor' : 'Ura'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => handleUpdate(p.id)} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => startEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-xl">
        <p className="text-xs sm:text-sm text-blue-700">
          💡 <strong>Namig:</strong> Ure se samodejno razvrstijo po času začetka. 
          Odmori (npr. malica) se prikažejo v urniku, a zanje ni mogoče vnesti predmetov.
        </p>
      </div>
    </div>
  );
}
