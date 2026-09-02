import { useState, useRef, useEffect } from 'react';
import * as api from '../api';
import { Period } from '../types';
import { School, Printer, Calendar, Trash2, X, Palette } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

const DAYS = ['Ponedeljek', 'Torek', 'Sreda', 'Četrtek', 'Petek'];

interface ManualItem {
  id: string;
  day: number;
  periodId: string;
  subjectName: string;
  room: string;
  bgColor: string;
  textColor: string;
}

export default function PrintSchedulePage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState(() => localStorage.getItem('print_class_name') || '1. a');
  
  // Barve ozadja posameznega dneva (stolpca)
  const [dayColors, setDayColors] = useState<{ bg: string; text: string }[]>(() => {
    const saved = localStorage.getItem('print_day_colors');
    return saved ? JSON.parse(saved) : [
      { bg: '#DBEAFE', text: '#000000' }, // Ponedeljek
      { bg: '#D1FAE5', text: '#000000' }, // Torek
      { bg: '#FEF3C7', text: '#000000' }, // Sreda
      { bg: '#F3E8FF', text: '#000000' }, // Četrtek
      { bg: '#FFE4E6', text: '#000000' }, // Petek
    ];
  });

  // Ročno vnešeni vnosi urnika glede na periodId
  const [items, setItems] = useState<ManualItem[]>(() => {
    const saved = localStorage.getItem('print_schedule_items');
    return saved ? JSON.parse(saved) : [];
  });

  // Stanje modala za urejanje celice
  const [activeCell, setActiveCell] = useState<{ day: number; periodId: string; periodName: string } | null>(null);
  const [form, setForm] = useState({
    subjectName: '',
    room: '',
    bgColor: '#ffffff',
    textColor: '#000000',
  });

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getPeriods()
      .then(p => {
        setPeriods(p);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem('print_class_name', className);
    localStorage.setItem('print_day_colors', JSON.stringify(dayColors));
    localStorage.setItem('print_schedule_items', JSON.stringify(items));
  }, [className, dayColors, items]);

  const handleCellClick = (day: number, periodId: string, periodName: string) => {
    const existing = items.find(i => i.day === day && i.periodId === periodId);
    setActiveCell({ day, periodId, periodName });
    if (existing) {
      setForm({
        subjectName: existing.subjectName,
        room: existing.room,
        bgColor: existing.bgColor,
        textColor: existing.textColor,
      });
    } else {
      setForm({
        subjectName: '',
        room: '',
        bgColor: dayColors[day].bg,
        textColor: dayColors[day].text,
      });
    }
  };

  const handleSaveItem = () => {
    if (!activeCell || !form.subjectName.trim()) return;
    const { day, periodId } = activeCell;

    const filtered = items.filter(i => !(i.day === day && i.periodId === periodId));
    const newItem: ManualItem = {
      id: `${day}-${periodId}-${Date.now()}`,
      day,
      periodId,
      subjectName: form.subjectName.trim(),
      room: form.room.trim(),
      bgColor: form.bgColor,
      textColor: form.textColor,
    };

    setItems([...filtered, newItem]);
    setActiveCell(null);
  };

  const handleDeleteItem = (day: number, periodId: string) => {
    setItems(items.filter(i => !(i.day === day && i.periodId === periodId)));
    setActiveCell(null);
  };

  const handleExportPDF = async () => {
    const element = printRef.current;
    if (!element) return;

    try {
      const dataUrl = await toPng(element, { quality: 0.95, pixelRatio: 2 });
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const img = new Image();
      img.src = dataUrl;
      
      img.onload = () => {
        const imgHeight = (img.height * pdfWidth) / img.width;
        pdf.addImage(dataUrl, 'PNG', 0, 10, pdfWidth, imgHeight);
        pdf.save(`tiskanje-urnika-${className}.pdf`);
      };
    } catch (error) {
      console.error('Napaka pri generiranju PDF-ja:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Tiskanje urnika (ročni vnosi + sistemske ure)</h1>

      {/* Nadzorna plošča */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6 print:hidden space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-sm">
              <School className="w-6 h-6" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 font-medium">Naziv razreda / osebe</label>
              <input
                type="text"
                value={className}
                onChange={e => setClassName(e.target.value)}
                className="text-lg font-bold text-gray-800 border-b border-gray-300 focus:border-blue-600 outline-none px-1 py-0.5 bg-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm"
            >
              <Printer className="w-4 h-4" /> Izvozi v PDF za tisk
            </button>
          </div>
        </div>

        {/* Nastavitev barv stolpcev */}
        <div className="pt-3 border-t border-gray-100 flex items-center gap-4 flex-wrap">
          <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-blue-600" /> Barve stolpcev (dnevov):
          </span>
          <div className="flex items-center gap-3 flex-wrap">
            {DAYS.map((day, idx) => (
              <div key={idx} className="flex items-center gap-1 text-xs text-gray-600">
                <span>{day}:</span>
                <input
                  type="color"
                  value={dayColors[idx].bg}
                  onChange={e => {
                    const newColors = [...dayColors];
                    newColors[idx] = { ...newColors[idx], bg: e.target.value };
                    setDayColors(newColors);
                  }}
                  className="w-7 h-7 rounded cursor-pointer border border-gray-300 p-0.5 bg-white"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal za vnos */}
      {activeCell && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden" onClick={() => setActiveCell(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-lg">
                Urejanje: {DAYS[activeCell.day]} ({activeCell.periodName})
              </h3>
              <button onClick={() => setActiveCell(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Predmet</label>
                <input
                  type="text"
                  placeholder="npr. Matematika ali MAT"
                  value={form.subjectName}
                  onChange={e => setForm({ ...form, subjectName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Učilnica (opcijsko)</label>
                <input
                  type="text"
                  placeholder="npr. U12"
                  value={form.room}
                  onChange={e => setForm({ ...form, room: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Barva ozadja</label>
                  <input
                    type="color"
                    value={form.bgColor}
                    onChange={e => setForm({ ...form, bgColor: e.target.value })}
                    className="w-full h-10 rounded cursor-pointer border border-gray-300 p-1 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Barva pisave</label>
                  <input
                    type="color"
                    value={form.textColor}
                    onChange={e => setForm({ ...form, textColor: e.target.value })}
                    className="w-full h-10 rounded cursor-pointer border border-gray-300 p-1 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                onClick={handleSaveItem}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-1"
              >
                Shrani
              </button>
              {items.some(i => i.day === activeCell.day && i.periodId === activeCell.periodId) && (
                <button
                  onClick={() => handleDeleteItem(activeCell.day, activeCell.periodId)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 transition flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Izbriši
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prikaz tabele z urami iz baze */}
      <div ref={printRef} className="bg-white rounded-xl shadow-sm overflow-hidden p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-black uppercase tracking-wide">URNIK: {className}</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-center text-sm font-black text-black border border-gray-300 w-32">Ura</th>
                {DAYS.map((day, i) => (
                  <th 
                    key={i} 
                    className="p-3 text-center text-sm font-black text-black border border-gray-300"
                    style={{ backgroundColor: dayColors[i].bg }}
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map(period => (
                <tr key={period.id} className={period.isBreak ? 'bg-amber-50/60' : ''}>
                  <td className="p-2 text-center align-middle border border-gray-300 bg-gray-50">
                    <div className="font-black text-black text-sm">{period.name}</div>
                    <div className="text-xs font-bold text-gray-600">{period.startTime} – {period.endTime}</div>
                  </td>

                  {DAYS.map((_, dayIndex) => {
                      if (period.isBreak) {
                        return (
                          <td key={dayIndex} className="py-1 px-2 text-center border border-gray-300 bg-amber-50/40">
                            <span className="font-bold text-xs text-amber-900">Odmor</span>
                          </td>
                        );
                      }

                      const item = items.find(i => i.day === dayIndex && i.periodId === period.id);

                      return (
                        <td
                          key={dayIndex}
                          onClick={() => handleCellClick(dayIndex, period.id, period.name)}
                          /* Odstranjena fiksna višina h-20, dodan kompakten padding py-1.5 px-2 */
                          className="py-1.5 px-2 border border-gray-300 text-center align-middle cursor-pointer hover:opacity-80 transition"
                          style={{
                            backgroundColor: item ? item.bgColor : dayColors[dayIndex].bg,
                          }}
                        >
                          {item ? (
                            <div className="flex flex-col items-center justify-center leading-tight">
                              <span 
                                className="font-black text-sm"
                                style={{ color: item.textColor }}
                              >
                                {item.subjectName}
                              </span>
                              {item.room && (
                                <span 
                                  className="text-[10px] font-bold mt-0.5 opacity-90 leading-none"
                                  style={{ color: item.textColor }}
                                >
                                  {item.room}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-gray-400 text-[11px] font-medium select-none print:hidden">
                              + vnesi
                            </div>
                          )}
                        </td>
                      );
                    })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
