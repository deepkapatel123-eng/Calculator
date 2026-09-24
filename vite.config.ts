import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function paymentApiDevPlugin(): Plugin {
  const store = new Map<string, any>();

  return {
    name: 'payment-api-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/payments')) {
          return next();
        }

        const parseBody = (callback: (body: any) => void) => {
          let data = '';
          req.on('data', (chunk) => {
            data += chunk;
          });
          req.on('end', () => {
            try {
              callback(data ? JSON.parse(data) : {});
            } catch {
              callback({});
            }
          });
        };

        res.setHeader('Content-Type', 'application/json');

        if (url.startsWith('/api/payments/status/')) {
          const orderId = url.replace('/api/payments/status/', '').split('?')[0];
          const payment = store.get(orderId);
          if (payment) {
            res.end(JSON.stringify({ status: payment.status, payment }));
          } else {
            res.end(JSON.stringify({ status: 'PENDING', message: 'Waiting for payment confirmation' }));
          }
          return;
        }

        if (url.startsWith('/api/payments/check-by-remark')) {
          const parsedUrl = new URL(url, 'http://localhost');
          const remarkQuery = (parsedUrl.searchParams.get('remark') || '').trim().toLowerCase();
          if (!remarkQuery) {
            res.end(JSON.stringify({ status: 'PENDING', message: 'No remark provided' }));
            return;
          }

          const found = Array.from(store.values()).find((p: any) => {
            const note = (p.note || '').toLowerCase();
            const cleanRmk = remarkQuery.replace(/[^a-z0-9]/g, '');
            const cleanNote = note.replace(/[^a-z0-9]/g, '');
            return cleanNote.includes(cleanRmk) || cleanRmk.includes(cleanNote);
          });

          if (found) {
            res.end(JSON.stringify({ status: 'SUCCESS', payment: found }));
          } else {
            res.end(JSON.stringify({ status: 'PENDING', message: 'Waiting for payment with remark' }));
          }
          return;
        }

        if (url === '/api/payments/parse-sms' && req.method === 'POST') {
          parseBody((body) => {
            const { smsText, expectedRemark } = body || {};
            const text = String(smsText || '');
            let amount = 0;
            const amtMatch = text.match(/(?:inr|rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i) ||
              text.match(/(?:credited\s+(?:by|with)?|received)\s*(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
            if (amtMatch && amtMatch[1]) {
              amount = parseFloat(amtMatch[1].replace(/,/g, '')) || 0;
            }
            const utrMatch =
              text.match(/(?:upi(?:\/cr|\/p2a|\/p2m|\/rrn)?\/|ref(?:\.|\s*no\.?)?\s*|utr(?:\s*no\.?)?:?\s*|rrn:?\s*)(\d{12})/i) ||
              text.match(/\b(\d{12})\b/);
            const utr = utrMatch ? utrMatch[1] : `${Math.floor(100000000000 + Math.random() * 900000000000)}`;

            let remark = expectedRemark || '';
            const rmkMatch = text.match(/(?:tn=|remark:?\s*|note:?\s*|ref:?\s*)([A-Za-z0-9_-]+)/i);
            if (rmkMatch && rmkMatch[1]) {
              remark = rmkMatch[1];
            }

            const orderId = `SMS-${Date.now().toString().slice(-6)}`;
            const payment = {
              orderId,
              amount,
              customerName: 'Customer (Bank SMS Verified)',
              utr,
              status: 'SUCCESS',
              timestamp: Date.now(),
              note: remark || expectedRemark,
            };
            store.set(orderId, payment);
            res.end(JSON.stringify({ success: true, payment, matchedRemark: remark }));
          });
          return;
        }

        if (url === '/api/payments/simulate' && req.method === 'POST') {
          parseBody((body) => {
            const { orderId, amount, customerName, utr, note, vpa } = body;
            const payment = {
              orderId: orderId || `GPAY-${Date.now()}`,
              amount: parseFloat(amount) || 0,
              customerName: customerName || 'Google Pay Customer',
              utr: utr || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
              status: 'SUCCESS',
              timestamp: Date.now(),
              note,
              vpa,
            };
            store.set(payment.orderId, payment);
            res.end(JSON.stringify({ success: true, payment }));
          });
          return;
        }

        if (url === '/api/payments/webhook' && req.method === 'POST') {
          parseBody((body) => {
            const orderId = body.orderId || body.merchantTransactionId || body.tr;
            if (orderId) {
              const payment = {
                orderId,
                amount: parseFloat(body.amount || body.am || 0),
                customerName: body.customerName || body.payerName || 'Google Pay Customer',
                utr: body.utr || body.rrn || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
                status: 'SUCCESS',
                timestamp: Date.now(),
                note: body.note || body.tn,
                vpa: body.vpa || body.payerVpa,
              };
              store.set(orderId, payment);
            }
            res.end(JSON.stringify({ status: 'received', orderId }));
          });
          return;
        }

        if (url === '/api/payments/history') {
          const all = Array.from(store.values()).sort((a, b) => b.timestamp - a.timestamp);
          res.end(JSON.stringify({ payments: all }));
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), paymentApiDevPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
