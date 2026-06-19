[![Slovenščina](https://img.shields.io/badge/lang-SL-green.svg)](README.md)
[![English](https://img.shields.io/badge/lang-EN-blue.svg)](README.en.md)

# 🏫 Šolski Urnik

Sistem za upravljanje šolskega urnika z Docker podporo, Express.js API backendom in PostgreSQL bazo.

## ✨ Funkcionalnosti

- ✅ **Prijavni obrazec** — prijava z uporabniškim imenom in geslom (JWT avtentikacija)
- ✅ **Admin račun** — že kreiran ob inštalaciji (`admin` / `admin123`). Izbriši privzeti admin račun po kreiranju svojega/novega!!!
- ✅ **Upravljanje uporabnikov** — kreiranje in brisanje računov (admin, starš)
- ✅ **Upravljanje učencev** — dodajanje, urejanje, brisanje
- ✅ **Upravljanje predmetov** — dodajanje, urejanje, brisanje z barvami
- ✅ **Upravljanje razredov** — kreiranje in brisanje razredov
- ✅ **Tedenski urnik** — datiran koledar s tedni
- ✅ **Šolsko leto** — določanje časovnega razpona
- ✅ **Šolske ure** — prilagodljivi časovni razponi z odmori
- ✅ **Časovno določeni dogodki** — časovno določljivi dogodki (npr. preverjanja, športni dan,...) s ponavljanjem (dnevno, tedensko, mesečno)
- ✅ **Starši & Otroci** — povezovanje in odvezovanje
- ✅ **Sprememba imen staršev** — urejanje imen na strani starši
- ✅ **Starš kot admin** — vloga starša je lahko tudi admin
- ✅ **Prikaz urnika** — ob prijavi starša se pokaže urnik otrok
- ✅ **📝 Beležke učencev** — beležke s podatki o učencih po datumih
- ✅ **🌅 Popoldanski urnik** — upravljanje popoldanskih aktivnosti po razredih/učencih
- ✅ **🚌 Avtobusne vožnje** — prikaz avtobusnih voženj do in od šole
- ✅ **Email obveščanje** — vklop/izklop email obveščanja ob dodanem dogodku, obvestilu in popoldanski dejavnosti
- ✅ **Izvoz urnika v PDF** — urnike se lahko izvozi v PDF, na primer za tiskanje

## 🏗️ Arhitektura

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

## 🚀 Zagon z Docker

```bash
# Kloniraj repozitorij
git clone https://github.com/blaze6x6/solski-urnik
cd solski-urnik

# Kopiraj .env datoteko
cp .env.example .env
# Uredi .env in nastavi JWT_SECRET!

# Zaženi vse storitve
docker-compose up -d

# Preveri status
docker-compose ps
```

### Dostop

| Storitev     | URL                       |
|-------------|---------------------------|
| Aplikacija  | http://localhost:8800     |
| API         | http://localhost:8800/api |
| Adminer (DB) | http://localhost:8081     |
| PostgreSQL  | localhost:5432            |

### Privzeta prijava

- **Uporabnik:** `admin`
- **Geslo:** `admin123`

## 🔧 Razvoj

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

## 📁 Struktura projekta

```
├── docker-compose.yml       # Docker Compose konfiguracija
├── docker-compose-dev.yml   # Docker Compose za razvoj
├── Dockerfile               # Frontend Docker (Nginx)
├── index.html               # HTML vstopna točka
├── vite.config.ts           # Vite konfiguracija
├── tsconfig.json            # TypeScript konfiguracija
├── docker/
│   ├── nginx.conf           # Nginx konfiguracija (reverse proxy)
│   └── init.sql             # PostgreSQL inicializacija
├── server/                  # Backend API
│   ├── Dockerfile           # Backend Docker
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts         # Express.js server
│       ├── db.ts            # PostgreSQL povezava
│       ├── auth.ts          # JWT avtentikacija
│       ├── seed.ts          # Seed admin uporabnika
│       └── routes/          # API endpoints
│           ├── auth.ts
│           ├── users.ts
│           ├── students.ts
│           ├── classes.ts
│           ├── subjects.ts
│           ├── periods.ts
│           ├── schedule.ts
│           ├── events.ts      # ✨ Časovno določeni dogodki
│           ├── schoolYear.ts
│           ├── parents.ts
│           ├── notes.ts       # ✨ Beležke učencev
│           ├── afternoon.ts   # ✨ Popoldanski urnik
│           └── bus.ts         # ✨ Avtobusne vožnje
├── src/                     # Frontend
│   ├── App.tsx
│   ├── api.ts               # API client
│   ├── types.ts             # TypeScript vmesniki
│   ├── hooks/
│   │   └── useAsync.ts
│   └── components/
│       ├── LoginPage.tsx
│       ├── Sidebar.tsx
│       ├── Dashboard.tsx
│       ├── ScheduleView.tsx
│       ├── ClassSchedulePage.tsx
│       ├── PeriodsPage.tsx
│       ├── EventsPage.tsx      # ✨ Časovno določeni dogodki
│       ├── StudentsPage.tsx
│       ├── SubjectsPage.tsx
│       ├── ClassesPage.tsx
│       ├── UsersPage.tsx
│       ├── ParentsPage.tsx
│       ├── SchoolYearPage.tsx
│       ├── NotesPage.tsx       # ✨ Beležke učencev
│       └── BusPage.tsx         # ✨ Avtobusne vožnje
└── README.md
```

## 🔐 API Endpoints

| Metoda | Pot | Opis |
|--------|-----|------|
| POST | `/api/auth/login` | Prijava |
| GET | `/api/auth/me` | Trenutni uporabnik |
| GET/POST/PUT/DELETE | `/api/users` | Upravljanje uporabnikov |
| GET/POST/PUT/DELETE | `/api/students` | Upravljanje učencev |
| GET/POST/PUT/DELETE | `/api/classes` | Upravljanje razredov |
| GET/POST/PUT/DELETE | `/api/subjects` | Upravljanje predmetov |
| GET/POST/PUT/DELETE | `/api/periods` | Upravljanje ur |
| GET/POST/DELETE | `/api/schedule` | Upravljanje urnika |
| GET/POST/PUT/DELETE | `/api/events` | Upravljanje časovno določenih dogodkov |
| GET/PUT | `/api/school-year` | Šolsko leto |
| POST | `/api/parents/link` | Poveži starša |
| POST | `/api/parents/unlink` | Odveži starša |
| GET/POST/PUT/DELETE | `/api/notes` | Upravljanje beležk učencev |
| GET/POST/PUT/DELETE | `/api/afternoon` | Upravljanje popoldanskih ur |
| GET/POST/PUT/DELETE | `/api/bus` | Upravljanje avtobusnih voznje |

## 📋 Podatkovni modeli

### DayEvent (Časovno določeni dogodki)
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

### StudentNote (Beležke učencev)
```typescript
{
  id: string;
  studentId: string;
  date: string;              // YYYY-MM-DD
  content: string;
  createdAt: string;         // ISO 8601 timestamp
}
```

### AfternoonEntry (Popoldanski urnik)
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

### BusRide (Avtobusne vožnje)
```typescript
{
  id: string;
  direction: 'to_school' | 'from_school';
  departureTime: string;     // HH:MM
  arrivalTime: string;       // HH:MM
  label?: string;            // optional label like "1. vožnja"
}
```

## 🏷️ Traefik Labels (za produkcijo)

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

## 📦 Tehnologije

### Frontend
- **React 19** — moderna frontend knjižnica
- **Vite 7** — hitra gradnja in razvoj
- **TypeScript** — statična tipizacija
- **Tailwind CSS 4** — utility-first CSS framework
- **date-fns 4** — upravljanje datumov
- **Lucide React** — ikonice

### Backend
- **Express.js 4** — minimalističan web framework
- **PostgreSQL 15** — relacijska baza podatkov
- **JWT** — avtentikacija brez stanja
- **bcryptjs** — heširanje gesel
- **CORS** — dostop med domenami

### DevOps
- **Docker** — kontejnerizacija
- **Docker Compose** — orkestracija storitev
- **Nginx** — reverse proxy
