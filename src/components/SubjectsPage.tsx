import { useState } from 'react';
import * as api from '../api';
import { useAsync } from '../hooks/useAsync';
import { Subject } from '../types';
import { Plus, Trash2, Edit2, Save, X, BookOpen } from 'lucide-react';

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#F97316', '#06B6D4', '#6366F1', '#84CC16',
  '#14B8A6', '#D946EF', '#0EA5E9', '#F43F5E',
];

export default function SubjectsPage() {
  const { data: subjects, loading, error, refresh } = useAsync(api.getSubjects);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', shortName: '', color: COLORS[0] });
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
    if (!form.name.trim() || !form.shortName.trim()) return;
    setSaving(true);
    try {
      await api.createSubject(form);
      setForm({ name: '', shortName: '', color: COLORS[0] });
      setShowForm(false);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      await api.updateSubject(id, form);
      setEditingId(null);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Ali ste prepričani? To bo izbrisalo tudi vnose urnika za ta predmet.')) {
      await api.deleteSubject(id);
      refresh();
    }
  };

  const startEdit = (s: Subject) => {
    setEditingId(s.id);
    setForm({ name: s.name, shortName: s.shortName, color: s.color });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Predmeti</h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Dodaj predmet
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4 border-l-4 border-purple-500">
          <h3 className="font-semibold text-gray-800 mb-3">Nov predmet</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <input
              placeholder="Ime predmeta"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              placeholder="Kratko ime (npr. MAT)"
              value={form.shortName}
              onChange={e => setForm({ ...form, shortName: e.target.value.toUpperCase() })}
              className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={4}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Barva:</span>
              <div className="flex gap-1 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-7 h-7 rounded-full transition ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-1 disabled:opacity-50">
              <Save className="w-4 h-4" /> Shrani
            </button>
            <button onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition flex items-center gap-1">
              <X className="w-4 h-4" /> Prekliči
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {!subjects || subjects.length === 0 ? (
          <div className="col-span-full p-10 text-center text-gray-500 bg-white rounded-xl shadow-sm">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Ni predmetov.</p>
          </div>
        ) : (
          subjects.map((s: Subject) => (
            <div
              key={s.id}
              className="bg-white rounded-xl shadow-sm p-4 border-l-4"
              style={{ borderLeftColor: s.color }}
            >
              {editingId === s.id ? (
                <div className="space-y-2">
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-2 py-1 border rounded"
                  />
                  <input
                    value={form.shortName}
                    onChange={e => setForm({ ...form, shortName: e.target.value.toUpperCase() })}
                    className="w-full px-2 py-1 border rounded"
                    maxLength={4}
                  />
                  <div className="flex gap-1 flex-wrap">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setForm({ ...form, color: c })}
                        className={`w-6 h-6 rounded-full ${form.color === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleUpdate(s.id)} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50">
                      <Save className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: s.color }}
                      >
                        {s.shortName}
                      </span>
                      <span className="font-semibold text-gray-800">{s.name}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
