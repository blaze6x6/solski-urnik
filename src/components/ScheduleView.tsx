import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../api';
import { ScheduleEntry, Period, Subject, DayEvent, AfternoonEntry } from '../types';
import { format, startOfWeek, addDays, isWithinInterval, parseISO, addWeeks, subWeeks } from 'date-fns';
import { sl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Star, Coffee, Umbrella, Type, FileDown } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { getSlovenianHolidays } from '../holidays';

const DAYS_SHORT = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet'];

interface Props {
  classId: string;
  className?: string;
  title?: string;
}

export default function ScheduleView({ classId, className, title }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schoolYear, setSchoolYear] = useState({ startDate: '', endDate: '' });
  const [timeEvents, setTimeEvents] = useState<DayEvent[][]>([[], [], [], [], []]);
  const [afternoonEntries, setAfternoonEntries] = useState<AfternoonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [showFullName, setShowFullName] = useState(() => localStorage.getItem('schedule_showFullName') === 'true');
  const [exporting, setExporting] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  // Holidays for this week
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
      const imgData = await toPng(el, {
        pixelRatio: 2,
        backgroundColor: '#f3f4f6',
      });
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

  // Live clock – update every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Funkcija za pravilno sklanjanje števnikov
  const getEventLabel = (count: number) => {
    if (count === 1) return 'dogodek';
    if (count === 2) return 'dogodka';
    if (count === 3 || count === 4) return 'dogodki';
    return 'dogodkov';
  };

  // Load static data
  useEffect(() => {
    Promise.all([
      api.getPeriods(),
      api.getSubjects(),
      api.getSchoolYear(),
    ]).then(([p, s, y]) => {
      setPeriods(p);
      setSubjects(s);
      setSchoolYear(y);
    });
  }, []);

  // Load schedule + afternoon when classId changes
  useEffect(() => {
    if (classId) {
      api.getScheduleForClass(classId).then(setEntries);
      api.getAfternoonForClass(classId).then(setAfternoonEntries);
    }
  }, [classId]);

  // Load time-specific events for the week
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

  // Check if the entire week is within school year
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

  // Check each day if it's in school year
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

  // Check if a given day + period is the currently active one
  const isActivePeriod = (day: number, period: Period): boolean => {
    if (period.isBreak) return false;
    const todayStr = format(now, 'yyyy-MM-dd');
    const cellDate = weekDates[day];
    if (!cellDate) return false;
    if (format(cellDate, 'yyyy-MM-dd') !== todayStr) return false;
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const start = toMinutes(period.startTime);
    const end = toMinutes(period.endTime);
    return nowMins >= start && nowMins < end;
  };

  return (
    <div className={className}>
      {title && (
        <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
      )}

      {/* Week navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 bg-white rounded-xl p-4 shadow-sm gap-3">
        <button
          onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-800">
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
            onClick={() => {
              const next = !showFullName;
              setShowFullName(next);
              localStorage.setItem('schedule_showFullName', String(next));
            }}
            className={`px-3 py-1.5 text-sm rounded-lg transition font-medium flex items-center gap-1.5 ${
              showFullName ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={showFullName ? 'Prikaži kratice' : 'Prikaži polna imena'}
          >
            <Type className="w-4 h-4" />
            {showFullName ? 'Abc' : 'MAT'}
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

      {/* Printable area */}
      <div ref={scheduleRef}>

        {/* Schedule Grid */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="p-3 text-left text-sm font-semibold text-gray-600 w-28 border-b border-r border-blue-100">
                      Ura
                    </th>
                    {weekDates.map((date, i) => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
                      const inSchoolYear = isDayInSchoolYear[i];
                      const events = timeEvents[i] || [];
                      const holiday = holidays.get(dateStr);
                      return (
                        <th
                          key={i}
                          className={`p-3 text-center text-sm font-semibold border-b border-r border-blue-100 ${
                            isToday ? 'bg-blue-600 text-white' : !inSchoolYear ? 'bg-gray-100 text-gray-400' : 'text-gray-700'
                          }`}
                        >
                          <div>{DAYS_SHORT[i]}</div>
                          <div className={`text-xs ${isToday ? 'text-blue-100' : 'text-gray-400'}`}>
                            {format(date, 'd. M.')}
                          </div>
                          {holiday && (
                            <div className={`mt-0.5 text-[9px] font-bold leading-tight ${isToday ? 'text-red-200' : 'text-red-500'}`}>
                              {holiday}
                            </div>
                          )}
                          {!inSchoolYear && !holiday && (
                            <div className="mt-1 text-[10px] text-gray-400">Počitnice</div>
                          )}
                          {events.length > 0 && inSchoolYear && (
                            <div className={`mt-1 text-[10px] font-medium ${isToday ? 'text-blue-100' : 'text-blue-600'}`}>
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
                    const nowMins = now.getHours() * 60 + now.getMinutes();
                    const periodActive = !period.isBreak
                      && format(now, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                      && nowMins >= toMinutes(period.startTime) && nowMins < toMinutes(period.endTime);

                    return (
                      <tr key={period.id} className={period.isBreak ? 'bg-amber-50/50' : 'hover:bg-gray-50'}>
                        <td className={`p-2 text-center border-b border-r border-gray-100 ${periodActive ? 'bg-blue-100' : 'bg-gray-50'}`}>
                          <div className="flex items-center justify-center gap-1">
                            {period.isBreak && <Coffee className="w-3 h-3 text-amber-600" />}
                            {periodActive && <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />}
                            <span className={`text-xs font-bold ${periodActive ? 'text-blue-700' : period.isBreak ? 'text-amber-700' : 'text-gray-700'}`}>
                              {period.name}
                            </span>
                          </div>
                          <div className={`text-[10px] ${periodActive ? 'text-blue-500' : 'text-gray-400'}`}>
                            {period.startTime} – {period.endTime}
                          </div>
                        </td>
                        {[0, 1, 2, 3, 4].map(day => {
                          const inSchoolYear = isDayInSchoolYear[day];
                          const eventsForCell = getEventsForPeriod(day, period);

                          if (!inSchoolYear) {
                            return (
                              <td key={day} className="p-1 border-b border-r border-gray-100 bg-gray-50">
                                <div className="min-h-[52px]" />
                              </td>
                            );
                          }

                          if (period.isBreak) {
                            return (
                              <td key={day} className="p-1 border-b border-r border-gray-100">
                                <div className="min-h-[40px] flex items-center justify-center">
                                  <Coffee className="w-4 h-4 text-amber-300" />
                                </div>
                              </td>
                            );
                          }

                          const entry = getEntry(day, period.id);
                          const subject = entry ? getSubject(entry.subjectId) : null;
                          const active = isActivePeriod(day, period);

                          return (
                            <td key={day} className={`p-1 border-b border-r border-gray-100 ${active ? 'bg-blue-50/60' : ''}`}>
                              <div className="min-h-[52px] space-y-0.5">
                                {eventsForCell.map(event => (
                                  <div
                                    key={event.id}
                                    className="w-full rounded-lg px-0.5 py-1.5 text-center flex flex-col justify-center leading-tight relative group cursor-default"
                                    style={{ backgroundColor: event.color + '15', borderLeft: `3px solid ${event.color}` }}
                                  >
                                    <Star className="w-3.5 h-3.5 mb-0.5 self-center" style={{ color: event.color }} />
                                    <span className="w-full text-[10px] font-semibold break-words whitespace-normal px-0.5" style={{ color: event.color }}>
                                      {event.title}
                                    </span>
                                    <span className="w-full text-[9px] text-gray-400 leading-none">{event.startTime} – {event.endTime}</span>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                      {event.title} ({event.startTime} – {event.endTime})
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                ))}
                                {eventsForCell.length === 0 && subject ? (
                                  <div
                                    className={`w-full min-h-[52px] rounded-lg px-0.5 py-1.5 text-center flex flex-col items-center justify-center cursor-pointer relative group leading-tight ${
                                      active ? 'ring-2 ring-blue-500 shadow-md shadow-blue-200' : ''
                                    }`}
                                    style={{
                                      backgroundColor: subject.color + '18',
                                      borderLeft: `3px solid ${subject.color}`,
                                    }}
                                  >
                                    {active && (
                                      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-600 animate-pulse"></span>
                                    )}
                                    <span
                                      className={`w-full font-bold break-words whitespace-normal px-0.5 ${showFullName ? 'text-[13px] leading-tight' : 'text-sm leading-tight'}`}
                                      style={{ color: subject.color }}
                                    >
                                      {showFullName ? subject.name : subject.shortName}
                                    </span>
                                    {entry?.room && (
                                      <span className="w-full text-[10px] text-gray-400 mt-0.5 leading-none">{entry.room}</span>
                                    )}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                      {subject.name} ({period.startTime} – {period.endTime})
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                ) : eventsForCell.length === 0 ? (
                                  <div className="min-h-[52px]" />
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

        {/* Afternoon activities */}
        {afternoonEntries.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-4">
            <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
              <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                🌤️ Popoldanske dejavnosti
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-emerald-50/50">
                    <th className="p-3 text-left text-sm font-semibold text-gray-600 w-28 border-b border-r border-emerald-100">
                      Čas
                    </th>
                    {weekDates.map((date, i) => {
                      const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                      const inSchoolYear = isDayInSchoolYear[i];
                      return (
                        <th
                          key={i}
                          className={`p-3 text-center text-sm font-semibold border-b border-r border-emerald-100 ${
                            isToday ? 'bg-emerald-600 text-white' : !inSchoolYear ? 'bg-gray-100 text-gray-400' : 'text-gray-700'
                          }`}
                        >
                          {DAYS_SHORT[i]}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const slots = [...new Set(
                      afternoonEntries.map(e => `${e.startTime}-${e.endTime}`)
                    )].sort().map(s => {
                      const [start, end] = s.split('-');
                      return { startTime: start, endTime: end };
                    });

                    return slots.map(slot => (
                      <tr key={`${slot.startTime}-${slot.endTime}`} className="hover:bg-gray-50">
                        <td className="p-2 text-center border-b border-r border-gray-100 bg-gray-50">
                          <div className="text-xs font-bold text-gray-700">{slot.startTime}</div>
                          <div className="text-[10px] text-gray-400">{slot.endTime}</div>
                        </td>
                        {[0, 1, 2, 3, 4].map(day => {
                          const inSchoolYear = isDayInSchoolYear[day];
                          if (!inSchoolYear) {
                            return (
                              <td key={day} className="p-1 border-b border-r border-gray-100 bg-gray-50">
                                <div className="min-h-[48px]" />
                              </td>
                            );
                          }

                          const dayEntries = afternoonEntries.filter(
                            e => e.dayOfWeek === day && e.startTime === slot.startTime && e.endTime === slot.endTime
                          );

                          return (
                            <td key={day} className="p-1 border-b border-r border-gray-100">
                              {dayEntries.length > 0 ? (
                                <div className="space-y-1">
                                  {dayEntries.map(entry => (
                                    <div
                                      key={entry.id}
                                      className="rounded-lg p-2 text-center min-h-[48px] flex flex-col items-center justify-center relative group cursor-default"
                                      style={{
                                        backgroundColor: entry.color + '18',
                                        borderLeft: `3px solid ${entry.color}`,
                                      }}
                                    >
                                      <span className="font-bold text-xs" style={{ color: entry.color }}>
                                        {entry.name}
                                      </span>
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                        {entry.name} ({entry.startTime}–{entry.endTime})
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="min-h-[48px]" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>{/* end scheduleRef */}
    </div>
  );
}
