const express = require('express');
const crypto = require('crypto');
const authMiddleware = require('../utils/authMiddleware');
const User = require('../models/User');

const router = express.Router();

// Lemon Squeezy API configuration
const LEMON_SQUEEZY_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
const LEMON_SQUEEZY_STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID;
const LEMON_SQUEEZY_WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

// Product/Variant IDs from Lemon Squeezy dashboard
const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    reportsPerMonth: 3,
    features: ['basic_insights', 'email_support', '7_day_history']
  },
  pro_monthly: {
    name: 'Pro Monthly',
    variantId: process.env.LEMON_SQUEEZY_PRO_MONTHLY_VARIANT_ID,
    price: 999, // $9.99 in cents
    reportsPerMonth: -1, // unlimited
    features: ['advanced_insights', 'trend_analysis', 'pdf_export', 'priority_support', 'family_sharing', 'unlimited_history']
  },
  pro_yearly: {
    name: 'Pro Yearly',
    variantId: process.env.LEMON_SQUEEZY_PRO_YEARLY_VARIANT_ID,
    price: 9990, // $99.90 in cents (2 months free)
    reportsPerMonth: -1,
    features: ['advanced_insights', 'trend_analysis', 'pdf_export', 'priority_support', 'family_sharing', 'unlimited_history', 'annual_summary']
  }
};

/**
 * Helper: Make Lemon Squeezy API request
 */
