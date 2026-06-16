import { useState } from 'react';
import * as api from '../api';
import { useMultipleAsync } from '../hooks/useAsync';
import { Student, SchoolClass, User } from '../types';
import { Plus, Trash2, Edit2, Save, X, GraduationCap, Search } from 'lucide-react';

export default function StudentsPage() {
  const { data, loading, error, refresh } = useMultipleAsync({
    students: api.getStudents,
    classes: api.getClasses,
    users: api.getUsers,
  });
  
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', classId: '' });
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

  const { students, classes, users } = data;

  const filtered = students?.filter((s: Student) =>
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleCreate = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.classId) return;
    setSaving(true);
    try {
      await api.createStudent(form);
      setForm({ firstName: '', lastName: '', classId: classes?.[0]?.id || '' });
      setShowForm(false);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      await api.updateStudent(id, form);
      setEditingId(null);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Ali ste prepričani, da želite izbrisati tega učenca?')) {
      await api.deleteStudent(id);
      refresh();
    }
  };

  const startEdit = (s: Student) => {
    setEditingId(s.id);
    setForm({ firstName: s.firstName, lastName: s.lastName, classId: s.classId });
  };

  const getClass = (id: string) => classes?.find((c: SchoolClass) => c.id === id);
  const getParents = (ids: string[]) => ids.map(id => users?.find((u: User) => u.id === id)).filter(Boolean);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Učenci</h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ firstName: '', lastName: '', classId: classes?.[0]?.id || '' }); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Dodaj učenca
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Išči učence..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4 border-l-4 border-blue-500">
          <h3 className="font-semibold text-gray-800 mb-3">Nov učenec</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              placeholder="Ime"
              value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              placeholder="Priimek"
              value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={form.classId}
              onChange={e => setForm({ ...form, classId: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            >
              {classes?.map((c: SchoolClass) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-1 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Shrani
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Prekliči
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Ni učencev.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Ime in priimek</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Razred</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Starši</th>
                <th className="px-5 py-3 text-right text-sm font-semibold text-gray-600">Dejanja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s: Student) => {
                const cls = getClass(s.classId);
                const parents = getParents(s.parentIds);
                const isEditing = editingId === s.id;

                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <input
                            value={form.firstName}
                            onChange={e => setForm({ ...form, firstName: e.target.value })}
                            className="px-2 py-1 border rounded w-28"
                          />
                          <input
                            value={form.lastName}
                            onChange={e => setForm({ ...form, lastName: e.target.value })}
                            className="px-2 py-1 border rounded w-28"
                          />
                        </div>
                      ) : (
                        <span className="font-medium text-gray-800">{s.firstName} {s.lastName}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <select
                          value={form.classId}
                          onChange={e => setForm({ ...form, classId: e.target.value })}
                          className="px-2 py-1 border rounded"
                        >
                          {classes?.map((c: SchoolClass) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-md font-medium">
                          {cls?.name || '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {parents.length > 0
                        ? parents.map((p: any) => p.fullName).join(', ')
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleUpdate(s.id)} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => startEdit(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
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
    </div>
  );
}
