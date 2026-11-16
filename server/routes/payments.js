const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../utils/authMiddleware');
const User = require('../models/User');
const { PLANS, effectivePlan, planForProduct, paidThrough } = require('../config/plans');

const router = express.Router();

// Gumroad Configuration
const GUMROAD_ACCESS_TOKEN = process.env.GUMROAD_ACCESS_TOKEN;
const GUMROAD_WEBHOOK_SECRET = process.env.GUMROAD_WEBHOOK_SECRET;

const SALE_EVENTS = ['sale', 'refund', 'dispute', 'dispute_won'];
const SUBSCRIPTION_EVENTS = ['cancellation', 'subscription_ended', 'subscription_restarted', 'subscription_updated'];
const LIVE_SUBSCRIBER_STATUSES = ['alive', 'pending_failure', 'payment_method_update_required'];

/**
 * Helper: Make Gumroad API request
 */
async function gumroadRequest(endpoint, method = 'GET', body = null) {
  if (!GUMROAD_ACCESS_TOKEN) {
    throw new Error('GUMROAD_ACCESS_TOKEN is not configured');
  }

  const url = new URL(`https://api.gumroad.com/v2${endpoint}`);

  const options = {
    method,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    signal: AbortSignal.timeout(15000)
  };

  const params = new URLSearchParams();
  params.append('access_token', GUMROAD_ACCESS_TOKEN);

  if (body) {
    Object.entries(body).forEach(([key, value]) => {
      params.append(key, value);
    });
  }

  if (method === 'GET') {
    url.search = params.toString();
  } else {
    options.body = params.toString();
  }

  const response = await fetch(url.toString(), options);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Gumroad API error');
  }

  return data;
}

function hasWebhookSecret(given) {
  if (typeof given !== 'string') return false;
  const digest = (value) => crypto.createHash('sha256').update(value).digest();
  return crypto.timingSafeEqual(digest(given), digest(GUMROAD_WEBHOOK_SECRET));
}

// State of a sale as reported by Gumroad's sales API
function saleStatus(sale) {
  if (sale.refunded) return 'refunded';
  if (sale.chargedback) return 'disputed';
  if (sale.dead) return 'expired';
  if (sale.cancelled) return 'cancelled';
  return 'active';
}

// The plan a verified sale pays for, or null if it isn't one of our products or is no longer paid up
function paidPlan(sale) {
  const plan = planForProduct(sale.product_id);
  return plan && ['active', 'cancelled'].includes(saleStatus(sale)) ? plan : null;
}

async function fetchSale(saleId) {
  const { sale } = await gumroadRequest(`/sales/${encodeURIComponent(saleId)}`);
  return sale;
}

// Writes Gumroad's view of a sale onto the user. Throws a duplicate key error (code 11000)
// if the sale or its subscription already belongs to another account.
async function applySale(user, sale, plan) {
  const subscription = user.subscription;
  if (subscription.gumroadSaleId !== sale.id) {
    subscription.reportsUsedThisMonth = 0;
    subscription.lastReportReset = new Date();
  }
  Object.assign(subscription, {
    plan,
    status: saleStatus(sale),
    gumroadSaleId: sale.id,
    gumroadSubscriptionId: sale.subscription_id,
    renewsAt: paidThrough(plan, sale.created_at, Boolean(sale.subscription_id) && !sale.dead)
  });
  await user.save();
}

async function findBuyer(sale) {
  if (sale.subscription_id) {
    const subscriber = await User.findOne({ 'subscription.gumroadSubscriptionId': sale.subscription_id });
    if (subscriber) return subscriber;
  }

  // user_id is passed through the checkout URL built in /create-checkout
  const userId = sale.url_params?.user_id;
  if (typeof userId === 'string' && mongoose.isValidObjectId(userId)) {
    const user = await User.findById(userId);
    if (user) return user;
  }

  return typeof sale.email === 'string' ? User.findOne({ email: sale.email.toLowerCase() }) : null;
}

async function syncSale(saleId, isNewSale) {
  const sale = await fetchSale(saleId);
  const plan = isNewSale ? paidPlan(sale) : planForProduct(sale.product_id);
  if (!plan) {
    console.warn(`Ignoring Gumroad sale ${sale.id}: not a current purchase of a plan product`);
    return;
  }

  const user = isNewSale
    ? await findBuyer(sale)
    : await User.findOne({ 'subscription.gumroadSaleId': sale.id });
  if (!user) {
    console.warn(`No account found for Gumroad sale ${sale.id}`);
    return;
  }

  await applySale(user, sale, plan);
  console.log(`Gumroad sale ${sale.id} applied to user ${user._id} (${user.subscription.status})`);
}

