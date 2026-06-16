import { useState, useEffect } from 'react';
import * as api from '../api';
import { Student, StudentNote, SchoolClass } from '../types';
import { Plus, Trash2, Edit2, Save, X, StickyNote, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { sl } from 'date-fns/locale';

export default function NotesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), content: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getStudents(),
      api.getClasses(),
    ]).then(([s, c]) => {
      setStudents(s);
      setClasses(c);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      setNotesLoading(true);
      api.getNotesForStudent(selectedStudentId)
        .then(setNotes)
        .finally(() => setNotesLoading(false));
    } else {
      setNotes([]);
    }
  }, [selectedStudentId]);

  const handleCreate = async () => {
    if (!form.content.trim() || !selectedStudentId) return;
    setSaving(true);
    try {
      await api.createNote({
        studentId: selectedStudentId,
        date: form.date,
        content: form.content,
      });
      setForm({ date: format(new Date(), 'yyyy-MM-dd'), content: '' });
      setShowForm(false);
      // Refresh notes
      const newNotes = await api.getNotesForStudent(selectedStudentId);
      setNotes(newNotes);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      await api.updateNote(id, { date: form.date, content: form.content });
      setEditingId(null);
      const newNotes = await api.getNotesForStudent(selectedStudentId);
      setNotes(newNotes);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Ali ste prepričani, da želite izbrisati to beležko?')) {
      await api.deleteNote(id);
      const newNotes = await api.getNotesForStudent(selectedStudentId);
      setNotes(newNotes);
    }
  };

  const startEdit = (note: StudentNote) => {
    setEditingId(note.id);
    setForm({ date: note.date, content: note.content });
  };

  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || '';
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Beležke učencev</h1>
          <p className="text-gray-500 text-sm mt-1">Zapiski so vidni povezanim staršem</p>
        </div>
      </div>

      {/* Student selector */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <label className="block text-sm font-medium text-gray-600 mb-2">Izberi učenca</label>
        <select
          value={selectedStudentId}
          onChange={e => { setSelectedStudentId(e.target.value); setShowForm(false); setEditingId(null); }}
          className="w-full max-w-md px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— Izberite učenca —</option>
          {students.map(s => (
            <option key={s.id} value={s.id}>
              {s.firstName} {s.lastName} ({getClassName(s.classId)})
            </option>
          ))}
        </select>
      </div>

      {selectedStudentId && (
        <>
          {/* Student info & add button */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">
                  {selectedStudent?.firstName} {selectedStudent?.lastName}
                </p>
                <p className="text-sm text-gray-500">Razred: {getClassName(selectedStudent?.classId || '')}</p>
              </div>
            </div>
            <button
              onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ date: format(new Date(), 'yyyy-MM-dd'), content: '' }); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Dodaj beležko
            </button>
          </div>

          {/* New note form */}
          {showForm && (
            <div className="bg-white rounded-xl shadow-sm p-5 mb-4 border-l-4 border-yellow-500">
              <h3 className="font-semibold text-gray-800 mb-3">Nova beležka</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Datum</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Vsebina</label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    placeholder="Vpišite beležko..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
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

          {/* Notes list */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {notesLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : notes.length === 0 ? (
              <div className="p-10 text-center text-gray-500">
                <StickyNote className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Ni beležk za tega učenca.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notes.map(note => {
                  const isEditing = editingId === note.id;
                  return (
                    <div key={note.id} className="p-4 hover:bg-gray-50">
                      {isEditing ? (
                        <div className="space-y-3">
                          <input
                            type="date"
                            value={form.date}
                            onChange={e => setForm({ ...form, date: e.target.value })}
                            className="px-3 py-2 border rounded-lg"
                          />
                          <textarea
                            value={form.content}
                            onChange={e => setForm({ ...form, content: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border rounded-lg resize-none"
                          />
                          <div className="flex gap-1">
                            <button onClick={() => handleUpdate(note.id)} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
                              <StickyNote className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">
                                {format(parseISO(note.date), 'EEEE, d. MMMM yyyy', { locale: sl })}
                              </p>
                              <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => startEdit(note)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(note.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
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
        </>
      )}
    </div>
  );
}
