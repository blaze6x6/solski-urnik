import { useState } from 'react';
import * as api from '../api';
import { useAsync } from '../hooks/useAsync';
import { User } from '../types';
import { Plus, Trash2, Edit2, Save, X, Shield, Users } from 'lucide-react';

export default function UsersPage({ currentUser }: { currentUser: User }) {
  const { data: users, loading, error, refresh } = useAsync(api.getUsers);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ username: '', password: '', fullName: '', role: 'parent' as 'admin' | 'parent' });
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
    if (!form.username.trim() || !form.password.trim() || !form.fullName.trim()) return;
    if (users?.some((u: User) => u.username === form.username)) {
      alert('Uporabniško ime že obstaja!');
      return;
    }
    setSaving(true);
    try {
      await api.createUser(form);
      setForm({ username: '', password: '', fullName: '', role: 'parent' });
      setShowForm(false);
      refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    const existing = users?.find((u: User) => u.username === form.username && u.id !== id);
    if (existing) {
      alert('Uporabniško ime že obstaja!');
      return;
    }
    setSaving(true);
    try {
      const updates: any = { fullName: form.fullName, role: form.role, username: form.username };
      if (form.password.trim()) updates.password = form.password;
      await api.updateUser(id, updates);
      setEditingId(null);
      refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser.id) {
      alert('Ne morete izbrisati svojega računa!');
      return;
    }
    if (confirm('Ali ste prepričani, da želite izbrisati tega uporabnika?')) {
      await api.deleteUser(id);
      refresh();
    }
  };

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setForm({ username: u.username, password: '', fullName: u.fullName, role: u.role });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Uporabniki</h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Dodaj uporabnika
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4 border-l-4 border-orange-500">
          <h3 className="font-semibold text-gray-800 mb-3">Nov uporabnik</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Uporabniško ime"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Geslo"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              placeholder="Polno ime"
              value={form.fullName}
              onChange={e => setForm({ ...form, fullName: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value as 'admin' | 'parent' })}
              className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="parent">Starš</option>
              <option value="admin">Administrator</option>
            </select>
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
        {!users || users.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Ni uporabnikov.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Uporabnik</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Polno ime</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Vloga</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Otroci</th>
                <th className="px-5 py-3 text-right text-sm font-semibold text-gray-600">Dejanja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u: User) => {
                const isEditing = editingId === u.id;
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <input
                          value={form.username}
                          onChange={e => setForm({ ...form, username: e.target.value })}
                          className="px-2 py-1 border rounded w-32"
                        />
                      ) : (
                        <span className="font-medium text-gray-800">{u.username}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <input
                          value={form.fullName}
                          onChange={e => setForm({ ...form, fullName: e.target.value })}
                          className="px-2 py-1 border rounded w-40"
                        />
                      ) : (
                        <span className="text-gray-700">{u.fullName}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <select
                          value={form.role}
                          onChange={e => setForm({ ...form, role: e.target.value as 'admin' | 'parent' })}
                          className="px-2 py-1 border rounded"
                        >
                          <option value="parent">Starš</option>
                          <option value="admin">Administrator</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                          u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {u.role === 'admin' && <Shield className="w-3 h-3" />}
                          {u.role === 'admin' ? 'Admin' : 'Starš'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {u.childrenIds.length || '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleUpdate(u.id)} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => startEdit(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            disabled={u.id === currentUser.id}
                            className={`p-1.5 rounded-lg ${u.id === currentUser.id ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`}
                          >
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
