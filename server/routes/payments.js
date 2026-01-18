const express = require('express');
const authMiddleware = require('../utils/authMiddleware');
const User = require('../models/User');

const router = express.Router();

// Gumroad Configuration
const GUMROAD_ACCESS_TOKEN = process.env.GUMROAD_ACCESS_TOKEN;
const GUMROAD_SELLER_ID = process.env.GUMROAD_SELLER_ID; // For webhook verification

// Product configuration - Update these with your Gumroad product permalinks
const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    reportsPerMonth: 3,
    features: ['basic_insights', 'email_support', '7_day_history']
  },
  pro_monthly: {
    name: 'Pro Monthly',
    productPermalink: process.env.GUMROAD_PRO_MONTHLY_PERMALINK, // e.g., "health-analyzer-pro"
    price: 500, // $5.00 in cents
    reportsPerMonth: -1, // unlimited
    features: ['advanced_insights', 'trend_analysis', 'pdf_export', 'priority_support', 'family_sharing', 'unlimited_history']
  },
  pro_yearly: {
    name: 'Pro Yearly',
    productPermalink: process.env.GUMROAD_PRO_YEARLY_PERMALINK, // e.g., "health-analyzer-yearly"
    price: 4500, // $45.00 in cents (25% off - 3 months free)
    reportsPerMonth: -1,
    features: ['advanced_insights', 'trend_analysis', 'pdf_export', 'priority_support', 'family_sharing', 'unlimited_history', 'annual_summary']
  }
};

/**
 * Helper: Make Gumroad API request
 */
