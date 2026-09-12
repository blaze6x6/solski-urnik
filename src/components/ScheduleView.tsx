import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../api';
import { ScheduleEntry, Period, Subject, DayEvent, AfternoonEntry, SchoolBreak, SchoolClass, Recurrence } from '../types';
import { format, startOfWeek, addDays, isWithinInterval, parseISO, addWeeks, subWeeks, isWeekend } from 'date-fns';
import { sl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Star, Coffee, Umbrella, Type, FileDown, X, Clock, MapPin, Trash2, RotateCcw, AlertTriangle, Plus, Save } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { getSlovenianHolidays } from '../holidays';

const DAYS_SHORT = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet'];

const EVENT_COLORS = [
  { name: 'Rdeča', value: '#EF4444' },
  { name: 'Oranžna', value: '#F97316' },
  { name: 'Rumena', value: '#F59E0B' },
  { name: 'Zelena', value: '#10B981' },
  { name: 'Modra', value: '#3B82F6' },
  { name: 'Vijolična', value: '#8B5CF6' },
  { name: 'Roza', value: '#EC4899' },
  { name: 'Siva', value: '#6B7280' },
];

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Enkratno' },
  { value: 'range', label: 'Razpon datumov' },
  { value: 'daily', label: 'Vsak dan' },
  { value: 'weekly', label: 'Vsak teden' },
  { value: 'biweekly', label: 'Vsak drugi teden' },
  { value: 'triweekly', label: 'Vsak tretji teden' },
  { value: 'monthly', label: 'Vsak mesec' },
];

interface Props {
  classId: string;
  className?: string;
  title?: string;
}

interface SelectedItemInfo {
  id: string;
  title: string;
  subtitle?: string;
  startTime: string;
  endTime: string;
  room?: string;
  color?: string;
  recurrence?: string;
  dateStr?: string;
  exceptions?: string[];
  isNew?: boolean;
}

