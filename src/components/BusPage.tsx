import { useState } from 'react';
import * as api from '../api';
import { useAsync } from '../hooks/useAsync';
import { BusRide } from '../types';
import { Plus, Trash2, Edit2, Save, X, ArrowRight } from 'lucide-react';
export default function BusPage() {
  const { data: rides, loading, error, refresh } = useAsync(api.getBusRides);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    direction: 'to_school' as 'to_school' | 'from_school',
    departureTime: '07:00',
    arrivalTime: '07:30',
    label: '',
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
  const toSchool = rides?.filter(r => r.direction === 'to_school') || [];
  const fromSchool = rides?.filter(r => r.direction === 'from_school') || [];
  const handleCreate = async () => {
    if (!form.departureTime || !form.arrivalTime) return;
    setSaving(true);
    try {
      await api.createBusRide({
        direction: form.direction,
        departureTime: form.departureTime,
        arrivalTime: form.arrivalTime,
        label: form.label || undefined,
      });
      setForm({ direction: 'to_school', departureTime: '07:00', arrivalTime: '07:30', label: '' });
      setShowForm(false);
      refresh();
    } finally { setSaving(false); }
  };
  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      await api.updateBusRide(id, {
        direction: form.direction,
        departureTime: form.departureTime,
        arrivalTime: form.arrivalTime,
        label: form.label || undefined,
      });
      setEditingId(null);
      refresh();
    } finally { setSaving(false); }
  };
  const handleDelete = async (id: string) => {
    if (confirm('Ali ste prepričani?')) {
      await api.deleteBusRide(id);
      refresh();
    }
  };
  const startEdit = (ride: BusRide) => {
    setEditingId(ride.id);
    setForm({
      direction: ride.direction,
      departureTime: ride.departureTime,
      arrivalTime: ride.arrivalTime,
      label: ride.label || '',
    });
  };
  const renderRideTable = (rideList: BusRide[], title: string, icon: string, bgColor: string, textColor: string) => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className={`px-4 py-3 ${bgColor} border-b flex items-center gap-2`}>
        <span className="text-lg">{icon}</span>
        <h3 className={`text-sm font-semibold ${textColor}`}>{title}</h3>
        <span className={`text-xs ${textColor} opacity-70`}>({rideList.length} {rideList.length === 1 ? 'vožnja' : rideList.length < 5 ? 'vožnje' : 'voženj'})</span>
      </div>
      {rideList.length === 0 ? (
        <div className="p-6 text-center text-gray-400 text-sm">Ni voženj.</div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">Oznaka</th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">Odhod</th>
              <th className="px-4 py-2 text-center text-sm font-semibold text-gray-400"></th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">Prihod</th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">Trajanje</th>
              <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rideList.map((ride, idx) => {
              const isEditing = editingId === ride.id;
              const [dh, dm] = ride.departureTime.split(':').map(Number);
              const [ah, am] = ride.arrivalTime.split(':').map(Number);
              const duration = (ah * 60 + am) - (dh * 60 + dm);
              return (
                <tr key={ride.id} className="hover:bg-gray-50">
                  {isEditing ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          value={form.label}
                          onChange={e => setForm({ ...form, label: e.target.value })}
                          placeholder={`${idx + 1}. vožnja`}
                          className="px-2 py-1 border rounded w-28"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="time"
                          value={form.departureTime}
                          onChange={e => setForm({ ...form, departureTime: e.target.value })}
                          className="px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <ArrowRight className="w-4 h-4 text-gray-300 mx-auto" />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="time"
                          value={form.arrivalTime}
                          onChange={e => setForm({ ...form, arrivalTime: e.target.value })}
                          className="px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleUpdate(ride.id)} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 text-sm font-medium text-gray-800">
                        {ride.label || `${idx + 1}. vožnja`}
                      </td>
                      <td className="px-4 py-2 text-sm font-mono text-gray-700">{ride.departureTime}</td>
                      <td className="px-4 py-2 text-center">
                        <ArrowRight className="w-4 h-4 text-gray-300 mx-auto" />
                      </td>
                      <td className="px-4 py-2 text-sm font-mono text-gray-700">{ride.arrivalTime}</td>
                      <td className="px-4 py-2 text-sm text-gray-400">{duration > 0 ? `${duration} min` : ''}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => startEdit(ride)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(ride.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Vozni red šolskega avtobusa</h1>
          <p className="text-gray-500 text-sm mt-1">Enak vsak šolski dan</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Dodaj vožnjo
        </button>
      </div>
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4 border-l-4 border-blue-500">
          <h3 className="font-semibold text-gray-800 mb-3">Nova vožnja</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Smer</label>
              <select
                value={form.direction}
                onChange={e => setForm({ ...form, direction: e.target.value as 'to_school' | 'from_school' })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="to_school">🏫 V šolo</option>
                <option value="from_school">🏠 Iz šole</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Odhod</label>
              <input
                type="time"
                value={form.departureTime}
                onChange={e => setForm({ ...form, departureTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prihod</label>
              <input
                type="time"
                value={form.arrivalTime}
                onChange={e => setForm({ ...form, arrivalTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Oznaka (neobvezno)</label>
              <input
                value={form.label}
                onChange={e => setForm({ ...form, label: e.target.value })}
                placeholder="npr. 1. vožnja"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-1 disabled:opacity-50">
                <Save className="w-4 h-4" /> Shrani
              </button>
              <button onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderRideTable(toSchool, 'V šolo', '🏫', 'bg-blue-50', 'text-blue-800')}
        {renderRideTable(fromSchool, 'Iz šole', '🏠', 'bg-green-50', 'text-green-800')}
      </div>
    </div>
  );
}
