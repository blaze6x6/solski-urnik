import { useState, useCallback, useEffect } from 'react';
import { User, Page } from './types';
import * as api from './api';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StudentsPage from './components/StudentsPage';
import SubjectsPage from './components/SubjectsPage';
import ClassesPage from './components/ClassesPage';
import UsersPage from './components/UsersPage';
import ParentsPage from './components/ParentsPage';
import SchoolYearPage from './components/SchoolYearPage';
import ClassSchedulePage from './components/ClassSchedulePage';
import PeriodsPage from './components/PeriodsPage';
import EventsPage from './components/EventsPage';
import NotesPage from './components/NotesPage';
import BusPage from './components/BusPage';
import EmailSettingsPage from './components/EmailSettingsPage';

export default function App() {
  const [user, setUser] = useState<User | null>(api.getCurrentUser);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verify token on mount
    if (api.isLoggedIn()) {
      api.refreshCurrentUser()
        .then(u => setUser(u))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = useCallback((u: User) => {
    setUser(u);
    setCurrentPage('dashboard');
  }, []);

  const handleLogout = useCallback(() => {
    api.logout();
    setUser(null);
    setCurrentPage('login');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'students':
        return user.role === 'admin' ? <StudentsPage /> : <Dashboard user={user} />;
      case 'subjects':
        return user.role === 'admin' ? <SubjectsPage /> : <Dashboard user={user} />;
      case 'classes':
        return user.role === 'admin' ? <ClassesPage /> : <Dashboard user={user} />;
      case 'users':
        return user.role === 'admin' ? <UsersPage currentUser={user} /> : <Dashboard user={user} />;
      case 'parents':
        return user.role === 'admin' ? <ParentsPage /> : <Dashboard user={user} />;
      case 'school-year':
        return user.role === 'admin' ? <SchoolYearPage /> : <Dashboard user={user} />;
      case 'class-schedule':
        return user.role === 'admin' ? <ClassSchedulePage /> : <Dashboard user={user} />;
      case 'periods':
        return user.role === 'admin' ? <PeriodsPage /> : <Dashboard user={user} />;
      case 'events':
        return user.role === 'admin' ? <EventsPage /> : <Dashboard user={user} />;
      case 'notes':
        return user.role === 'admin' ? <NotesPage /> : <Dashboard user={user} />;
      case 'bus':
        return <BusPage />;
      case 'email-settings':
        return <EmailSettingsPage user={user} />;
      default:
        return <Dashboard user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar
        user={user}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      />
      <main className="pt-14 lg:pt-0 lg:ml-64 min-h-screen">
        <div className="p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {renderPage()}
          </div>
        </div>
      </main>
    </div>
  );
}