async function syncSubscription(subscriptionId) {
  const { subscriber } = await gumroadRequest(`/subscribers/${encodeURIComponent(subscriptionId)}`);
  const plan = planForProduct(subscriber.product_id);
  if (!plan) {
    console.warn(`Ignoring Gumroad subscription ${subscriber.id}: not a plan product`);
    return;
  }

  const user = await User.findOne({ 'subscription.gumroadSubscriptionId': subscriber.id });
  if (!user) {
    console.warn(`No account found for Gumroad subscription ${subscriber.id}`);
    return;
  }

  user.subscription.plan = plan;
  if (subscriber.status === 'pending_cancellation') {
    // Gumroad sets cancelled_at to the end of the period that was paid for
    user.subscription.status = 'cancelled';
    user.subscription.renewsAt = new Date(subscriber.cancelled_at);
  } else {
    user.subscription.status = LIVE_SUBSCRIBER_STATUSES.includes(subscriber.status) ? 'active' : 'expired';
  }
  await user.save();
  console.log(`Gumroad subscription ${subscriber.id} synced for user ${user._id} (${user.subscription.status})`);
}

async function findLicensePurchase(licenseKey) {
  for (const plan of Object.values(PLANS)) {
    if (!plan.productId) continue;
    try {
      const { purchase } = await gumroadRequest('/licenses/verify', 'POST', {
        product_id: plan.productId,
        license_key: licenseKey,
        increment_uses_count: 'false'
      });
      return purchase;
    } catch (err) {
      // Not a licence for this product; try the next one
    }
  }
  return null;
}

/**
 * GET /api/payments/plans
 * Get available subscription plans
 */
router.get('/plans', (req, res) => {
  const plansResponse = Object.entries(PLANS).map(([id, plan]) => ({
    id,
    name: plan.name,
    price: plan.price,
    reportsPerMonth: plan.reportsPerMonth,
    features: plan.features,
    hasCheckout: !!plan.productPermalink
  }));

  res.json({ plans: plansResponse });
});

/**
 * POST /api/payments/create-checkout
 * Generate Gumroad checkout URL
 *
 * IMPORTANT: Gumroad redirect must be configured in product settings:
 * 1. Go to gumroad.com/products
 * 2. Edit your product
 * 3. Under "Workflow" or "After Purchase"
 * 4. Set redirect URL to: https://yourdomain.com/payment-callback
 */
