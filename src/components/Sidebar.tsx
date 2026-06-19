import { useState } from 'react';
import { User } from '../types';
import type { Page } from '../types';
import NotificationBell from './NotificationBell';
import {
  Calendar,
  BookOpen,
  GraduationCap,
  LogOut,
  LayoutDashboard,
  UserCog,
  CalendarDays,
  School,
  Link,
  Clock,
  CalendarCheck,
  Menu,
  X,
  StickyNote,
  Bus,
  Mail,
  Award,
} from 'lucide-react';

interface Props {
  user: User;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

const adminMenuItems: { page: Page; label: string; icon: React.ReactNode }[] = [
  { page: 'dashboard', label: 'Nadzorna plošča', icon: <LayoutDashboard className="w-5 h-5" /> },
  { page: 'class-schedule', label: 'Urnik razreda', icon: <Calendar className="w-5 h-5" /> },
  { page: 'events', label: 'Dogodki', icon: <CalendarCheck className="w-5 h-5" /> },
  { page: 'notes', label: 'Beležke', icon: <StickyNote className="w-5 h-5" /> },
  { page: 'grades', label: 'Ocene', icon: <Award className="w-5 h-5" /> },
  { page: 'students', label: 'Učenci', icon: <GraduationCap className="w-5 h-5" /> },
  { page: 'subjects', label: 'Predmeti', icon: <BookOpen className="w-5 h-5" /> },
  { page: 'classes', label: 'Razredi', icon: <School className="w-5 h-5" /> },
  { page: 'users', label: 'Uporabniki', icon: <UserCog className="w-5 h-5" /> },
  { page: 'parents', label: 'Starši & Otroci', icon: <Link className="w-5 h-5" /> },
  { page: 'periods', label: 'Šolske ure', icon: <Clock className="w-5 h-5" /> },
  { page: 'school-year', label: 'Šolsko leto', icon: <CalendarDays className="w-5 h-5" /> },
  { page: 'bus', label: 'Vozni red', icon: <Bus className="w-5 h-5" /> },
  { page: 'email-settings', label: 'Email obvestila', icon: <Mail className="w-5 h-5" /> },
];

const parentMenuItems: { page: Page; label: string; icon: React.ReactNode }[] = [
  { page: 'dashboard', label: 'Urnik otrok', icon: <Calendar className="w-5 h-5" /> },
  { page: 'grades', label: 'Ocene', icon: <Award className="w-5 h-5" /> },
  { page: 'bus', label: 'Vozni red', icon: <Bus className="w-5 h-5" /> },
  { page: 'email-settings', label: 'Email obvestila', icon: <Mail className="w-5 h-5" /> },
];

export default function Sidebar({ user, currentPage, onNavigate, onLogout }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuItems = user.role === 'admin' ? adminMenuItems : parentMenuItems;

  const handleNav = (page: Page) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-blue-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold shrink-0">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold truncate">{user.fullName}</p>
            <p className="text-blue-300 text-xs">
              {user.role === 'admin' ? 'Administrator' : 'Starš'}
            </p>
          </div>
          <NotificationBell />
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map(item => (
          <button
            key={item.page}
            onClick={() => handleNav(item.page)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
              currentPage === item.page
                ? 'bg-blue-700 text-white'
                : 'text-blue-200 hover:bg-blue-700/50 hover:text-white'
            }`}
          >
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-blue-700">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-200 hover:bg-red-600/80 hover:text-white transition"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Odjava</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-blue-800 flex items-center h-14 px-4 shadow-lg">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white p-1.5 rounded-lg hover:bg-blue-700 transition"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <span className="ml-3 text-white font-semibold text-lg">Šolski Urnik</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-64 bg-blue-800 flex flex-col
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
