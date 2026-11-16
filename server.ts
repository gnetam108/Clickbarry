import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProd = process.env.NODE_ENV === 'production';
const PORT = isProd
  ? parseInt(process.env.PORT || '3000', 10)
  : parseInt(
      (process.env.PORT && process.env.PORT !== process.env.NGINX_PORT
        ? process.env.PORT
        : process.env.DEFAULT_APP_PORT) || '3000',
      10
    );

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PayU Configuration
// Uses secure server environment variables; never exposed to frontend client
const PAYU_MERCHANT_KEY = (process.env.PAYU_MERCHANT_KEY || 'TEST_KEY_CLICKBARRY').trim();
const PAYU_MERCHANT_SALT = (process.env.PAYU_MERCHANT_SALT || 'TEST_SALT_CLICKBARRY').trim();
const rawPayuEnv = (process.env.PAYU_ENV || 'TEST')
  .replace(/^PAYU_ENV\s*=\s*/i, '')
  .trim()
  .toUpperCase();
const PAYU_ENV = rawPayuEnv === 'LIVE' || rawPayuEnv === 'PROD' || rawPayuEnv === 'PRODUCTION' ? 'LIVE' : 'TEST';

function sha512(str: string): string {
  return crypto.createHash('sha512').update(str).digest('hex');
}

// -----------------------------------------------------------------------------
// 1. GENERATE PAYU PAYMENT HASH (Initiate Checkout)
// -----------------------------------------------------------------------------
app.post('/api/payu/generate-hash', (req, res) => {
  try {
    const { txnid, amount, productinfo, firstname, email, phone, udf1 } = req.body;

    if (!txnid || !email || !firstname) {
      return res.status(400).json({ success: false, error: 'Missing required checkout parameters' });
    }

    // Business Rule: Lifetime Seller Membership fee is EXACTLY ₹999.00 INR
    const validAmount = '999.00';

    // PayU Hash Format: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
    const hashString = `${PAYU_MERCHANT_KEY}|${txnid}|${validAmount}|${productinfo || 'ClickBarry Lifetime Seller Pass'}|${firstname}|${email}|${udf1 || ''}||||||||||${PAYU_MERCHANT_SALT}`;
    const hash = sha512(hashString);

    const actionUrl = PAYU_ENV === 'LIVE'
      ? 'https://secure.payu.in/_payment'
      : 'https://test.payu.in/_payment';

    return res.json({
      success: true,
      key: PAYU_MERCHANT_KEY,
      txnid,
      amount: validAmount,
      productinfo: productinfo || 'ClickBarry Lifetime Seller Pass',
      firstname,
      email,
      phone: phone || '9999999999',
      hash,
      actionUrl,
      env: PAYU_ENV,
      isTestMode: PAYU_ENV !== 'LIVE'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to generate hash' });
  }
});

// -----------------------------------------------------------------------------
// 2. VERIFY PAYU RETURN PAYMENT (Reverse Hash Verification)
// -----------------------------------------------------------------------------
app.post('/api/payu/verify-payment', (req, res) => {
  try {
    const {
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      status,
      hash,
      udf1,
      mihpayid,
      bank_ref_num,
      mode
    } = req.body;

    if (!txnid || !status) {
      return res.status(400).json({ success: false, error: 'Invalid verification payload' });
    }

    // Reverse Hash Format: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
    const reverseHashString = `${PAYU_MERCHANT_SALT}|${status}||||||||||${udf1 || ''}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${PAYU_MERCHANT_KEY}`;
    const calculatedHash = sha512(reverseHashString);

    const isHashValid = calculatedHash.toLowerCase() === (hash || '').toLowerCase();
    const isSuccess = status === 'success' && (amount === '999.00' || amount === '999' || amount === 999);

    if (!isHashValid && PAYU_ENV === 'LIVE') {
      return res.status(400).json({
        success: false,
        error: 'Security Alert: PayU response signature hash mismatch! Payment rejected.'
      });
    }

    return res.json({
      success: isSuccess,
      status,
      hashVerified: isHashValid || PAYU_ENV !== 'LIVE',
      txnid,
      mihpayid,
      bank_ref_num,
      paymentMode: mode || 'UPI',
      amount: 999.00,
      message: isSuccess
        ? 'Payment verified successfully! Lifetime Seller Membership activated.'
        : 'Payment verification failed or payment was cancelled/pending.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Verification error' });
  }
});

// -----------------------------------------------------------------------------
// 3. PAYU ASYNC WEBHOOK ENDPOINT
// -----------------------------------------------------------------------------
app.post('/api/payu/webhook', (req, res) => {
  try {
    const { txnid, status, amount, hash, mihpayid } = req.body;
    console.log(`[PayU Webhook Received] TXNID: ${txnid}, Status: ${status}, Amount: ${amount}`);

    // Validate hash if live
    // Return 200 OK to PayU so they know webhook was acknowledged
    return res.status(200).json({ received: true, txnid, status });
  } catch (err: any) {
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// -----------------------------------------------------------------------------
// 4. MOUNT VITE IN DEV MODE OR SERVE BUILD IN PROD
// -----------------------------------------------------------------------------
async function startServer() {
  let vite: Awaited<ReturnType<typeof import('vite')['createServer']>> | null = null;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const hmrEnabled = process.env.DISABLE_HMR !== 'true';
    vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrEnabled,
        ws: hmrEnabled ? undefined : false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClickBarry PayU Server running on http://0.0.0.0:${PORT} [Env: ${PAYU_ENV}]`);
  });

  httpServer.on('error', (err) => {
    console.error('Server listen error:', err);
    process.exit(1);
  });

  const shutdown = async () => {
    httpServer.close();
    if (vite) {
      await vite.close().catch(() => {});
    }
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start ClickBarry server:', err);
  process.exit(1);
});
