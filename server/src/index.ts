import express from 'express';
import cors from 'cors';

import { seedAdmin } from './seed.js';

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import studentsRoutes from './routes/students.js';
import classesRoutes from './routes/classes.js';
import subjectsRoutes from './routes/subjects.js';
import periodsRoutes from './routes/periods.js';
import scheduleRoutes from './routes/schedule.js';
import eventsRoutes from './routes/events.js';
import schoolYearRoutes from './routes/schoolYear.js';
import parentsRoutes from './routes/parents.js';
import notesRoutes from './routes/notes.js';
import afternoonRoutes from './routes/afternoon.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/periods', periodsRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/school-year', schoolYearRoutes);
app.use('/api/parents', parentsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/afternoon', afternoonRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Interna napaka strežnika' });
});

// Start server
async function start() {
  // Wait for DB to be ready (retry connection)
  let retries = 10;
  while (retries > 0) {
    try {
      await seedAdmin();
      break;
    } catch (err) {
      retries--;
      if (retries === 0) {
        console.error('❌ Could not connect to database after 10 retries');
        process.exit(1);
      }
      console.log(`⏳ Waiting for database... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API server running on http://0.0.0.0:${PORT}`);
  });
}

start();
