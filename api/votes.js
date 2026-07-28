// GET /api/votes - returns all votes
// POST /api/votes - adds a new vote { name, comment }
import { kv } from '@vercel/kv';

const KEY = 'crsh-petition-votes';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const votes = (await kv.get(KEY)) || [];
      return res.status(200).json({ votes });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, choice, comment } = req.body || {};

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }
      if (choice !== 'old') {
        return res.status(400).json({ error: 'Invalid choice' });
      }

      const cleanName = name.trim().slice(0, 40);
      const cleanComment = (comment || '').trim().slice(0, 280);

      const votes = (await kv.get(KEY)) || [];
      const newVote = {
        name: cleanName,
        choice: 'old',
        comment: cleanComment,
        ts: Date.now(),
      };
      votes.push(newVote);
      await kv.set(KEY, votes);

      return res.status(200).json({ ok: true, votes });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
