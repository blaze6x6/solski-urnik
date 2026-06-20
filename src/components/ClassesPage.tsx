import { useState } from 'react';
import * as api from '../api';
import { useMultipleAsync } from '../hooks/useAsync';
import { SchoolClass, Student } from '../types';
import { ucenecPlural } from '../utils/plural';
import { Plus, Trash2, Edit2, Save, X, School } from 'lucide-react';

export default function ClassesPage() {
  const { data, loading, error, refresh } = useMultipleAsync({
    classes: api.getClasses,
    students: api.getStudents,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', grade: 1 });
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

  const { classes, students } = data;

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.createClass(form);
      setForm({ name: '', grade: 1 });
      setShowForm(false);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      await api.updateClass(id, form);
      setEditingId(null);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Ali ste prepričani? To bo izbrisalo razred, vse učence v njem in njihov urnik.')) {
      await api.deleteClass(id);
      refresh();
    }
  };

  const startEdit = (c: SchoolClass) => {
    setEditingId(c.id);
    setForm({ name: c.name, grade: c.grade });
  };

  const studentsCount = (classId: string) =>
    students?.filter((s: Student) => s.classId === classId).length || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Razredi</h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Dodaj razred
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4 border-l-4 border-green-500">
          <h3 className="font-semibold text-gray-800 mb-3">Nov razred</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Ime razreda (npr. 3.b)"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Razred (1-9)"
              value={form.grade}
              onChange={e => setForm({ ...form, grade: parseInt(e.target.value) || 1 })}
              min={1}
              max={9}
              className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {!classes || classes.length === 0 ? (
          <div className="col-span-full p-10 text-center text-gray-500 bg-white rounded-xl shadow-sm">
            <School className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Ni razredov.</p>
          </div>
        ) : (
          classes.map((c: SchoolClass) => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm p-5">
              {editingId === c.id ? (
                <div className="space-y-2">
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-2 py-1 border rounded"
                  />
                  <input
                    type="number"
                    value={form.grade}
                    onChange={e => setForm({ ...form, grade: parseInt(e.target.value) || 1 })}
                    min={1}
                    max={9}
                    className="w-full px-2 py-1 border rounded"
                  />
                  <div className="flex gap-1">
                    <button onClick={() => handleUpdate(c.id)} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50">
                      <Save className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <span className="text-green-700 font-bold text-lg">{c.grade}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-lg">{c.name}</p>
                      <p className="text-sm text-gray-500">
                        {ucenecPlural(studentsCount(c.id))}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
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
