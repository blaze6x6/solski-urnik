import { useState, useEffect } from 'react';
import { User, Student, SchoolClass, StudentNote } from '../types';
import * as api from '../api';
import { useMultipleAsync } from '../hooks/useAsync';
import { GraduationCap, Calendar, Clock, StickyNote, ChevronDown, ChevronUp } from 'lucide-react';
import ScheduleView from './ScheduleView';
import { format } from 'date-fns';
import { sl } from 'date-fns/locale';

interface Props {
  user: User;
}

export default function Dashboard({ user }: Props) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      {/* Header with date/time */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Dobrodošli, {user.fullName}
            </h1>
            <p className="text-gray-500 mt-1">
              {user.role === 'admin' ? 'Administrator' : 'Starš'}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="font-medium">
                {format(currentTime, 'EEEE, d. MMMM yyyy', { locale: sl })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 mt-1 justify-end">
              <Clock className="w-5 h-5 text-green-600" />
              <span className="font-mono text-xl font-bold text-gray-800">
                {format(currentTime, 'HH:mm:ss')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Children schedules */}
      <ChildrenSchedules user={user} />
    </div>
  );
}

function ChildrenSchedules({ user }: { user: User }) {
  const { data, loading, error } = useMultipleAsync({
    students: api.getStudents,
    classes: api.getClasses,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-xl">
        Napaka: {error}
      </div>
    );
  }

  const { students, classes } = data;

  // Get children based on user role
  let children: Student[] = [];
  
  if (user.role === 'admin') {
    // Admin sees all students (or can be filtered to specific ones)
    // For a "private" schedule, let's show students linked to admin as parent
    // If no children linked, show all students
    if (user.childrenIds.length > 0) {
      children = user.childrenIds
        .map(id => students?.find((s: Student) => s.id === id))
        .filter(Boolean) as Student[];
    } else {
      // Show all students grouped - or prompt to link children
      children = students || [];
    }
  } else {
    // Parent sees only their children
    children = user.childrenIds
      .map(id => students?.find((s: Student) => s.id === id))
      .filter(Boolean) as Student[];
  }

  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <GraduationCap className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">Ni povezanih otrok</h2>
        <p className="text-gray-500 text-center max-w-md">
          {user.role === 'admin' 
            ? 'Povežite svoj račun z otroki v razdelku "Starši & Otroci" za prikaz njihovih urnikov.'
            : 'Obrnite se na administratorja, da poveže vaš račun z otrokom.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {children.map(child => (
        <ChildScheduleCard 
          key={child.id} 
          child={child} 
          className={classes?.find((c: SchoolClass) => c.id === child.classId)?.name || ''}
        />
      ))}
    </div>
  );
}

function ChildScheduleCard({ child, className }: { child: Student; className: string }) {
  const [expanded, setExpanded] = useState(true);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);

  useEffect(() => {
    api.getNotesForStudent(child.id)
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setNotesLoading(false));
  }, [child.id]);

  // Get recent notes (last 3)
  const recentNotes = notes.slice(0, 3);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Child header */}
      <div 
        className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {child.firstName.charAt(0)}{child.lastName.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-lg">
              {child.firstName} {child.lastName}
            </p>
            <p className="text-sm text-gray-500">Razred: {className}</p>
          </div>
        </div>
        <button className="p-2 hover:bg-white/50 rounded-lg transition">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {expanded && (
        <div className="p-4">
          {/* Recent notes */}
          {!notesLoading && recentNotes.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <StickyNote className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-semibold text-yellow-800">Zadnje beležke</span>
              </div>
              <div className="space-y-2">
                {recentNotes.map(note => (
                  <div key={note.id} className="text-sm">
                    <span className="text-yellow-600 font-medium">
                      {format(new Date(note.date), 'd. M. yyyy')}:
                    </span>{' '}
                    <span className="text-gray-700">{note.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schedule */}
          <ScheduleView 
            classId={child.classId} 
            title=""
          />
        </div>
      )}
    </div>
  );
}