export default function ScheduleView({ classId, className, title }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classesList, setClassesList] = useState<SchoolClass[]>([]);
  const [schoolYear, setSchoolYear] = useState({ startDate: '', endDate: '' });
  const [schoolBreaks, setSchoolBreaks] = useState<SchoolBreak[]>([]);
  const [timeEvents, setTimeEvents] = useState<DayEvent[][]>([[], [], [], [], []]);
  const [afternoonEntries, setAfternoonEntries] = useState<AfternoonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [exporting, setExporting] = useState(false);

  const [showFullName, setShowFullName] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SelectedItemInfo | null>(null);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  // Stanje za nov vnos v prazni celici z ročnimi nastavitvami časa
  const [newTitle, setNewTitle] = useState('');
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('09:00');
  const [newColor, setNewColor] = useState(EVENT_COLORS[4].value);
  const [newRecurrence, setNewRecurrence] = useState<Recurrence>('none');
  const [savingNew, setSavingNew] = useState(false);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const scheduleRef = useRef<HTMLDivElement>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) {
      setCurrentDate(addWeeks(currentDate, 1));
    } else if (distance < -minSwipeDistance) {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const getAdjustedDate = (date: Date) => {
    const day = date.getDay();
    if (day === 6) return addDays(date, 2);
    if (day === 0) return addDays(date, 1);
    return date;
  };

  const weekDates = useMemo(() => {
    const adjusted = getAdjustedDate(currentDate);
    const start = startOfWeek(adjusted, { weekStartsOn: 1 });
    return Array.from({ length: 5 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const weekStart = weekDates[0];
  const weekKey = format(weekStart, 'yyyy-MM-dd');

  const holidays = useMemo(() => {
    const years = new Set(weekDates.map(d => d.getFullYear()));
    const map = new Map<string, string>();
    years.forEach(y => getSlovenianHolidays(y).forEach((v, k) => map.set(k, v)));
    return map;
  }, [weekDates]);

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
    if (!classId) return;
    Promise.all([
      api.getPeriods(),
      api.getSubjects(),
      api.getClasses(),
      api.getSchoolYear(),
      api.getScheduleForClass(classId),
      api.getAfternoonForClass(classId),
    ]).then(([p, s, c, y, sched, aft]) => {
      setPeriods(p);
      setSubjects(s);
      setClassesList(c);
      setSchoolYear(y);
      setSchoolBreaks(y.breaks || []);
      setEntries(sched);
      setAfternoonEntries(aft);
    });
  }, [classId]);

  useEffect(() => {
    if (!classId) return;
    let isMounted = true;
    
    Promise.all(
      weekDates.map(date =>
        api.getTimeEventsForClassAndDate(classId, format(date, 'yyyy-MM-dd'))
          .catch(() => [] as DayEvent[])
      )
    ).then(events => {
      if (isMounted) {
        setTimeEvents(events);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setTimeEvents([[], [], [], [], []]);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [classId, weekKey]);

  const handleCancelForDay = async (eventId: string, dateStr: string) => {
    try {
      await api.cancelEventForDate(eventId, dateStr);
      setShowConfirmCancel(false);
      setSelectedItem(null);
      await refreshEvents();
    } catch (err) {
      console.error('Napaka pri odpovedi dogodka:', err);
    }
  };

  const handleRestoreForDay = async (eventId: string, dateStr: string) => {
    try {
      await api.restoreEventForDate(eventId, dateStr);
      setShowConfirmCancel(false);
      setSelectedItem(null);
      await refreshEvents();
    } catch (err) {
      console.error('Napaka pri obnovitvi dogodka:', err);
    }
  };

  const handleCreateNewEvent = async () => {
    if (!selectedItem || !newTitle.trim()) return;
    if (newStartTime >= newEndTime) {
      alert('Ura začetka mora biti pred uro konca.');
      return;
    }
    setSavingNew(true);
    try {
      await api.createEvent({
        date: selectedItem.dateStr!,
        title: newTitle.trim(),
        color: newColor,
        classIds: classId ? [classId] : [],
        startTime: newStartTime,
        endTime: newEndTime,
        recurrence: newRecurrence,
      });
      setSelectedItem(null);
      setNewTitle('');
      await refreshEvents();
    } catch (err) {
      console.error('Napaka pri ustvarjanju dogodka:', err);
    } finally {
      setSavingNew(false);
    }
  };

  const refreshEvents = async () => {
    const events = await Promise.all(
      weekDates.map(date =>
        api.getTimeEventsForClassAndDate(classId, format(date, 'yyyy-MM-dd'))
          .catch(() => [] as DayEvent[])
      )
    );
    setTimeEvents(events);
  };

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

  const getEventsForPeriod = (day: number, period: Period, dateStr: string) => {
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
  const todayIsWeekend = isWeekend(now);

  const isActivePeriod = (day: number, period: Period): boolean => {
    if (todayIsWeekend) return false;
    if (period.isBreak) return false;
    const cellDate = weekDates[day];
    if (!cellDate) return false;
    const isTodayColumn = format(cellDate, 'yyyy-MM-dd') === todayStr;
    if (!isTodayColumn) return false;

    const nowMins = now.getHours() * 60 + now.getMinutes();
    return nowMins >= toMinutes(period.startTime) && nowMins < toMinutes(period.endTime);
  };

  const isPeriodActiveNow = (period: Period): boolean => {
    if (todayIsWeekend) return false;
    if (period.isBreak) return false;
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return nowMins >= toMinutes(period.startTime) && nowMins < toMinutes(period.endTime);
  };

  return (
    <div className={className}>
      {title && (
        <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
      )}

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
          >
            <Type className="w-4 h-4" />
            {showFullName ? 'Polna imena' : 'Kratice'}
          </button>

          <button
            onClick={exportPdf}
            disabled={exporting}
            className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-medium flex items-center gap-1.5 disabled:opacity-50"
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

      <div 
        ref={scheduleRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
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
                      const events = (timeEvents[i] || []).filter(e => !(e.exceptions && e.exceptions.some(ex => {
                        const exDateOnly = ex.length > 10 ? format(parseISO(ex), 'yyyy-MM-dd') : ex;
                        return exDateOnly === dateStr;
                      })));
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
                          const eventsForCell = getEventsForPeriod(day, period, dateStr);
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
                              onClick={() => {
                                if (eventsForCell.length === 0 && !subject) {
                                  setNewTitle('');
                                  setNewStartTime(period.startTime);
                                  setNewEndTime(period.endTime);
                                  setNewColor(EVENT_COLORS[4].value);
                                  setNewRecurrence('none');
                                  setSelectedItem({
                                    id: 'new',
                                    title: 'Nov dogodek',
                                    startTime: period.startTime,
                                    endTime: period.endTime,
                                    dateStr: dateStr,
                                    isNew: true
                                  });
                                }
                              }}
                              className="p-0.5 border-b border-r border-gray-100 relative cursor-pointer hover:bg-blue-50/30 transition"
                            >
                              {active && (
                                <>
                                  <div className="absolute inset-0 bg-blue-100/60 pointer-events-none z-10" />
                                  <span className="absolute top-1 right-1 flex h-2 w-2 z-30">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                                  </span>
                                </>
                              )}

                              <div className="min-h-[44px] sm:min-h-[52px] space-y-0.5 relative z-20">
                                {eventsForCell.map(event => {
                                  const isCancelled = event.exceptions && event.exceptions.some(ex => {
                                    const exDateOnly = ex.length > 10 ? format(parseISO(ex), 'yyyy-MM-dd') : ex;
                                    return exDateOnly === dateStr;
                                  });

                                  return (
                                    <div
                                      key={event.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowConfirmCancel(false);
                                        setSelectedItem({
                                          id: event.id,
                                          title: event.title,
                                          startTime: event.startTime,
                                          endTime: event.endTime,
                                          color: event.color,
                                          recurrence: event.recurrence,
                                          dateStr: dateStr,
                                          exceptions: event.exceptions,
                                          isNew: false
                                        });
                                      }}
                                      className={`w-full rounded-md p-1 text-center flex flex-col justify-center leading-tight cursor-pointer transition overflow-hidden ${isCancelled ? 'opacity-40 bg-gray-200 border-dashed border border-gray-400' : 'hover:opacity-80'}`}
                                      style={{ backgroundColor: isCancelled ? undefined : event.color + '15', borderLeft: `3px solid ${isCancelled ? '#9CA3AF' : event.color}` }}
                                    >
                                      <Star className="w-2.5 h-2.5 mb-0.5 self-center" style={{ color: isCancelled ? '#9CA3AF' : event.color }} />
                                      <span className="w-full text-[9px] sm:text-[11px] font-semibold truncate" style={{ color: isCancelled ? '#4B5563' : event.color }}>
                                        {event.title} {isCancelled && '(Odpovedano)'}
                                      </span>
                                      <span className="w-full text-[7px] sm:text-[9px] text-gray-400 leading-none">{event.startTime}–{event.endTime}</span>
                                    </div>
                                  );
                                })}
                                {eventsForCell.length === 0 && subject ? (
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowConfirmCancel(false);
                                      setSelectedItem({
                                        id: subject.id,
                                        title: subject.name,
                                        subtitle: `Kratica: ${subject.shortName}`,
                                        startTime: period.startTime,
                                        endTime: period.endTime,
                                        room: entry?.room,
                                        color: subject.color,
                                        isNew: false
                                      });
                                    }}
                                    className="w-full min-h-[44px] sm:min-h-[52px] rounded-md p-0.5 sm:p-1 text-center flex flex-col items-center justify-center cursor-pointer hover:opacity-90 transition relative group leading-tight overflow-hidden"
                                    style={{
                                      backgroundColor: subject.color + '18',
                                      borderLeft: `3px solid ${subject.color}`,
                                    }}
                                  >
                                    <span className="w-full font-bold text-[10px] sm:text-xs leading-tight truncate px-0.5" style={{ color: subject.color }}>
                                      {/* Pravilno preklapljanje med kraticami na mobilnih in polnim imenom na namiznih napravah */}
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

      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative space-y-4 border border-gray-100">
            <button
              onClick={() => { setSelectedItem(null); setShowConfirmCancel(false); }}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>

            {selectedItem.isNew ? (
              // Obrazec za hiter dodatek novega dogodka z ročno nastavitvijo časa
              <>
                <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
                  <Plus className="w-5 h-5" /> Nov dogodek ({selectedItem.dateStr})
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Naziv dogodka</label>
                    <input
                      type="text"
                      placeholder="npr. Izlet, Sestanek"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Začetek</label>
                      <input
                        type="time"
                        value={newStartTime}
                        onChange={e => setNewStartTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Konec</label>
                      <input
                        type="time"
                        value={newEndTime}
                        onChange={e => setNewEndTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Ponavljanje</label>
                    <div className="flex gap-1 flex-wrap">
                      {RECURRENCE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setNewRecurrence(opt.value)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                            newRecurrence === opt.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Barva</label>
                    <div className="flex gap-2">
                      {EVENT_COLORS.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setNewColor(c.value)}
                          className={`w-7 h-7 rounded-full transition ${newColor === c.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'}`}
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleCreateNewEvent}
                    disabled={savingNew || !newTitle.trim()}
                    className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-medium hover:bg-green-700 transition flex items-center justify-center gap-1.5 text-sm disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" /> {savingNew ? 'Shranjujem...' : 'Shrani dogodek'}
                  </button>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-300 transition text-sm"
                  >
                    Prekliči
                  </button>
                </div>
              </>
            ) : (
              // Obstoječe modalno okno za prikaz/odpoved/obnovo obstoječega dogodka
              <>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-10 rounded-full shrink-0" style={{ backgroundColor: selectedItem.color || '#3B82F6' }} />
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

                {selectedItem.recurrence && selectedItem.recurrence !== 'none' && selectedItem.dateStr && (() => {
                  const isAlreadyCancelled = selectedItem.exceptions?.some(ex => {
                    const exDateOnly = ex.length > 10 ? format(parseISO(ex), 'yyyy-MM-dd') : ex;
                    return exDateOnly === selectedItem.dateStr;
                  });

                  return (
                    <div>
                      {!showConfirmCancel ? (
                        isAlreadyCancelled ? (
                          <button
                            onClick={() => handleRestoreForDay(selectedItem.id, selectedItem.dateStr!)}
                            className="w-full bg-emerald-50 text-emerald-600 border border-emerald-200 py-2.5 rounded-xl font-medium hover:bg-emerald-100 transition flex items-center justify-center gap-2 text-sm"
                          >
                            <RotateCcw className="w-4 h-4" /> Obnovi dogodek za ta dan ({selectedItem.dateStr})
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowConfirmCancel(true)}
                            className="w-full bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-xl font-medium hover:bg-red-100 transition flex items-center justify-center gap-2 text-sm"
                          >
                            <Trash2 className="w-4 h-4" /> Odpovej dogodek samo za ta dan ({selectedItem.dateStr})
                          </button>
                        )
                      ) : (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-3">
                          <div className="flex items-center gap-2 text-red-700 text-xs font-semibold">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            Ali ste prepričani, da želite odpovedati ta dogodek za datum {selectedItem.dateStr}?
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCancelForDay(selectedItem.id, selectedItem.dateStr!)}
                              className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition text-xs"
                            >
                              Da, odpovej
                            </button>
                            <button
                              onClick={() => setShowConfirmCancel(false)}
                              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition text-xs"
                            >
                              Prekliči
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <button
                  onClick={() => { setSelectedItem(null); setShowConfirmCancel(false); }}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition"
                >
                  Zapri
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
