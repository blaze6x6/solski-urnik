import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../api';
import { ScheduleEntry, Period, Subject, DayEvent, AfternoonEntry, SchoolBreak } from '../types';
import { format, startOfWeek, addDays, isWithinInterval, parseISO, addWeeks, subWeeks } from 'date-fns';
import { sl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Star, Coffee, Umbrella, Type, FileDown, X, Clock, MapPin } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { getSlovenianHolidays } from '../holidays';

const DAYS_SHORT = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet'];

interface Props {
  classId: string;
  className?: string;
  title?: string;
}

interface SelectedItemInfo {
  title: string;
  subtitle?: string;
  startTime: string;
  endTime: string;
  room?: string;
  color?: string;
}

export default function ScheduleView({ classId, className, title }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schoolYear, setSchoolYear] = useState({ startDate: '', endDate: '' });
  const [schoolBreaks, setSchoolBreaks] = useState<SchoolBreak[]>([]);
  const [timeEvents, setTimeEvents] = useState<DayEvent[][]>([[], [], [], [], []]);
  const [afternoonEntries, setAfternoonEntries] = useState<AfternoonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [exporting, setExporting] = useState(false);
  
  const [showFullName, setShowFullName] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SelectedItemInfo | null>(null);

  const scheduleRef = useRef<HTMLDivElement>(null);

  const getAdjustedDate = (date: Date) => {
    const day = date.getDay();
    if (day === 6) return addDays(date, 2);
    if (day === 0) return addDays(date, 1);
    return date;
  };

  const weekStart = startOfWeek(getAdjustedDate(currentDate), { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  
  const holidays = useMemo(() => {
    const years = new Set(weekDates.map(d => d.getFullYear()));
    const map = new Map<string, string>();
    years.forEach(y => getSlovenianHolidays(y).forEach((v, k) => map.set(k, v)));
    return map;
  }, [weekStart.toISOString()]);

  const exportPdf = useCallback(async () => {
    const el = scheduleRef.current;
    if (!el || exporting) return;
    setExporting(true);
    try {
      const imgData = await toPng(el, { pixelRatio: 2, backgroundColor: '#f3f4f6' });
      const imgW = el.offsetWidth * 2;
      const imgH = el.offsetHeight * 2;
      const pdf = new jsPDF({
        orientation: imgW > imgH ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;
      const ratio = Math.min(usableW / imgW, usableH / imgH);
      const finalW = imgW * ratio;
      const finalH = imgH * ratio;
      const x = margin + (usableW - finalW) / 2;
      pdf.addImage(imgData, 'PNG', x, margin, finalW, finalH);
      const weekLabel = `${format(weekStart, 'd.M.yyyy')}-${format(addDays(weekStart, 4), 'd.M.yyyy')}`;
      pdf.save(`urnik-${weekLabel}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExporting(false);
    }
  }, [exporting, weekStart]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(timer);
  }, []);

  const getEventLabel = (count: number) => {
    if (count === 1) return 'dogodek';
    if (count === 2) return 'dogodka';
    if (count === 3 || count === 4) return 'dogodki';
    return 'dogodkov';
  };

  useEffect(() => {
    Promise.all([
      api.getPeriods(),
      api.getSubjects(),
      api.getSchoolYear(),
    ]).then(([p, s, y]) => {
      setPeriods(p);
      setSubjects(s);
      setSchoolYear(y);
      setSchoolBreaks(y.breaks || []);
    });
  }, []);

  useEffect(() => {
    if (classId) {
      api.getScheduleForClass(classId).then(setEntries);
      api.getAfternoonForClass(classId).then(setAfternoonEntries);
    }
  }, [classId]);

  const weekKey = format(weekStart, 'yyyy-MM-dd');
  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    Promise.all(
      weekDates.map(date =>
        api.getTimeEventsForClassAndDate(classId, format(date, 'yyyy-MM-dd'))
          .catch(() => [] as DayEvent[])
      )
    ).then(events => {
      setTimeEvents(events);
      setLoading(false);
    }).catch(() => {
      setTimeEvents([[], [], [], [], []]);
      setLoading(false);
    });
  }, [classId, weekKey]);

  const isWeekInSchoolYear = useMemo(() => {
    if (!schoolYear.startDate || !schoolYear.endDate) return true;
    try {
      const start = parseISO(schoolYear.startDate);
      const end = parseISO(schoolYear.endDate);
      return weekDates.some(date => isWithinInterval(date, { start, end }));
    } catch {
      return true;
    }
  }, [weekDates, schoolYear]);

  const isDayInSchoolYear = useMemo(() => {
    if (!schoolYear.startDate || !schoolYear.endDate) return weekDates.map(() => true);
    try {
      const start = parseISO(schoolYear.startDate);
      const end = parseISO(schoolYear.endDate);
      return weekDates.map(date => isWithinInterval(date, { start, end }));
    } catch {
      return weekDates.map(() => true);
    }
  }, [weekDates, schoolYear]);

  const getEntry = (day: number, periodId: string) => {
    return entries.find(e => e.dayOfWeek === day && e.periodId === periodId);
  };

  const getSubject = (id: string) => subjects.find(s => s.id === id);

  const getBreakForDate = (dateStr: string) => {
    return schoolBreaks.find(b => dateStr >= b.startDate && dateStr <= b.endDate);
  };

  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getEventsForPeriod = (day: number, period: Period) => {
    if (!period.startTime || !period.endTime) return [];
    const periodStart = toMinutes(period.startTime);
    const periodEnd = toMinutes(period.endTime);

    return (timeEvents[day] || []).filter(event => {
      if (!event.startTime || !event.endTime) return false;
      const eventStart = toMinutes(event.startTime);
      const eventEnd = toMinutes(event.endTime);
      return eventStart < periodEnd && eventEnd > periodStart;
    });
  };

  const todayStr = format(now, 'yyyy-MM-dd');
  
  const isActivePeriod = (day: number, period: Period): boolean => {
    if (period.isBreak) return false;
    const cellDate = weekDates[day];
    if (!cellDate) return false;
    const isTodayColumn = format(cellDate, 'yyyy-MM-dd') === todayStr;
    if (!isTodayColumn) return false;

    const nowMins = now.getHours() * 60 + now.getMinutes();
    return nowMins >= toMinutes(period.startTime) && nowMins < toMinutes(period.endTime);
  };

  const isPeriodActiveNow = (period: Period): boolean => {
    if (period.isBreak) return false;
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return nowMins >= toMinutes(period.startTime) && nowMins < toMinutes(period.endTime);
  };

  return (
    <div className={className}>
      {title && (
        <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
      )}

      {/* Navigacija tedna */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 bg-white rounded-xl p-4 shadow-sm gap-3">
        <button
          onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 flex-wrap justify-center text-center">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-800 text-sm sm:text-base">
            {format(weekStart, 'd. MMMM', { locale: sl })} – {format(addDays(weekStart, 4), 'd. MMMM yyyy', { locale: sl })}
          </span>
          {!isWeekInSchoolYear && (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full flex items-center gap-1">
              <Umbrella className="w-3 h-3" /> Počitnice
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFullName(!showFullName)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition font-medium ${
              showFullName ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Preklopi med polnimi imeni in kraticami"
          >
            <Type className="w-4 h-4" />
            {showFullName ? 'Polna imena' : 'Kratice'}
          </button>

          <button
            onClick={exportPdf}
            disabled={exporting}
            className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-medium flex items-center gap-1.5 disabled:opacity-50"
            title="Izvozi v PDF"
          >
            {exporting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700"></div>
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            PDF
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition font-medium"
          >
            Danes
          </button>
          <button
            onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Urnik */}
      <div ref={scheduleRef}>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="p-1 sm:p-3 text-center text-[10px] sm:text-sm font-semibold text-gray-600 w-14 sm:w-28 border-b border-r border-blue-100">
                      Ura
                    </th>
                    {weekDates.map((date, i) => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const isToday = dateStr === todayStr;
                      const inSchoolYear = isDayInSchoolYear[i];
                      const events = timeEvents[i] || [];
                      const holiday = holidays.get(dateStr);
                      return (
                        <th
                          key={i}
                          className={`p-1 sm:p-3 text-center text-[11px] sm:text-sm font-semibold border-b border-r border-blue-100 ${
                            isToday ? 'bg-blue-600 text-white' : !inSchoolYear ? 'bg-gray-100 text-gray-400' : 'text-gray-700'
                          }`}
                        >
                          <div>{DAYS_SHORT[i]}</div>
                          <div className={`text-[9px] sm:text-xs ${isToday ? 'text-blue-100' : 'text-gray-400'}`}>
                            {format(date, 'd. M.')}
                          </div>
                          {holiday && (
                            <div className={`mt-0.5 text-[7px] sm:text-[9px] font-bold leading-tight ${isToday ? 'text-red-200' : 'text-red-500'}`}>
                              {holiday}
                            </div>
                          )}
                          {!inSchoolYear && !holiday && (
                            <div className="mt-1 text-[8px] sm:text-[10px] text-gray-400">Počitnice</div>
                          )}
                          {events.length > 0 && inSchoolYear && (
                            <div className={`mt-1 text-[8px] sm:text-[10px] font-medium ${isToday ? 'text-blue-100' : 'text-blue-600'}`}>
                              {events.length} {getEventLabel(events.length)}
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {periods.map(period => {
                    const periodActive = isPeriodActiveNow(period);
                    return (
                      <tr key={period.id} className={period.isBreak ? 'bg-amber-50/50' : 'hover:bg-gray-50'}>
                        <td className={`p-1 text-center border-b border-r border-gray-100 ${periodActive ? 'bg-blue-100' : 'bg-gray-50'}`}>
                          <div className="flex items-center justify-center gap-0.5">
                            {period.isBreak && <Coffee className="w-2.5 h-2.5 text-amber-600" />}
                            {periodActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />}
                            <span className={`text-[10px] sm:text-xs font-bold ${periodActive ? 'text-blue-700' : period.isBreak ? 'text-amber-700' : 'text-gray-700'}`}>
                              {period.name}
                            </span>
                          </div>
                          <div className={`text-[8px] sm:text-[10px] ${periodActive ? 'text-blue-500' : 'text-gray-400'}`}>
                            {period.startTime}–{period.endTime}
                          </div>
                        </td>
                        {[0, 1, 2, 3, 4].map(day => {
                          const dateStr = format(weekDates[day], 'yyyy-MM-dd');
                          const activeBreak = getBreakForDate(dateStr);
                          const inSchoolYear = isDayInSchoolYear[day];
                          const eventsForCell = getEventsForPeriod(day, period);
                          const active = isActivePeriod(day, period);

                          if (activeBreak) {
                            return (
                              <td key={day} className="p-0.5 border-b border-r border-gray-100 bg-amber-50/40">
                                <div className="w-full h-full min-h-[44px] sm:min-h-[52px] bg-amber-100/80 border border-amber-300 rounded-md p-0.5 flex items-center justify-center text-center">
                                  <span className="font-bold text-[10px] sm:text-xs text-amber-900 leading-tight">{activeBreak.name}</span>
                                </div>
                              </td>
                            );
                          }

                          if (!inSchoolYear) {
                            return (
                              <td key={day} className="p-0.5 border-b border-r border-gray-100 bg-gray-50">
                                <div className="min-h-[44px] sm:min-h-[52px]" />
                              </td>
                            );
                          }

                          if (period.isBreak) {
                            return (
                              <td key={day} className="p-0.5 border-b border-r border-gray-100">
                                <div className="min-h-[30px] sm:min-h-[40px] flex items-center justify-center">
                                  <Coffee className="w-3.5 h-3.5 text-amber-300" />
                                </div>
                              </td>
                            );
                          }

                          const entry = getEntry(day, period.id);
                          const subject = entry ? getSubject(entry.subjectId) : null;

                          return (
                            <td 
                              key={day} 
                              className={`p-0.5 border-b border-r border-gray-100 relative ${
                                active ? 'bg-blue-50/40' : ''
                              }`}
                            >
                              {/* Pulzirajoča točka v zgornjem desnem kotu celice */}
                              {active && (
                                <span className="absolute top-1 right-1 flex h-2 w-2 z-20">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                                </span>
                              )}

                              <div className="min-h-[44px] sm:min-h-[52px] space-y-0.5">
                                {eventsForCell.map(event => (
                                  <div
                                    key={event.id}
                                    onClick={() => setSelectedItem({
                                      title: event.title,
                                      startTime: event.startTime,
                                      endTime: event.endTime,
                                      color: event.color
                                    })}
                                    className="w-full rounded-md p-1 text-center flex flex-col justify-center leading-tight cursor-pointer hover:opacity-80 transition overflow-hidden"
                                    style={{ backgroundColor: event.color + '15', borderLeft: `3px solid ${event.color}` }}
                                  >
                                    <Star className="w-2.5 h-2.5 mb-0.5 self-center" style={{ color: event.color }} />
                                    <span className="w-full text-[9px] sm:text-[11px] font-semibold truncate" style={{ color: event.color }}>
                                      {event.title}
                                    </span>
                                    <span className="w-full text-[7px] sm:text-[9px] text-gray-400 leading-none">{event.startTime}–{event.endTime}</span>
                                  </div>
                                ))}
                                {eventsForCell.length === 0 && subject ? (
                                  <div
                                    onClick={() => setSelectedItem({
                                      title: subject.name,
                                      subtitle: `Kratica: ${subject.shortName}`,
                                      startTime: period.startTime,
                                      endTime: period.endTime,
                                      room: entry?.room,
                                      color: subject.color
                                    })}
                                    className="w-full min-h-[44px] sm:min-h-[52px] rounded-md p-0.5 sm:p-1 text-center flex flex-col items-center justify-center cursor-pointer hover:opacity-90 transition relative group leading-tight overflow-hidden"
                                    style={{
                                      backgroundColor: subject.color + '18',
                                      borderLeft: `3px solid ${subject.color}`,
                                    }}
                                  >
                                    <span
                                      className="w-full font-bold text-[10px] sm:text-xs leading-tight truncate px-0.5"
                                      style={{ color: subject.color }}
                                    >
                                      <span className="sm:hidden">{subject.shortName}</span>
                                      <span className="hidden sm:inline">
                                        {showFullName ? subject.name : subject.shortName}
                                      </span>
                                    </span>
                                    {entry?.room && (
                                      <span className="w-full text-[7px] sm:text-[9px] text-gray-400 mt-0.5 leading-none truncate">{entry.room}</span>
                                    )}
                                  </div>
                                ) : eventsForCell.length === 0 ? (
                                  <div className="min-h-[44px] sm:min-h-[52px]" />
                                ) : null}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modalno okno (Popup) ob kliku na predmet */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative space-y-4 border border-gray-100">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-10 rounded-full shrink-0" 
                style={{ backgroundColor: selectedItem.color || '#3B82F6' }} 
              />
              <div>
                <h3 className="text-xl font-bold text-gray-800 leading-snug">
                  {selectedItem.title}
                </h3>
                {selectedItem.subtitle && (
                  <p className="text-xs text-gray-500 mt-0.5">{selectedItem.subtitle}</p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-semibold">Časovni obseg:</span>{' '}
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                  {selectedItem.startTime} – {selectedItem.endTime}
                </span>
              </div>

              {selectedItem.room && (
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">Učilnica / prostor:</span>{' '}
                  <span className="text-gray-600">{selectedItem.room}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedItem(null)}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition"
            >
              Zapri
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
