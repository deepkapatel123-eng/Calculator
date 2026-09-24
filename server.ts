import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Never cache index.html, root, or sw.js so users always get the freshest bundle immediately
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html' || req.path === '/sw.js' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// In-memory payment transactions store (can be persisted or queried)
interface ServerPayment {
  orderId: string;
  amount: number;
  customerName: string;
  utr: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  timestamp: number;
  note?: string;
  vpa?: string;
}

const paymentsStore = new Map<string, ServerPayment>();

// Payment endpoints for Google Pay / UPI verification
app.get('/api/payments/status/:orderId', (req, res) => {
  const { orderId } = req.params;
  const payment = paymentsStore.get(orderId);
  if (payment) {
    res.json({ status: payment.status, payment });
  } else {
    res.json({ status: 'PENDING', message: 'Waiting for payment confirmation' });
  }
});

// Automatic check payment by remark / note
app.get('/api/payments/check-by-remark', (req, res) => {
  const remarkQuery = (req.query.remark as string || '').trim().toLowerCase();
  if (!remarkQuery) {
    res.json({ status: 'PENDING', message: 'No remark provided' });
    return;
  }

  // Find payment where note contains the remark or vice-versa
  const found = Array.from(paymentsStore.values()).find((p) => {
    const note = (p.note || '').toLowerCase();
    const cleanRmk = remarkQuery.replace(/[^a-z0-9]/g, '');
    const cleanNote = note.replace(/[^a-z0-9]/g, '');
    return cleanNote.includes(cleanRmk) || cleanRmk.includes(cleanNote);
  });

  if (found) {
    res.json({ status: 'SUCCESS', payment: found });
  } else {
    res.json({ status: 'PENDING', message: 'Waiting for payment with remark' });
  }
});

// Parse SMS & Auto-match remark endpoint
app.post('/api/payments/parse-sms', (req, res) => {
  const { smsText, expectedRemark } = req.body || {};
  if (!smsText) {
    res.status(400).json({ error: 'smsText is required' });
    return;
  }

  const text = String(smsText);
  // Extract amount
  let amount = 0;
  const amtMatch = text.match(/(?:inr|rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i) ||
    text.match(/(?:credited\s+(?:by|with)?|received)\s*(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (amtMatch && amtMatch[1]) {
    amount = parseFloat(amtMatch[1].replace(/,/g, '')) || 0;
  }

  // Extract UTR
  const utrMatch =
    text.match(/(?:upi(?:\/cr|\/p2a|\/p2m|\/rrn)?\/|ref(?:\.|\s*no\.?)?\s*|utr(?:\s*no\.?)?:?\s*|rrn:?\s*)(\d{12})/i) ||
    text.match(/\b(\d{12})\b/);
  const utr = utrMatch ? utrMatch[1] : `${Math.floor(100000000000 + Math.random() * 900000000000)}`;

  // Extract Remark
  let remark = expectedRemark || '';
  const rmkMatch = text.match(/(?:tn=|remark:?\s*|note:?\s*|ref:?\s*)([A-Za-z0-9_-]+)/i);
  if (rmkMatch && rmkMatch[1]) {
    remark = rmkMatch[1];
  }

  const orderId = `SMS-${Date.now().toString().slice(-6)}`;
  const payment: ServerPayment = {
    orderId,
    amount,
    customerName: 'Customer (SMS Verified)',
    utr,
    status: 'SUCCESS',
    timestamp: Date.now(),
    note: remark || expectedRemark,
  };

  paymentsStore.set(orderId, payment);
  res.json({ success: true, payment, matchedRemark: remark });
});

app.post('/api/payments/simulate', (req, res) => {
  const { orderId, amount, customerName, utr, note, vpa } = req.body;
  if (!orderId) {
    res.status(400).json({ error: 'orderId is required' });
    return;
  }
  const payment: ServerPayment = {
    orderId,
    amount: parseFloat(amount) || 0,
    customerName: customerName || 'Google Pay Customer',
    utr: utr || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
    status: 'SUCCESS',
    timestamp: Date.now(),
    note,
    vpa,
  };
  paymentsStore.set(orderId, payment);
  res.json({ success: true, payment });
});

// Google Pay / UPI Webhook endpoint
app.post('/api/payments/webhook', (req, res) => {
  const payload = req.body || {};
  console.log('[Webhook Received]:', payload);
  const orderId = payload.orderId || payload.merchantTransactionId || payload.tr;
  if (orderId) {
    paymentsStore.set(orderId, {
      orderId,
      amount: parseFloat(payload.amount || payload.am || 0),
      customerName: payload.customerName || payload.payerName || 'Google Pay User',
      utr: payload.utr || payload.rrn || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      status: 'SUCCESS',
      timestamp: Date.now(),
      note: payload.note || payload.tn,
      vpa: payload.vpa || payload.payerVpa,
    });
  }
  res.status(200).json({ status: 'received', orderId });
});

app.get('/api/payments/history', (_req, res) => {
  const all = Array.from(paymentsStore.values()).sort((a, b) => b.timestamp - a.timestamp);
  res.json({ payments: all });
});

// Health check endpoints for Cloud Run
app.get(['/api/health', '/_health', '/healthz'], (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Serve static assets from Vite build output
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
}

// Fallback to index.html for SPA routing
app.get('*', (_req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(indexPath);
  } else {
    res.status(200).send('Calculator App is ready');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
