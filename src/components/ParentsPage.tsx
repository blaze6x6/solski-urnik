import { useState } from 'react';
import * as api from '../api';
import { useMultipleAsync } from '../hooks/useAsync';
import { User, Student } from '../types';
import { Link, Unlink, Users, GraduationCap, Edit2, Save, X } from 'lucide-react';

export default function ParentsPage() {
  const { data, loading, error, refresh } = useMultipleAsync({
    users: api.getUsers,
    students: api.getStudents,
  });
  
  const [selectedParent, setSelectedParent] = useState('');
  const [selectedChild, setSelectedChild] = useState('');
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
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

  const { users, students } = data;
  const parents = users?.filter((u: User) => u.role === 'parent' || u.childrenIds.length > 0) || [];

  const handleLink = async () => {
    if (!selectedParent || !selectedChild) return;
    setSaving(true);
    try {
      await api.linkParentChild(selectedParent, selectedChild);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (parentId: string, childId: string) => {
    setSaving(true);
    try {
      await api.unlinkParentChild(parentId, childId);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const startEditName = (user: User) => {
    setEditingParentId(user.id);
    setEditName(user.fullName);
  };

  const saveEditName = async (parentId: string) => {
    if (editName.trim()) {
      setSaving(true);
      try {
        await api.updateUser(parentId, { fullName: editName.trim() });
        refresh();
      } finally {
        setSaving(false);
      }
    }
    setEditingParentId(null);
  };

  const getStudent = (id: string) => students?.find((s: Student) => s.id === id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Starši & Otroci</h1>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border-l-4 border-indigo-500">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Link className="w-5 h-5 text-indigo-600" /> Poveži starša z otrokom
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Starš (uporabnik)</label>
            <select
              value={selectedParent}
              onChange={e => setSelectedParent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Izberite starša...</option>
              {users?.map((u: User) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.username}) — {u.role === 'admin' ? 'Admin' : 'Starš'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Otrok (učenec)</label>
            <select
              value={selectedChild}
              onChange={e => setSelectedChild(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Izberite otroka...</option>
              {students?.map((s: Student) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleLink}
            disabled={!selectedParent || !selectedChild || saving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Link className="w-4 h-4" /> Poveži
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {parents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Ni staršev s povezanimi otroki.</p>
          </div>
        ) : (
          parents.map((parent: User) => (
            <div key={parent.id} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>
                  {editingParentId === parent.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="px-2 py-1 border rounded"
                        autoFocus
                      />
                      <button onClick={() => saveEditName(parent.id)} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingParentId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{parent.fullName}</span>
                        <button onClick={() => startEditName(parent)} className="p-1 text-blue-500 hover:bg-blue-50 rounded">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-xs text-gray-400">@{parent.username} • {parent.role === 'admin' ? 'Admin + Starš' : 'Starš'}</span>
                    </div>
                  )}
                </div>
              </div>

              {parent.childrenIds.length === 0 ? (
                <p className="text-sm text-gray-400 ml-13">Ni povezanih otrok.</p>
              ) : (
                <div className="ml-2 space-y-2">
                  {parent.childrenIds.map(childId => {
                    const child = getStudent(childId);
                    if (!child) return null;
                    return (
                      <div key={childId} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-gray-700">
                            {child.firstName} {child.lastName}
                          </span>
                        </div>
                        <button
                          onClick={() => handleUnlink(parent.id, childId)}
                          disabled={saving}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        >
                          <Unlink className="w-3.5 h-3.5" /> Odveži
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
