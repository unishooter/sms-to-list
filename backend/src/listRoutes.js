const express = require('express');
const { getDb } = require('./db');
const { requireAuth } = require('./authMiddleware');

const router = express.Router();

// All list/item routes require authentication
router.use(requireAuth);

// GET /api/lists
router.get('/lists', (req, res) => {
  const db = getDb();
  // node-sqlite3-wasm: .all() with no params needs an empty array or no arg
  const lists = db.prepare(`
    SELECT
      id, name, display_name, status, created_at, updated_at,
      (SELECT COUNT(*) FROM list_items WHERE list_id = lists.id AND status = 'open') AS open_count
    FROM lists
    ORDER BY updated_at DESC
  `).all([]);
  res.json(lists);
});

// GET /api/lists/:id/items
router.get('/lists/:id/items', (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get([req.params.id]);
  if (!list) return res.status(404).json({ error: 'List not found' });

  const items = db.prepare(`
    SELECT * FROM list_items WHERE list_id = ? ORDER BY created_at DESC
  `).all([req.params.id]);

  res.json({ list, items });
});

// PATCH /api/items/:id/status
router.patch('/items/:id/status', (req, res) => {
  const { status } = req.body;
  const valid = ['open', 'done', 'skipped'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
  }

  const db = getDb();
  const completedAt = status === 'done' ? new Date().toISOString() : null;

  const result = db.prepare(`
    UPDATE list_items
    SET status = ?, updated_at = CURRENT_TIMESTAMP, completed_at = ?
    WHERE id = ?
  `).run([status, completedAt, req.params.id]);

  if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });
  res.json(db.prepare('SELECT * FROM list_items WHERE id = ?').get([req.params.id]));
});

// PATCH /api/items/:id/list  — move item to a different list
router.patch('/items/:id/list', (req, res) => {
  const { listId } = req.body;
  if (!listId) return res.status(400).json({ error: 'listId is required' });

  const db = getDb();
  const list = db.prepare('SELECT id FROM lists WHERE id = ?').get([listId]);
  if (!list) return res.status(404).json({ error: 'Target list not found' });

  const result = db.prepare(`
    UPDATE list_items SET list_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run([listId, req.params.id]);

  if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });
  res.json(db.prepare('SELECT * FROM list_items WHERE id = ?').get([req.params.id]));
});

// PATCH /api/lists/:id/status
router.patch('/lists/:id/status', (req, res) => {
  const { status } = req.body;
  const valid = ['active', 'shopped', 'closed', 'archived'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
  }

  const db = getDb();
  const result = db.prepare(`
    UPDATE lists SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run([status, req.params.id]);

  if (result.changes === 0) return res.status(404).json({ error: 'List not found' });
  res.json(db.prepare('SELECT * FROM lists WHERE id = ?').get([req.params.id]));
});

module.exports = router;
