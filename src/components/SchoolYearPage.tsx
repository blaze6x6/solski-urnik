import { useState, useEffect } from 'react';
import * as api from '../api';
import { CalendarDays, Save, RotateCcw } from 'lucide-react';
import { format, parseISO, differenceInDays, differenceInWeeks } from 'date-fns';
import { sl } from 'date-fns/locale';

export default function SchoolYearPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [originalStartDate, setOriginalStartDate] = useState('');
  const [originalEndDate, setOriginalEndDate] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSchoolYear().then(year => {
      setStartDate(year.startDate);
      setEndDate(year.endDate);
      setOriginalStartDate(year.startDate);
      setOriginalEndDate(year.endDate);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!startDate || !endDate) return;
    if (startDate >= endDate) {
      alert('Datum začetka mora biti pred datumom konca!');
      return;
    }
    setSaving(true);
    try {
      await api.setSchoolYear({ startDate, endDate });
      setOriginalStartDate(startDate);
      setOriginalEndDate(endDate);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStartDate(originalStartDate);
    setEndDate(originalEndDate);
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
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Šolsko leto</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Časovni razpon</h2>
            <p className="text-sm text-gray-500">Določite začetek in konec šolskega leta</p>
          </div>
        </div>

        <div className="space-y-4">
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
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {startDate && endDate && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <span className="font-semibold">Trajanje:</span>{' '}
              {days} dni ({weeks} tednov)
            </p>
            <p className="text-sm text-blue-700 mt-1">
              <span className="font-semibold">Od:</span>{' '}
              {format(parseISO(startDate), 'd. MMMM yyyy', { locale: sl })}
            </p>
            <p className="text-sm text-blue-700">
              <span className="font-semibold">Do:</span>{' '}
              {format(parseISO(endDate), 'd. MMMM yyyy', { locale: sl })}
            </p>
          </div>
        )}

        <div className="flex gap-2 mt-6">
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
            {saved ? 'Shranjeno!' : 'Shrani'}
          </button>
          <button
            onClick={handleReset}
            className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Ponastavi
          </button>
        </div>
      </div>
    </div>
  );
}
