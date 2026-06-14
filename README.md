# 🏫 Šolski Urnik

Sistem za upravljanje šolskega urnika z Docker podporo, Express.js API backendom in PostgreSQL bazo.

## ✨ Funkcionalnosti

- ✅ **Prijavni obrazec** — prijava z uporabniškim imenom in geslom (JWT avtentikacija)
- ✅ **Admin račun** — že kreiran ob inštalaciji (`admin` / `admin123`)
- ✅ **Upravljanje uporabnikov** — kreiranje in brisanje računov (admin, starš)
- ✅ **Upravljanje učencev** — dodajanje, urejanje, brisanje
- ✅ **Upravljanje predmetov** — dodajanje, urejanje, brisanje z barvami
- ✅ **Upravljanje razredov** — kreiranje in brisanje razredov
- ✅ **Tedenski urnik** — datiran koledar s tedni
- ✅ **Šolsko leto** — določanje časovnega razpona
- ✅ **Šolske ure** — prilagodljivi časovni razponi z odmori
- ✅ **Celodnevni dogodki** — športni dan, ekskurzije, ki nadomestijo redni urnik
- ✅ **Starši & Otroci** — povezovanje in odvezovanje
- ✅ **Sprememba imen staršev** — urejanje imen na strani starši
- ✅ **Starš kot admin** — vloga starša je lahko tudi admin
- ✅ **Prikaz urnika** — ob prijavi starša se pokaže urnik otrok

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
git clone <repo-url>
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
| Aplikacija  | http://localhost:8080     |
| API         | http://localhost:8080/api |
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
├── Dockerfile               # Frontend Docker (Nginx)
├── docker/
│   ├── nginx.conf           # Nginx konfiguracija (reverse proxy)
│   └── init.sql             # PostgreSQL inicializacija
├── server/                  # Backend API
│   ├── Dockerfile           # Backend Docker
│   ├── package.json
│   └── src/
│       ├── index.ts         # Express.js server
│       ├── db.ts            # PostgreSQL povezava
│       ├── auth.ts          # JWT avtentikacija
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
│           └── parents.ts
├── src/                     # Frontend
│   ├── App.tsx
│   ├── api.ts               # API client
│   ├── types.ts
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
│       └── SchoolYearPage.tsx
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
| GET/POST/PUT/DELETE | `/api/events` | Upravljanje dogodkov |
| GET/PUT | `/api/school-year` | Šolsko leto |
| POST | `/api/parents/link` | Poveži starša |
| POST | `/api/parents/unlink` | Odveži starša |

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
