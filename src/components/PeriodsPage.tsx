import { useState } from 'react';
import * as api from '../api';
import { useAsync } from '../hooks/useAsync';
import { Period } from '../types';
import { Plus, Trash2, Edit2, Save, X, Clock, Coffee } from 'lucide-react';

export default function PeriodsPage() {
  const { data: periods, loading, error, refresh } = useAsync(api.getPeriods);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', startTime: '08:00', endTime: '08:45', isBreak: false });
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
      setForm({ name: '', startTime: '08:00', endTime: '08:45', isBreak: false });
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

  const startEdit = (p: Period) => {
    setEditingId(p.id);
    setForm({ name: p.name, startTime: p.startTime, endTime: p.endTime, isBreak: p.isBreak || false });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Šolske ure</h1>
          <p className="text-gray-500 text-sm mt-1">Določite časovne razpone za ure in odmore (razvrščeni po času)</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setForm({ name: '', startTime: '08:00', endTime: '08:45', isBreak: false });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Dodaj
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4 border-l-4 border-cyan-500">
          <h3 className="font-semibold text-gray-800 mb-3">Nova ura / odmor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ime</label>
              <input
                placeholder="npr. 1. ura ali Odmor"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Začetek</label>
              <input
                type="time"
                value={form.startTime}
                onChange={e => setForm({ ...form, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Konec</label>
              <input
                type="time"
                value={form.endTime}
                onChange={e => setForm({ ...form, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-50">
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
          <div className="flex gap-2 mt-3">
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
        {!periods || periods.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Ni definiranih ur.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Ime</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Začetek</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Konec</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Trajanje</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Tip</th>
                <th className="px-5 py-3 text-right text-sm font-semibold text-gray-600">Dejanja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {periods.map((p: Period) => {
                const isEditing = editingId === p.id;
                const [sh, sm] = p.startTime.split(':').map(Number);
                const [eh, em] = p.endTime.split(':').map(Number);
                const duration = (eh * 60 + em) - (sh * 60 + sm);

                return (
                  <tr key={p.id} className={`hover:bg-gray-50 ${p.isBreak ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <input
                          value={form.name}
                          onChange={e => setForm({ ...form, name: e.target.value })}
                          className="px-2 py-1 border rounded w-32"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          {p.isBreak && <Coffee className="w-4 h-4 text-amber-600" />}
                          <span className={`font-medium ${p.isBreak ? 'text-amber-700' : 'text-gray-800'}`}>{p.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <input
                          type="time"
                          value={form.startTime}
                          onChange={e => setForm({ ...form, startTime: e.target.value })}
                          className="px-2 py-1 border rounded"
                        />
                      ) : (
                        <span className="text-gray-700 font-mono">{p.startTime}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <input
                          type="time"
                          value={form.endTime}
                          onChange={e => setForm({ ...form, endTime: e.target.value })}
                          className="px-2 py-1 border rounded"
                        />
                      ) : (
                        <span className="text-gray-700 font-mono">{p.endTime}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-gray-500">{duration} min</span>
                    </td>
                    <td className="px-5 py-3">
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
                    <td className="px-5 py-3 text-right">
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
        )}
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-xl">
        <p className="text-sm text-blue-700">
          💡 <strong>Namig:</strong> Ure se samodejno razvrstijo po času začetka. 
          Odmori (npr. malica) se prikažejo v urniku, a zanje ni mogoče vnesti predmetov.
        </p>
      </div>
    </div>
  );
}
