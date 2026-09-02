import { useState, useEffect } from 'react';
import * as api from '../api';
import { CalendarDays, Save, RotateCcw, Plus, Trash2, Umbrella } from 'lucide-react';
import { format, parseISO, differenceInDays, differenceInWeeks } from 'date-fns';
import { sl } from 'date-fns/locale';

interface SchoolBreak {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export default function SchoolYearPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [breaks, setBreaks] = useState<SchoolBreak[]>([]);
  
  // Originalne vrednosti za ponastavitev
  const [originalStartDate, setOriginalStartDate] = useState('');
  const [originalEndDate, setOriginalEndDate] = useState('');
  const [originalBreaks, setOriginalBreaks] = useState<SchoolBreak[]>([]);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Stanje za vnos novih počitnic
  const [newBreakName, setNewBreakName] = useState('');
  const [newBreakStart, setNewBreakStart] = useState('');
  const [newBreakEnd, setNewBreakEnd] = useState('');

  useEffect(() => {
    api.getSchoolYear().then((year: any) => {
      const sDate = year.startDate || '';
      const eDate = year.endDate || '';
      const loadedBreaks = year.breaks || [];

      setStartDate(sDate);
      setEndDate(eDate);
      setBreaks(loadedBreaks);

      setOriginalStartDate(sDate);
      setOriginalEndDate(eDate);
      setOriginalBreaks(loadedBreaks);
      
      setLoading(false);
    });
  }, []);

  const handleAddBreak = () => {
    if (!newBreakName.trim() || !newBreakStart || !newBreakEnd) {
      alert('Prosimo, izpolnite naziv in oba datuma počitnic.');
      return;
    }
    if (newBreakStart > newBreakEnd) {
      alert('Začetni datum počitnic mora biti pred končnim datumom!');
      return;
    }

    const newBreak: SchoolBreak = {
      id: Date.now().toString(),
      name: newBreakName.trim(),
      startDate: newBreakStart,
      endDate: newBreakEnd,
    };

    setBreaks([...breaks, newBreak]);
    setNewBreakName('');
    setNewBreakStart('');
    setNewBreakEnd('');
  };

  const handleDeleteBreak = (id: string) => {
    setBreaks(breaks.filter(b => b.id !== id));
  };

  const handleSave = async () => {
    if (!startDate || !endDate) return;
    if (startDate >= endDate) {
      alert('Datum začetka šolskega leta mora biti pred datumom konca!');
      return;
    }
    setSaving(true);
    try {
      // Posredujemo podatke z vključenimi počitnicami v API
      await api.setSchoolYear({ startDate, endDate, breaks });
      setOriginalStartDate(startDate);
      setOriginalEndDate(endDate);
      setOriginalBreaks(breaks);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStartDate(originalStartDate);
    setEndDate(originalEndDate);
    setBreaks(originalBreaks);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const days = startDate && endDate ? differenceInDays(parseISO(endDate), parseISO(startDate)) : 0;
  const weeks = startDate && endDate ? differenceInWeeks(parseISO(endDate), parseISO(startDate)) : 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800">Šolsko leto in počitnice</h1>

      {/* Osnovni obseg šolskega leta */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Glavni časovni obseg</h2>
            <p className="text-sm text-gray-500">Določite začetek in konec šolskega leta</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Začetek šolskega leta</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Konec šolskega leta</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-4 py-2.5 px-4 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
        </div>

        {startDate && endDate && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <span className="font-semibold">Skupno trajanje:</span> {days} dni ({weeks} tednov)
            </p>
          </div>
        )}
      </div>

      {/* Upravljanje počitnic */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <Umbrella className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Šolski dopusti in počitnice</h2>
            <p className="text-sm text-gray-500">Vnesite obdobja počitnic, ki bodo nadomestila urnik</p>
          </div>
        </div>

        {/* Obrazec za dodajanje novih počitnic */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Naziv počitnic</label>
            <input
              type="text"
              placeholder="npr. Jesenske počitnice"
              value={newBreakName}
              onChange={e => setNewBreakName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Od datuma</label>
              <input
                type="date"
                value={newBreakStart}
                onChange={e => setNewBreakStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Do datuma</label>
              <input
                type="date"
                value={newBreakEnd}
                onChange={e => setNewBreakEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>
          </div>
          <button
            onClick={handleAddBreak}
            className="w-full bg-amber-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Dodaj obdobje počitnic
          </button>
        </div>

        {/* Seznam vnesenih počitnic */}
        {breaks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Ni vnesenih počitnic.</p>
        ) : (
          <div className="space-y-2">
            {breaks.map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-sm">
                <div>
                  <span className="font-bold text-amber-900">{b.name}</span>
                  <div className="text-xs text-amber-700 mt-0.5">
                    {format(parseISO(b.startDate), 'd. MMMM yyyy', { locale: sl })} – {format(parseISO(b.endDate), 'd. MMMM yyyy', { locale: sl })}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteBreak(b.id)}
                  className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition"
                  title="Odstrani"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gumbi za shranjevanje */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-5 py-2.5 rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50 ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Shranjeno!' : 'Shrani spremembe'}
        </button>
        <button
          onClick={handleReset}
          className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Ponastavi
        </button>
      </div>
    </div>
  );
}