router.post('/create-checkout', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = PLANS[planId];

    if (!plan || !plan.productPermalink) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build Gumroad checkout URL
    const baseUrl = `https://${process.env.GUMROAD_USERNAME}.gumroad.com/l/${plan.productPermalink}`;

    // Set recurrence based on plan type
    const recurrence = planId === 'pro_yearly' ? 'yearly' : 'monthly';

    const params = new URLSearchParams({
      email: user.email,
      wanted: 'true',
      // Pass user ID for webhook identification - this is crucial!
      user_id: user._id.toString(),
      // Set the billing frequency
      recurrence: recurrence
    });

    const checkoutUrl = `${baseUrl}?${params.toString()}`;

    res.json({
      success: true,
      checkoutUrl,
      message: 'Redirecting to Gumroad checkout',
      userId: user._id.toString()
    });

  } catch (error) {
    console.error('Create checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * GET /api/payments/subscription
 * Get current user's subscription status
 */
router.get('/subscription', authMiddleware, async (req, res) => {
  try {
    await User.resetUsageIfDue(req.user.id);
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentPlan = effectivePlan(user.subscription);
    const planDetails = PLANS[currentPlan];
    const reportsUsed = user.subscription?.reportsUsedThisMonth || 0;
    const reportsLimit = planDetails.reportsPerMonth;

    res.json({
      plan: currentPlan,
      planName: planDetails.name,
      status: user.subscription?.status || 'active',
      reportsUsed,
      reportsLimit,
      canUpload: reportsLimit === -1 || reportsUsed < reportsLimit,
      renewsAt: user.subscription?.renewsAt,
      features: planDetails.features
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

/**
 * POST /api/payments/cancel
 * Cancel subscription
 */
router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user?.subscription?.gumroadSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription to cancel' });
    }

    // Cancel via Gumroad API
    await gumroadRequest(
      '/resource_subscriptions/' + user.subscription.gumroadSubscriptionId,
      'PUT',
      { cancelled: true }
    );

    user.subscription.status = 'cancelled';
    await user.save();

    res.json({
      success: true,
      message: 'Subscription cancelled. You can continue using Pro features until the end of your billing period.'
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * POST /api/payments/resume
 * Resume subscription - Gumroad requires re-subscribing
 */
router.post('/resume', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Gumroad doesn't have a resume API - redirect to checkout
    const previousPlan = user.subscription?.plan || 'pro_monthly';
    const plan = PLANS[previousPlan];

    if (!plan?.productPermalink) {
      return res.status(400).json({
        error: 'Please subscribe again from the pricing page',
        redirectUrl: '/pricing'
      });
    }

    const checkoutUrl = `https://${process.env.GUMROAD_USERNAME || 'yourname'}.gumroad.com/l/${plan.productPermalink}?email=${encodeURIComponent(user.email)}`;

    res.json({
      success: true,
      message: 'Please complete checkout to resume your subscription',
      checkoutUrl
    });

  } catch (error) {
    console.error('Resume subscription error:', error);
    res.status(500).json({ error: 'Failed to resume subscription' });
  }
});

/**
 * GET /api/payments/customer-portal
 * Redirect to Gumroad Library for subscription management
 */
router.get('/customer-portal', authMiddleware, async (req, res) => {
  try {
    // Gumroad uses Library page for customers to manage subscriptions
    const portalUrl = 'https://app.gumroad.com/library';

    res.json({
      success: true,
      portalUrl,
      message: 'Manage your subscription on Gumroad'
    });

  } catch (error) {
    console.error('Customer portal error:', error);
    res.status(500).json({ error: 'Failed to get customer portal' });
  }
});

/**
 * POST /api/payments/webhook?secret=GUMROAD_WEBHOOK_SECRET
 * Gumroad Ping and resource subscription webhooks.
 *
 * The body only tells us which sale or subscription changed; its current state is
 * always read back from the Gumroad API.
 */
router.post('/webhook', express.urlencoded({ extended: false }), async (req, res) => {
  if (!GUMROAD_WEBHOOK_SECRET || !GUMROAD_ACCESS_TOKEN) {
    console.error('Rejecting Gumroad webhook: GUMROAD_WEBHOOK_SECRET or GUMROAD_ACCESS_TOKEN is not configured');
    return res.status(503).send('Webhook not configured');
  }
  if (!hasWebhookSecret(req.query.secret)) {
    return res.status(401).send('Unauthorized');
  }

  const event = req.body.resource_name || 'sale';
  const { sale_id: saleId, subscription_id: subscriptionId } = req.body;

  try {
    if (SALE_EVENTS.includes(event) && typeof saleId === 'string' && saleId) {
      await syncSale(saleId, event === 'sale');
    } else if (SUBSCRIPTION_EVENTS.includes(event) && typeof subscriptionId === 'string' && subscriptionId) {
      await syncSubscription(subscriptionId);
    } else {
      console.warn(`Ignoring Gumroad webhook: ${event}`);
    }
    res.status(200).send('OK');
  } catch (error) {
    if (error.code === 11000) {
      console.warn(`Gumroad ${event} webhook: purchase already belongs to another account`);
      return res.status(200).send('OK');
    }
    console.error(`Gumroad ${event} webhook failed:`, error.message);
    res.status(500).send('Webhook processing failed');
  }
});

/**
 * POST /api/payments/verify-purchase
 * Manually verify a purchase using license key
 * Useful for users who purchased but webhook didn't fire
 */
router.post('/verify-purchase', authMiddleware, async (req, res) => {
  try {
    const { licenseKey } = req.body;

    if (typeof licenseKey !== 'string' || !licenseKey.trim()) {
      return res.status(400).json({ error: 'License key required' });
    }

    if (!GUMROAD_ACCESS_TOKEN) {
      return res.status(503).json({ error: 'Purchase verification is not configured' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const purchase = await findLicensePurchase(licenseKey.trim());
    if (!purchase?.sale_id) {
      return res.status(400).json({ error: 'Invalid or expired license key' });
    }

    const sale = await fetchSale(purchase.sale_id);
    const planId = paidPlan(sale);
    if (!planId) {
      return res.status(400).json({ error: 'This purchase has been refunded, disputed or has ended' });
    }

    try {
      await applySale(user, sale, planId);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'This purchase is already linked to another account' });
      }
      throw err;
    }

    res.json({
      success: true,
      message: 'Purchase verified! Your Pro subscription is now active.',
      plan: planId
    });

  } catch (error) {
    console.error('Verify purchase error:', error);
    res.status(500).json({ error: 'Failed to verify purchase' });
  }
});

/**
 * GET /api/payments/verify-payment
 * Check if payment was successful (for polling after Gumroad redirect)
 * Returns the current subscription status
 */
router.get('/verify-payment', authMiddleware, async (req, res) => {
  try {
    const { expectedPlan } = req.query;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentPlan = effectivePlan(user.subscription);
    const planDetails = PLANS[currentPlan];

    // Check if the subscription was updated to the expected plan
    const isUpdated = expectedPlan
      ?(currentPlan === expectedPlan || (expectedPlan.startsWith('pro') && currentPlan.startsWith('pro')))
      : currentPlan !== 'free';

    res.json({
      success: true,
      isUpdated,
      subscription: {
        plan: currentPlan,
        planName: planDetails.name,
        status: user.subscription?.status || 'active',
        features: planDetails.features,
        renewsAt: user.subscription?.renewsAt
      }
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Failed to verify payment status' });
  }
});

module.exports = router;