async function lemonSqueezyRequest(endpoint, method = 'GET', body = null) {
  const response = await fetch(`https://api.lemonsqueezy.com/v1${endpoint}`, {
    method,
    headers: {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization': `Bearer ${LEMON_SQUEEZY_API_KEY}`
    },
    body: body ? JSON.stringify(body) : null
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Lemon Squeezy API error: ${error}`);
  }

  return response.json();
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
    hasCheckout: !!plan.variantId
  }));

  res.json({ plans: plansResponse });
});

/**
 * POST /api/payments/create-checkout
 * Create a Lemon Squeezy checkout session
 */
router.post('/create-checkout', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = PLANS[planId];

    if (!plan || !plan.variantId) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create checkout session via Lemon Squeezy API
    const checkoutData = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            custom: {
              user_id: user._id.toString()
            }
          },
          checkout_options: {
            dark: false,
            success_url: `${process.env.FRONTEND_URL}/dashboard?payment=success`,
            cancel_url: `${process.env.FRONTEND_URL}/pricing?payment=cancelled`
          },
          product_options: {
            redirect_url: `${process.env.FRONTEND_URL}/dashboard?payment=success`
          }
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: LEMON_SQUEEZY_STORE_ID
            }
          },
          variant: {
            data: {
              type: 'variants',
              id: plan.variantId
            }
          }
        }
      }
    };

    const response = await lemonSqueezyRequest('/checkouts', 'POST', checkoutData);
    const checkoutUrl = response.data.attributes.url;

    res.json({ 
      success: true, 
      checkoutUrl,
      message: 'Checkout session created'
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
      lemonSqueezyCustomerId: user.subscription?.lemonSqueezyCustomerId,
      subscriptionId: user.subscription?.lemonSqueezySubscriptionId
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

/**
 * POST /api/payments/cancel
 * Cancel subscription (at period end)
 */
router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user?.subscription?.lemonSqueezySubscriptionId) {
      return res.status(400).json({ error: 'No active subscription to cancel' });
    }

    // Cancel via Lemon Squeezy API
    await lemonSqueezyRequest(
      `/subscriptions/${user.subscription.lemonSqueezySubscriptionId}`,
      'DELETE'
    );

    user.subscription.cancelAtPeriodEnd = true;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Subscription will be cancelled at the end of the billing period' 
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * POST /api/payments/resume
 * Resume a cancelled subscription
 */
router.post('/resume', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user?.subscription?.lemonSqueezySubscriptionId) {
      return res.status(400).json({ error: 'No subscription to resume' });
    }

    // Resume via Lemon Squeezy API
    await lemonSqueezyRequest(
      `/subscriptions/${user.subscription.lemonSqueezySubscriptionId}`,
      'PATCH',
      {
        data: {
          type: 'subscriptions',
          id: user.subscription.lemonSqueezySubscriptionId,
          attributes: {
            cancelled: false
          }
        }
      }
    );

    user.subscription.cancelAtPeriodEnd = false;
    await user.save();

    res.json({ success: true, message: 'Subscription resumed' });

  } catch (error) {
    console.error('Resume subscription error:', error);
    res.status(500).json({ error: 'Failed to resume subscription' });
  }
});

/**
 * GET /api/payments/customer-portal
 * Get Lemon Squeezy customer portal URL
 */
router.get('/customer-portal', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user?.subscription?.lemonSqueezyCustomerId) {
      return res.status(400).json({ error: 'No customer record found' });
    }

    // Get customer portal URL from Lemon Squeezy
    const response = await lemonSqueezyRequest(
      `/customers/${user.subscription.lemonSqueezyCustomerId}`
    );

    const portalUrl = response.data.attributes.urls.customer_portal;

    res.json({ success: true, portalUrl });

  } catch (error) {
    console.error('Customer portal error:', error);
    res.status(500).json({ error: 'Failed to get customer portal' });
  }
});

/**
 * POST /api/payments/webhook
 * Handle Lemon Squeezy webhooks
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-signature'];
    const payload = req.body.toString();

    if (LEMON_SQUEEZY_WEBHOOK_SECRET) {
      const hmac = crypto.createHmac('sha256', LEMON_SQUEEZY_WEBHOOK_SECRET);
      const digest = hmac.update(payload).digest('hex');

      if (signature !== digest) {
        console.error('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = JSON.parse(payload);
    const eventName = event.meta.event_name;
    const data = event.data;

    console.log(`📨 Lemon Squeezy webhook: ${eventName}`);

    switch (eventName) {
      case 'subscription_created':
        await handleSubscriptionCreated(data, event.meta.custom_data);
        break;

      case 'subscription_updated':
        await handleSubscriptionUpdated(data);
        break;

      case 'subscription_cancelled':
        await handleSubscriptionCancelled(data);
        break;

      case 'subscription_resumed':
        await handleSubscriptionResumed(data);
        break;

      case 'subscription_expired':
        await handleSubscriptionExpired(data);
        break;

      case 'subscription_payment_success':
        await handlePaymentSuccess(data);
        break;

      case 'subscription_payment_failed':
        await handlePaymentFailed(data);
        break;

      case 'order_created':
        // For one-time purchases (if you add them later)
        console.log('Order created:', data.id);
        break;

      default:
        console.log(`Unhandled event: ${eventName}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Webhook handler functions
async function handleSubscriptionCreated(data, customData) {
  const userId = customData?.user_id || data.attributes.custom_data?.user_id;
  
  if (!userId) {
    console.error('No user_id in subscription webhook');
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    console.error(`User not found: ${userId}`);
    return;
  }

  // Determine plan from variant ID
  const variantId = data.attributes.variant_id.toString();
  let planId = 'pro_monthly';
  
  if (variantId === process.env.LEMON_SQUEEZY_PRO_YEARLY_VARIANT_ID) {
    planId = 'pro_yearly';
  }

  user.subscription = {
    plan: planId,
    status: 'active',
    lemonSqueezySubscriptionId: data.id,
    lemonSqueezyCustomerId: data.attributes.customer_id.toString(),
    lemonSqueezyOrderId: data.attributes.order_id.toString(),
    currentPeriodStart: new Date(data.attributes.created_at),
    renewsAt: new Date(data.attributes.renews_at),
    reportsUsedThisMonth: 0,
    lastReportReset: new Date(),
    cancelAtPeriodEnd: false
  };

  await user.save();
  console.log(`✅ Subscription created for user ${user.email} - Plan: ${planId}`);
}

async function handleSubscriptionUpdated(data) {
  const user = await User.findOne({
    'subscription.lemonSqueezySubscriptionId': data.id
  });

  if (!user) {
    console.error(`User not found for subscription: ${data.id}`);
    return;
  }

  user.subscription.status = data.attributes.status;
  user.subscription.renewsAt = data.attributes.renews_at 
    ? new Date(data.attributes.renews_at) 
    : null;

  await user.save();
  console.log(`✅ Subscription updated for user ${user.email}`);
}

async function handleSubscriptionCancelled(data) {
  const user = await User.findOne({
    'subscription.lemonSqueezySubscriptionId': data.id
  });

  if (!user) return;

  user.subscription.status = 'cancelled';
  user.subscription.cancelAtPeriodEnd = true;

  await user.save();
  console.log(`⚠️ Subscription cancelled for user ${user.email}`);
}

async function handleSubscriptionResumed(data) {
  const user = await User.findOne({
    'subscription.lemonSqueezySubscriptionId': data.id
  });

  if (!user) return;

  user.subscription.status = 'active';
  user.subscription.cancelAtPeriodEnd = false;

  await user.save();
  console.log(`✅ Subscription resumed for user ${user.email}`);
}

async function handleSubscriptionExpired(data) {
  const user = await User.findOne({
    'subscription.lemonSqueezySubscriptionId': data.id
  });

  if (!user) return;

  user.subscription.plan = 'free';
  user.subscription.status = 'expired';
  user.subscription.lemonSqueezySubscriptionId = null;

  await user.save();
  console.log(`⚠️ Subscription expired for user ${user.email}`);
}

async function handlePaymentSuccess(data) {
  const user = await User.findOne({
    'subscription.lemonSqueezySubscriptionId': data.id
  });

  if (!user) return;

  // Reset monthly usage on successful payment
  user.subscription.reportsUsedThisMonth = 0;
  user.subscription.lastReportReset = new Date();
  user.subscription.status = 'active';

  await user.save();
  console.log(`💰 Payment successful for user ${user.email}`);
}

async function handlePaymentFailed(data) {
  const user = await User.findOne({
    'subscription.lemonSqueezySubscriptionId': data.id
  });

  if (!user) return;

  user.subscription.status = 'past_due';

  await user.save();
  console.log(`❌ Payment failed for user ${user.email}`);
}

module.exports = router;
