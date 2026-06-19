[![Slovenščina](https://img.shields.io/badge/lang-SL-green.svg)](README.md)
[![English](https://img.shields.io/badge/lang-EN-blue.svg)](README.en.md)

# 🏫 School Schedule

A school schedule management system with Docker support, Express.js API backend, and PostgreSQL database.

## ✨ Features

- ✅ Login Form — Login with username and password (JWT authentication)
- ✅ Admin Account — Created upon installation (admin / admin123). Delete the default admin account after creating your own/a new one!!!
- ✅ User Management — Create and delete accounts (admin, parent)
- ✅ Student Management — Add, edit, delete
- ✅ Subject Management — Add, edit, delete with colors
- ✅ Class Management — Create and delete classes
- ✅ Weekly Schedule — Dated calendar with weeks
- ✅ School Year — Define time ranges
- ✅ School Periods — Flexible time ranges with breaks
- ✅ Timed Events — Scheduleable events (e.g., tests, sports day, etc.) with recurrence (daily, weekly, monthly)
- ✅ Parents & Children — Linking and unlinking
- ✅ Parent Name Change — Edit names on the parents page
- ✅ Parent as Admin — Parent roles can also be admin
- ✅ Schedule Display — Upon parent login, displays children's schedules
- ✅ 📝 Student Notes — Notes with student details by date
- ✅ 🌅 Afternoon Schedule — Manage afternoon activities by class/student
- ✅ 🚌 Bus Rides — Display bus rides to and from school
- ✅ Email Notifications — Toggle email notifications for added events, announcements, and afternoon activities
- ✅ **Schedule export to PDF** — useful for printing

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Frontend      │────▶│   Nginx         │────▶│   Express.js    │
│   (React)       │     │   (Reverse      │     │   API Backend   │
│                 │     │   Proxy)        │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │                 │
                                                │   PostgreSQL    │
                                                │   Database      │
                                                │                 │
                                                └─────────────────┘
```

## 🚀 Docker Setup

```bash
# Clone the repository
git clone https://github.com/blaze6x6/solski-urnik
cd solski-urnik

# Copy the .env file
cp .env.example .env
# Edit .env and set JWT_SECRET!

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

### Access

| Service     | URL                       |
|-------------|---------------------------|
| Application  | http://localhost:8800     |
| API         | http://localhost:8800/api |
| Adminer (DB) | http://localhost:8081     |
| PostgreSQL  | localhost:5432            |

### Default Login

- **User:** `admin`
- **Password:** `admin123`

## 🔧 Development

### Backend

```bash
cd server
npm install
npm run dev
```

### Frontend

```bash
npm install
npm run dev
```

## 📁 Project Structure

```
├── docker-compose.yml       # Docker Compose configuration
├── docker-compose-dev.yml   # Docker Compose for development
├── Dockerfile               # Frontend Docker (Nginx)
├── index.html               # HTML entry point
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
├── docker/
│   ├── nginx.conf           # Nginx configuration (reverse proxy)
│   └── init.sql             # PostgreSQL initialization
├── server/                  # Backend API
│   ├── Dockerfile           # Backend Docker
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts         # Express.js server
│       ├── db.ts            # PostgreSQL connection
│       ├── auth.ts          # JWT authentication
│       ├── seed.ts          # Seed admin user
│       └── routes/          # API endpoints
│           ├── auth.ts
│           ├── users.ts
│           ├── students.ts
│           ├── classes.ts
│           ├── subjects.ts
│           ├── periods.ts
│           ├── schedule.ts
│           ├── events.ts      
│           ├── schoolYear.ts
│           ├── parents.ts
│           ├── notes.ts      
│           ├── afternoon.ts  
│           └── bus.ts        
├── src/                     # Frontend
│   ├── App.tsx
│   ├── api.ts               # API client
│   ├── types.ts             # TypeScript plugins
│   ├── hooks/
│   │   └── useAsync.ts
│   └── components/
│       ├── LoginPage.tsx
│       ├── Sidebar.tsx
│       ├── Dashboard.tsx
│       ├── ScheduleView.tsx
│       ├── ClassSchedulePage.tsx
│       ├── PeriodsPage.tsx
│       ├── EventsPage.tsx     
│       ├── StudentsPage.tsx
│       ├── SubjectsPage.tsx
│       ├── ClassesPage.tsx
│       ├── UsersPage.tsx
│       ├── ParentsPage.tsx
│       ├── SchoolYearPage.tsx
│       ├── NotesPage.tsx      
│       └── BusPage.tsx        
└── README.md
```

## 🔐 API Endpoints

| Method | Path | Description |
|--------|-----|------|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET/POST/PUT/DELETE | `/api/users` | User management |
| GET/POST/PUT/DELETE | `/api/students` | Student management |
| GET/POST/PUT/DELETE | `/api/classes` | Class management |
| GET/POST/PUT/DELETE | `/api/subjects` | Subject management |
| GET/POST/PUT/DELETE | `/api/periods` | Period management |
| GET/POST/DELETE | `/api/schedule` | Schedule management |
| GET/POST/PUT/DELETE | `/api/events` | Timed event management |
| GET/PUT | `/api/school-year` | School year |
| POST | `/api/parents/link` | Link parent |
| POST | `/api/parents/unlink` | Unlink parent |
| GET/POST/PUT/DELETE | `/api/notes` | Student note management |
| GET/POST/PUT/DELETE | `/api/afternoon` | Afternoon schedule management |
| GET/POST/PUT/DELETE | `/api/bus` | Bus ride management |

## 📋 Data Models

### DayEvent (Timed Events)
```typescript
{
  id: string;
  date: string;              // YYYY-MM-DD (start date for recurring)
  title: string;
  color: string;
  classIds: string[];        // empty = all classes
  startTime: string;         // HH:MM
  endTime: string;           // HH:MM
  recurrence: Recurrence;    // none | daily | weekly | biweekly | triweekly | monthly
}
```

### StudentNote (Student Notes)
```typescript
{
  id: string;
  studentId: string;
  date: string;              // YYYY-MM-DD
  content: string;
  createdAt: string;         // ISO 8601 timestamp
}
```

### AfternoonEntry (Afternoon Schedule)
```typescript
{
  id: string;
  classId: string;
  dayOfWeek: number;         // 0=Monday, 4=Friday
  name: string;
  color: string;
  startTime: string;         // HH:MM
  endTime: string;           // HH:MM
}
```

### BusRide (Bus Rides)
```typescript
{
  id: string;
  direction: 'to_school' | 'from_school';
  departureTime: string;     // HH:MM
  arrivalTime: string;       // HH:MM
  label?: string;            // optional label like "1. vožnja"
}
```

## 🏷️ Traefik Labels (for production)

```yaml
services:
  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.solski-urnik.rule=Host(`urnik.example.com`)"
      - "traefik.http.routers.solski-urnik.entrypoints=websecure"
      - "traefik.http.routers.solski-urnik.tls.certresolver=letsencrypt"
      - "traefik.http.services.solski-urnik.loadbalancer.server.port=80"
```

## 📦 Technologies

### Frontend
- **React 19** — modern frontend library
- **Vite 7** — rapid construction and development
- **TypeScript** — static typing
- **Tailwind CSS 4** — utility-first CSS framework
- **date-fns 4** — date management
- **Lucide React** — icons

### Backend
- **Express.js 4** — minimalist web framework
- **PostgreSQL 15** — relational database
- **JWT** — stateless authentication
- **bcryptjs** — password hashing
- **CORS** — cross-domain access

### DevOps
- **Docker** — containerization
- **Docker Compose** — service orchestration
- **Nginx** — reverse proxy
