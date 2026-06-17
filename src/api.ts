import { User, Student, SchoolClass, Subject, ScheduleEntry, SchoolYear, Period, DayEvent, StudentNote, AfternoonEntry, BusRide } from './types';

// @ts-ignore
const API_URL = (import.meta.env?.VITE_API_URL as string) || '/api';

let authToken: string | null = localStorage.getItem('auth_token');

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    authToken = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    window.location.reload();
    throw new Error('Seja je potekla');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Napaka pri zahtevi');
  }

  return res.json();
}

// Auth
export async function login(username: string, password: string): Promise<User> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Napačno uporabniško ime ali geslo');
  }

  const data = await res.json();
  authToken = data.token;
  localStorage.setItem('auth_token', data.token);
  localStorage.setItem('current_user', JSON.stringify(data.user));
  return data.user;
}

export function logout(): void {
  authToken = null;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('current_user');
}

export function getCurrentUser(): User | null {
  const stored = localStorage.getItem('current_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!authToken && !!getCurrentUser();
}

export async function refreshCurrentUser(): Promise<User | null> {
  if (!authToken) return null;
  try {
    const user = await request<User>('/auth/me');
    localStorage.setItem('current_user', JSON.stringify(user));
    return user;
  } catch {
    logout();
    return null;
  }
}

// Users
export async function getUsers(): Promise<User[]> {
  return request<User[]>('/users');
}

export async function createUser(user: Omit<User, 'id' | 'childrenIds'> & { password: string }): Promise<User> {
  return request<User>('/users', {
    method: 'POST',
    body: JSON.stringify(user),
  });
}

export async function updateUser(id: string, updates: Partial<User> & { password?: string }): Promise<User> {
  return request<User>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteUser(id: string): Promise<void> {
  await request(`/users/${id}`, { method: 'DELETE' });
}

// Students
export async function getStudents(): Promise<Student[]> {
  return request<Student[]>('/students');
}

export async function getStudent(id: string): Promise<Student> {
  return request<Student>(`/students/${id}`);
}

export async function createStudent(student: Omit<Student, 'id' | 'parentIds'>): Promise<Student> {
  return request<Student>('/students', {
    method: 'POST',
    body: JSON.stringify(student),
  });
}

export async function updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
  return request<Student>(`/students/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteStudent(id: string): Promise<void> {
  await request(`/students/${id}`, { method: 'DELETE' });
}

// Classes
export async function getClasses(): Promise<SchoolClass[]> {
  return request<SchoolClass[]>('/classes');
}

export async function createClass(cls: Omit<SchoolClass, 'id'>): Promise<SchoolClass> {
  return request<SchoolClass>('/classes', {
    method: 'POST',
    body: JSON.stringify(cls),
  });
}

export async function updateClass(id: string, updates: Partial<SchoolClass>): Promise<SchoolClass> {
  return request<SchoolClass>(`/classes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteClass(id: string): Promise<void> {
  await request(`/classes/${id}`, { method: 'DELETE' });
}

// Subjects
export async function getSubjects(): Promise<Subject[]> {
  return request<Subject[]>('/subjects');
}

export async function createSubject(subject: Omit<Subject, 'id'>): Promise<Subject> {
  return request<Subject>('/subjects', {
    method: 'POST',
    body: JSON.stringify(subject),
  });
}

export async function updateSubject(id: string, updates: Partial<Subject>): Promise<Subject> {
  return request<Subject>(`/subjects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteSubject(id: string): Promise<void> {
  await request(`/subjects/${id}`, { method: 'DELETE' });
}

// Periods
export async function getPeriods(): Promise<Period[]> {
  return request<Period[]>('/periods');
}

export async function createPeriod(period: Omit<Period, 'id'>): Promise<Period> {
  return request<Period>('/periods', {
    method: 'POST',
    body: JSON.stringify(period),
  });
}

export async function updatePeriod(id: string, updates: Partial<Period>): Promise<Period> {
  return request<Period>(`/periods/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deletePeriod(id: string): Promise<void> {
  await request(`/periods/${id}`, { method: 'DELETE' });
}

// Schedule
export async function getScheduleForClass(classId: string): Promise<ScheduleEntry[]> {
  return request<ScheduleEntry[]>(`/schedule/class/${classId}`);
}

export async function setScheduleEntry(entry: Omit<ScheduleEntry, 'id'>): Promise<ScheduleEntry> {
  return request<ScheduleEntry>('/schedule', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

export async function removeScheduleEntry(classId: string, dayOfWeek: number, periodId: string): Promise<void> {
  await request('/schedule', {
    method: 'DELETE',
    body: JSON.stringify({ classId, dayOfWeek, periodId }),
  });
}

// Events
export async function getEvents(): Promise<DayEvent[]> {
  return request<DayEvent[]>('/events');
}

export async function getTimeEventsForClassAndDate(classId: string, date: string): Promise<DayEvent[]> {
  return request<DayEvent[]>(`/events/time-events?classId=${classId}&date=${date}`);
}

export async function createEvent(event: Omit<DayEvent, 'id'>): Promise<DayEvent> {
  return request<DayEvent>('/events', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export async function updateEvent(id: string, updates: Partial<DayEvent>): Promise<DayEvent> {
  return request<DayEvent>(`/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteEvent(id: string): Promise<void> {
  await request(`/events/${id}`, { method: 'DELETE' });
}

// School Year
export async function getSchoolYear(): Promise<SchoolYear> {
  return request<SchoolYear>('/school-year');
}

export async function setSchoolYear(year: SchoolYear): Promise<SchoolYear> {
  return request<SchoolYear>('/school-year', {
    method: 'PUT',
    body: JSON.stringify(year),
  });
}

// Parent-Child linking
export async function linkParentChild(parentId: string, childId: string): Promise<void> {
  await request('/parents/link', {
    method: 'POST',
    body: JSON.stringify({ parentId, childId }),
  });
}

export async function unlinkParentChild(parentId: string, childId: string): Promise<void> {
  await request('/parents/unlink', {
    method: 'POST',
    body: JSON.stringify({ parentId, childId }),
  });
}

// Notes
export async function getNotesForStudent(studentId: string): Promise<StudentNote[]> {
  return request<StudentNote[]>(`/notes/student/${studentId}`);
}

export async function createNote(note: Omit<StudentNote, 'id' | 'createdAt'>): Promise<StudentNote> {
  return request<StudentNote>('/notes', {
    method: 'POST',
    body: JSON.stringify(note),
  });
}

export async function updateNote(id: string, updates: Partial<StudentNote>): Promise<StudentNote> {
  return request<StudentNote>(`/notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteNote(id: string): Promise<void> {
  await request(`/notes/${id}`, { method: 'DELETE' });
}

// Afternoon activities
export async function getAfternoonForClass(classId: string): Promise<AfternoonEntry[]> {
  return request<AfternoonEntry[]>(`/afternoon/class/${classId}`);
}

export async function createAfternoon(entry: Omit<AfternoonEntry, 'id'>): Promise<AfternoonEntry> {
  return request<AfternoonEntry>('/afternoon', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

export async function updateAfternoon(id: string, updates: Partial<AfternoonEntry>): Promise<AfternoonEntry> {
  return request<AfternoonEntry>(`/afternoon/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteAfternoon(id: string): Promise<void> {
  await request(`/afternoon/${id}`, { method: 'DELETE' });
}

export async function getBusRides(): Promise<BusRide[]> {
  return request<BusRide[]>('/bus');
}
export async function createBusRide(ride: Omit<BusRide, 'id'>): Promise<BusRide> {
  return request<BusRide>('/bus', {
    method: 'POST',
    body: JSON.stringify(ride),
  });
}
export async function updateBusRide(id: string, updates: Partial<BusRide>): Promise<BusRide> {
  return request<BusRide>(`/bus/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}
export async function deleteBusRide(id: string): Promise<void> {
  await request(`/bus/${id}`, { method: 'DELETE' });
}