async function gumroadRequest(endpoint, method = 'GET', body = null) {
  const url = new URL(`https://api.gumroad.com/v2${endpoint}`);
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
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
    // Gumroad uses direct links - add email pre-fill, user ID, and recurrence
    const baseUrl = `https://${process.env.GUMROAD_USERNAME}.gumroad.com/l/${plan.productPermalink}`;
    
    // Set recurrence based on plan type
    const recurrence = planId === 'pro_yearly' ? 'yearly' : 'monthly';
    
    const params = new URLSearchParams({
      email: user.email,
      wanted: 'true',
      // Pass user ID for webhook identification
      user_id: user._id.toString(),
      // Set the billing frequency
      recurrence: recurrence
    });

    const checkoutUrl = `${baseUrl}?${params.toString()}`;

    res.json({ 
      success: true, 
      checkoutUrl,
      message: 'Redirecting to Gumroad checkout'
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
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentPlan = user.subscription?.plan || 'free';
    const planDetails = PLANS[currentPlan];

    // Check if we need to reset monthly usage
    const now = new Date();
    const lastReset = user.subscription?.lastReportReset || user.createdAt;
    const daysSinceReset = (now - new Date(lastReset)) / (1000 * 60 * 60 * 24);

    if (daysSinceReset >= 30) {
      user.subscription = user.subscription || {};
      user.subscription.reportsUsedThisMonth = 0;
      user.subscription.lastReportReset = now;
      await user.save();
    }

    const reportsUsed = user.subscription?.reportsUsedThisMonth || 0;
    const reportsLimit = planDetails?.reportsPerMonth || 3;

    res.json({
      plan: currentPlan,
      planName: planDetails?.name || 'Free',
      status: user.subscription?.status || 'active',
      reportsUsed,
      reportsLimit,
      canUpload: reportsLimit === -1 || reportsUsed < reportsLimit,
      renewsAt: user.subscription?.renewsAt,
      features: planDetails?.features || PLANS.free.features,
      gumroadSubscriberId: user.subscription?.gumroadSubscriberId,
      subscriptionId: user.subscription?.gumroadSubscriptionId
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

    user.subscription.cancelAtPeriodEnd = true;
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
 * POST /api/payments/webhook
 * Handle Gumroad Ping webhook
 * 
 * Gumroad sends POST webhooks for:
 * - sale (new purchase)
 * - refund
 * - dispute
 * - subscription_ended
 * - subscription_restarted
 * - subscription_updated
 */
router.post('/webhook', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const payload = req.body;
    
    console.log('📨 Gumroad webhook received:', payload.resource_name || 'sale');

    // Verify webhook by checking seller_id matches
    if (GUMROAD_SELLER_ID && payload.seller_id !== GUMROAD_SELLER_ID) {
      console.warn('⚠️ Webhook seller_id mismatch');
      // Don't reject - just log warning
    }

    const resourceName = payload.resource_name || 'sale';

    switch (resourceName) {
      case 'sale':
        await handleSale(payload);
        break;

      case 'refund':
        await handleRefund(payload);
        break;

      case 'dispute':
        await handleDispute(payload);
        break;

      case 'subscription_ended':
        await handleSubscriptionEnded(payload);
        break;

      case 'subscription_restarted':
        await handleSubscriptionRestarted(payload);
        break;

      case 'subscription_updated':
        await handleSubscriptionUpdated(payload);
        break;

      default:
        console.log(`Unhandled Gumroad event: ${resourceName}`);
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook processing failed');
  }
});

// ============================================
// Webhook Handler Functions
// ============================================

/**
 * Handle new sale/subscription
 */
async function handleSale(payload) {
  const email = payload.email?.toLowerCase();
  const customUserId = payload.url_params?.user_id;
  const isSubscription = payload.is_recurring_billing === 'true';
  const productPermalink = payload.short_product_id || payload.permalink;

  // Find user by custom user_id or email
  let user;
  if (customUserId) {
    user = await User.findById(customUserId);
  }
  if (!user && email) {
    user = await User.findOne({ email });
  }

  if (!user) {
    console.error(`❌ User not found for sale: ${email || customUserId}`);
    return;
  }

  // Determine plan from product permalink
  let planId = 'pro_monthly';
  if (productPermalink === process.env.GUMROAD_PRO_YEARLY_PERMALINK) {
    planId = 'pro_yearly';
  }

  // Calculate next renewal date
  const now = new Date();
  let renewsAt = new Date(now);
  if (planId === 'pro_yearly') {
    renewsAt.setFullYear(renewsAt.getFullYear() + 1);
  } else {
    renewsAt.setMonth(renewsAt.getMonth() + 1);
  }

  user.subscription = {
    plan: planId,
    status: 'active',
    gumroadSubscriptionId: payload.subscription_id || payload.sale_id,
    gumroadSubscriberId: payload.purchaser_id,
    gumroadSaleId: payload.sale_id,
    currentPeriodStart: now,
    renewsAt: renewsAt,
    reportsUsedThisMonth: 0,
    lastReportReset: now,
    cancelAtPeriodEnd: false
  };

  await user.save();
  console.log(`✅ Sale processed for user ${user.email} - Plan: ${planId}, Recurring: ${isSubscription}`);
}

/**
 * Handle refund
 */
async function handleRefund(payload) {
  const email = payload.email?.toLowerCase();
  const saleId = payload.sale_id;

  const user = await User.findOne({
    $or: [
      { 'subscription.gumroadSaleId': saleId },
      { email: email }
    ]
  });

  if (!user) {
    console.log(`User not found for refund: ${saleId}`);
    return;
  }

  // Downgrade to free on refund
  user.subscription = {
    plan: 'free',
    status: 'active',
    reportsUsedThisMonth: 0,
    lastReportReset: new Date(),
    cancelAtPeriodEnd: false
  };

  await user.save();
  console.log(`💰 Refund processed for user ${user.email}`);
}

/**
 * Handle dispute
 */
async function handleDispute(payload) {
  const saleId = payload.sale_id;
  
  const user = await User.findOne({
    'subscription.gumroadSaleId': saleId
  });

  if (!user) return;

  user.subscription.status = 'disputed';
  await user.save();
  
  console.log(`⚠️ Dispute opened for user ${user.email}`);
}

/**
 * Handle subscription ended
 */
async function handleSubscriptionEnded(payload) {
  const subscriptionId = payload.subscription_id;
  const email = payload.email?.toLowerCase();

  const user = await User.findOne({
    $or: [
      { 'subscription.gumroadSubscriptionId': subscriptionId },
      { email: email }
    ]
  });

  if (!user) return;

  // Downgrade to free
  user.subscription.plan = 'free';
  user.subscription.status = 'expired';
  user.subscription.gumroadSubscriptionId = null;

  await user.save();
  console.log(`⚠️ Subscription ended for user ${user.email}`);
}

/**
 * Handle subscription restarted
 */
async function handleSubscriptionRestarted(payload) {
  const email = payload.email?.toLowerCase();
  const subscriptionId = payload.subscription_id;

  const user = await User.findOne({
    $or: [
      { 'subscription.gumroadSubscriptionId': subscriptionId },
      { email: email }
    ]
  });

  if (!user) return;

  // Determine plan from product
  const productPermalink = payload.short_product_id || payload.permalink;
  let planId = 'pro_monthly';
  if (productPermalink === process.env.GUMROAD_PRO_YEARLY_PERMALINK) {
    planId = 'pro_yearly';
  }

  user.subscription.plan = planId;
  user.subscription.status = 'active';
  user.subscription.cancelAtPeriodEnd = false;
  user.subscription.gumroadSubscriptionId = subscriptionId;

  await user.save();
  console.log(`✅ Subscription restarted for user ${user.email}`);
}

/**
 * Handle subscription updated (renewal)
 */
async function handleSubscriptionUpdated(payload) {
  const subscriptionId = payload.subscription_id;
  const email = payload.email?.toLowerCase();

  const user = await User.findOne({
    $or: [
      { 'subscription.gumroadSubscriptionId': subscriptionId },
      { email: email }
    ]
  });

  if (!user) return;

  // Update renewal date
  const now = new Date();
  let renewsAt = new Date(now);
  if (user.subscription.plan === 'pro_yearly') {
    renewsAt.setFullYear(renewsAt.getFullYear() + 1);
  } else {
    renewsAt.setMonth(renewsAt.getMonth() + 1);
  }
  user.subscription.renewsAt = renewsAt;
  
  // Reset monthly usage on renewal
  user.subscription.reportsUsedThisMonth = 0;
  user.subscription.lastReportReset = now;
  user.subscription.status = 'active';

  await user.save();
  console.log(`✅ Subscription renewed for user ${user.email}`);
}

/**
 * POST /api/payments/verify-purchase
 * Manually verify a purchase using license key
 * Useful for users who purchased but webhook didn't fire
 */
router.post('/verify-purchase', authMiddleware, async (req, res) => {
  try {
    const { licenseKey } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!licenseKey) {
      return res.status(400).json({ error: 'License key required' });
    }

    // Verify license with Gumroad API
    const response = await gumroadRequest('/licenses/verify', 'POST', {
      product_id: process.env.GUMROAD_PRODUCT_ID,
      license_key: licenseKey
    });

    if (response.success && response.purchase) {
      const purchase = response.purchase;
      
      // Determine plan
      let planId = 'pro_monthly';
      if (purchase.short_product_id === process.env.GUMROAD_PRO_YEARLY_PERMALINK) {
        planId = 'pro_yearly';
      }

      // Calculate renewal
      const now = new Date();
      let renewsAt = new Date(now);
      if (planId === 'pro_yearly') {
        renewsAt.setFullYear(renewsAt.getFullYear() + 1);
      } else {
        renewsAt.setMonth(renewsAt.getMonth() + 1);
      }

      user.subscription = {
        plan: planId,
        status: 'active',
        gumroadSaleId: purchase.sale_id,
        gumroadSubscriberId: purchase.purchaser_id,
        currentPeriodStart: new Date(purchase.created_at),
        renewsAt: renewsAt,
        reportsUsedThisMonth: 0,
        lastReportReset: now,
        cancelAtPeriodEnd: false
      };

      await user.save();

      res.json({
        success: true,
        message: 'Purchase verified! Your Pro subscription is now active.',
        plan: planId
      });
    } else {
      res.status(400).json({ error: 'Invalid or expired license key' });
    }

  } catch (error) {
    console.error('Verify purchase error:', error);
    res.status(500).json({ error: 'Failed to verify purchase' });
  }
});

module.exports = router;
