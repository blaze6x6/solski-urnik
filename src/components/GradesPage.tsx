import { useState, useEffect } from 'react';
import * as api from '../api';
import { User, Student, SchoolClass, Subject, Grade } from '../types';
import { Plus, Trash2, Edit2, Save, X, Award, BookOpen } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { sl } from 'date-fns/locale';
const GRADE_COLORS: Record<number, string> = {
  5: '#10B981',
  4: '#3B82F6',
  3: '#F59E0B',
  2: '#F97316',
  1: '#EF4444',
};
export default function GradesPage({ user }: { user: User }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    subjectId: '',
    grade: 5,
    type: 'written' as 'written' | 'oral',
    date: format(new Date(), 'yyyy-MM-dd'),
    note: '',
  });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    Promise.all([
      api.getStudents(),
      api.getClasses(),
      api.getSubjects(),
    ]).then(([s, c, sub]) => {
      setStudents(s);
      setClasses(c);
      setSubjects(sub);
      // For parents, auto-select first child
      if (user.role === 'parent' && user.childrenIds.length > 0) {
        setSelectedStudentId(user.childrenIds[0]);
      }
      setLoading(false);
    });
  }, []);
  useEffect(() => {
    if (selectedStudentId) {
      setGradesLoading(true);
      api.getGradesForStudent(selectedStudentId)
        .then(setGrades)
        .catch(() => setGrades([]))
        .finally(() => setGradesLoading(false));
    } else {
      setGrades([]);
    }
  }, [selectedStudentId]);
  const isAdmin = user.role === 'admin';
  const visibleStudents = isAdmin
    ? students
    : students.filter(s => user.childrenIds.includes(s.id));
  const handleCreate = async () => {
    if (!form.subjectId || !form.date || !selectedStudentId) return;
    setSaving(true);
    try {
      await api.createGrade({
        studentId: selectedStudentId,
        subjectId: form.subjectId,
        grade: form.grade,
        type: form.type,
        date: form.date,
        note: form.note || undefined,
      });
      setForm({ subjectId: subjects[0]?.id || '', grade: 5, type: 'written', date: format(new Date(), 'yyyy-MM-dd'), note: '' });
      setShowForm(false);
      const newGrades = await api.getGradesForStudent(selectedStudentId);
      setGrades(newGrades);
    } finally { setSaving(false); }
  };
  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      await api.updateGrade(id, {
        subjectId: form.subjectId,
        grade: form.grade,
        type: form.type,
        date: form.date,
        note: form.note || undefined,
      });
      setEditingId(null);
      const newGrades = await api.getGradesForStudent(selectedStudentId);
      setGrades(newGrades);
    } finally { setSaving(false); }
  };
  const handleDelete = async (id: string) => {
    if (confirm('Ali ste prepričani, da želite izbrisati to oceno?')) {
      await api.deleteGrade(id);
      const newGrades = await api.getGradesForStudent(selectedStudentId);
      setGrades(newGrades);
    }
  };
  const startEdit = (g: Grade) => {
    setEditingId(g.id);
    setForm({
      subjectId: g.subjectId,
      grade: g.grade,
      type: g.type,
      date: g.date,
      note: g.note || '',
    });
  };
  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || '';
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || '';
  const getSubjectColor = (id: string) => subjects.find(s => s.id === id)?.color || '#6B7280';
  const selectedStudent = students.find(s => s.id === selectedStudentId);
  // Group grades by subject for summary
  const gradesBySubject = subjects.map(sub => {
    const subGrades = grades.filter(g => g.subjectId === sub.id);
    if (subGrades.length === 0) return null;
    const avg = subGrades.reduce((sum, g) => sum + g.grade, 0) / subGrades.length;
    return { subject: sub, grades: subGrades, average: avg };
  }).filter(Boolean);
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
          <h1 className="text-2xl font-bold text-gray-800">Ocene</h1>
          <p className="text-gray-500 text-sm mt-1">Ocene učencev po predmetih</p>
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
          {visibleStudents.map(s => (
            <option key={s.id} value={s.id}>
              {s.firstName} {s.lastName} ({getClassName(s.classId)})
            </option>
          ))}
        </select>
      </div>
      {selectedStudentId && (
        <>
          {/* Student header + add button */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">
                  {selectedStudent?.firstName} {selectedStudent?.lastName}
                </p>
                <p className="text-sm text-gray-500">Razred: {getClassName(selectedStudent?.classId || '')}</p>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ subjectId: subjects[0]?.id || '', grade: 5, type: 'written', date: format(new Date(), 'yyyy-MM-dd'), note: '' }); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Dodaj oceno
              </button>
            )}
          </div>
          {/* New grade form */}
          {showForm && isAdmin && (
            <div className="bg-white rounded-xl shadow-sm p-5 mb-4 border-l-4 border-purple-500">
              <h3 className="font-semibold text-gray-800 mb-3">Nova ocena</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Predmet</label>
                  <select
                    value={form.subjectId}
                    onChange={e => setForm({ ...form, subjectId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ocena</label>
                  <select
                    value={form.grade}
                    onChange={e => setForm({ ...form, grade: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5 – odlično</option>
                    <option value={4}>4 – prav dobro</option>
                    <option value={3}>3 – dobro</option>
                    <option value={2}>2 – zadostno</option>
                    <option value={1}>1 – nezadostno</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tip</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as 'written' | 'oral' })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="written">✍️ Pisno</option>
                    <option value="oral">🗣️ Ustno</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Datum</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs text-gray-500 mb-1">Opomba (neobvezno)</label>
                <input
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  placeholder="npr. kontrolna naloga, spraševanje"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
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
          {/* Grades summary by subject */}
          {!gradesLoading && gradesBySubject.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              {gradesBySubject.map(item => {
                if (!item) return null;
                return (
                  <div key={item.subject.id} className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.subject.color }} />
                      <span className="text-sm font-medium text-gray-800 truncate">{item.subject.name}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold" style={{ color: GRADE_COLORS[Math.round(item.average)] || '#6B7280' }}>
                        {item.average.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({item.grades.length} {item.grades.length === 1 ? 'ocena' : item.grades.length === 2 ? 'oceni' : item.grades.length <= 4 ? 'ocene' : 'ocen'})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Grades list */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {gradesLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : grades.length === 0 ? (
              <div className="p-10 text-center text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Ni ocen za tega učenca.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Predmet</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Ocena</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Tip</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Datum</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Opomba</th>
                    {isAdmin && <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600 w-20"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {grades.map(g => {
                    const isEditing = editingId === g.id;
                    return (
                      <tr key={g.id} className="hover:bg-gray-50">
                        {isEditing ? (
                          <>
                            <td className="px-4 py-2">
                              <select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })} className="px-2 py-1 border rounded w-full">
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <select value={form.grade} onChange={e => setForm({ ...form, grade: parseInt(e.target.value) })} className="px-2 py-1 border rounded">
                                {[5,4,3,2,1].map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'written' | 'oral' })} className="px-2 py-1 border rounded">
                                <option value="written">Pisno</option>
                                <option value="oral">Ustno</option>
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="px-2 py-1 border rounded" />
                            </td>
                            <td className="px-4 py-2">
                              <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="px-2 py-1 border rounded w-full" />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex justify-end gap-1">
                                <button onClick={() => handleUpdate(g.id)} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"><Save className="w-4 h-4" /></button>
                                <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getSubjectColor(g.subjectId) }} />
                                <span className="text-sm font-medium text-gray-800">{getSubjectName(g.subjectId)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm"
                                style={{ backgroundColor: GRADE_COLORS[g.grade] || '#6B7280' }}
                              >
                                {g.grade}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                g.type === 'written' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {g.type === 'written' ? '✍️ Pisno' : '🗣️ Ustno'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {format(parseISO(g.date), 'd. MMMM yyyy', { locale: sl })}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {g.note || <span className="text-gray-300">—</span>}
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-1">
                                  <button onClick={() => startEdit(g)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                                  <button onClick={() => handleDelete(g.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
