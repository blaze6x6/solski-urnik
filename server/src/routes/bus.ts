import { Router } from 'express';
import { query, queryOne, execute } from '../db.js';
import { authMiddleware, adminMiddleware } from '../auth.js';
const router = Router();
router.use(authMiddleware);
interface BusRow {
  id: string;
  direction: string;
  departure_time: string | null;
  arrival_time: string | null;
  label: string | null;
}
function mapRide(r: BusRow) {
  return {
    id: r.id,
    direction: r.direction,
    departureTime: r.departure_time?.substring(0, 5) || '',
    arrivalTime: r.arrival_time?.substring(0, 5) || '',
    label: r.label || undefined,
  };
}
// Get all rides
router.get('/', async (_req, res) => {
  try {
    const rows = await query<BusRow>(
      `SELECT id, direction, departure_time::text, arrival_time::text, label
       FROM bus_rides
       ORDER BY direction DESC, departure_time`
    );
    res.json(rows.map(mapRide));
  } catch (error) {
    console.error('Get bus rides error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju voznega reda' });
  }
});
// Create ride (admin)
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { direction, departureTime, arrivalTime, label } = req.body;
    if (!direction || !departureTime || !arrivalTime) {
      return res.status(400).json({ error: 'Smer, odhod in prihod so obvezni' });
    }
    const row = await queryOne<BusRow>(
      `INSERT INTO bus_rides (direction, departure_time, arrival_time, label)
       VALUES ($1, $2, $3, $4)
       RETURNING id, direction, departure_time::text, arrival_time::text, label`,
      [direction, departureTime, arrivalTime, label || null]
    );
    res.status(201).json(mapRide(row!));
  } catch (error) {
    console.error('Create bus ride error:', error);
    res.status(500).json({ error: 'Napaka pri ustvarjanju vožnje' });
  }
});
// Update ride (admin)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { direction, departureTime, arrivalTime, label } = req.body;
    const row = await queryOne<BusRow>(
      `UPDATE bus_rides SET
        direction      = COALESCE($1, direction),
        departure_time = COALESCE($2, departure_time),
        arrival_time   = COALESCE($3, arrival_time),
        label          = $4
       WHERE id = $5
       RETURNING id, direction, departure_time::text, arrival_time::text, label`,
      [direction || null, departureTime || null, arrivalTime || null, label ?? null, id]
    );
    if (!row) return res.status(404).json({ error: 'Vožnja ne obstaja' });
    res.json(mapRide(row));
  } catch (error) {
    console.error('Update bus ride error:', error);
    res.status(500).json({ error: 'Napaka pri posodabljanju vožnje' });
  }
});
// Delete ride (admin)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const count = await execute('DELETE FROM bus_rides WHERE id = $1', [req.params.id]);
    if (count === 0) return res.status(404).json({ error: 'Vožnja ne obstaja' });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete bus ride error:', error);
    res.status(500).json({ error: 'Napaka pri brisanju vožnje' });
  }
});
export default router;
