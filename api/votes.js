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
      
      // Database mein save karna
      votes.push(newVote);
      await kv.set(KEY, votes);

      // --- TELEGRAM NOTIFICATION LOGIC START ---
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        const tgMessage = `🚨 *New Petition Signature!*\n\n👤 *Name:* ${cleanName}\n💬 *Reason:* ${cleanComment ? cleanComment : 'No reason provided'}\n📊 *Total Signatures:* ${votes.length}`;
        
        try {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: tgMessage,
              parse_mode: 'Markdown'
            })
          });
        } catch (err) {
          console.error("Telegram notification failed:", err);
          // Error ko ignore kar rahe hain taaki agar Telegram down ho toh kam se kam website ka vote fail na ho
        }
      }
      // --- TELEGRAM NOTIFICATION LOGIC END ---

      return res.status(200).json({ ok: true, votes });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
