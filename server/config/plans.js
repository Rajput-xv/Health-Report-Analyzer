// Renewal pings can land a little after the period they renew has ended
const RENEWAL_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    reportsPerMonth: 3,
    features: ['basic_insights', 'email_support', '7_day_history']
  },
  pro_monthly: {
    name: 'Pro Monthly',
    productPermalink: process.env.GUMROAD_PRO_MONTHLY_PERMALINK,
    productId: process.env.GUMROAD_PRODUCT_ID_MONTH,
    months: 1,
    price: 500, // $5.00 in cents
    reportsPerMonth: 10,
    features: ['advanced_insights', 'trend_analysis', 'pdf_export', 'priority_support', 'family_sharing', 'unlimited_history']
  },
  pro_yearly: {
    name: 'Pro Yearly',
    productPermalink: process.env.GUMROAD_PRO_YEARLY_PERMALINK,
    productId: process.env.GUMROAD_PRODUCT_ID_YEAR,
    months: 12,
    price: 4500, // $45.00 in cents (25% off - 3 months free)
    reportsPerMonth: -1,
    features: ['advanced_insights', 'trend_analysis', 'pdf_export', 'priority_support', 'family_sharing', 'unlimited_history', 'annual_summary']
  }
};

// The plan the user has actually paid for right now; anything else is free
function effectivePlan(subscription, now = new Date()) {
  const plan = subscription?.plan;
  if (!PLANS[plan] || plan === 'free') return 'free';

  const paidUntil = new Date(subscription.renewsAt).getTime();
  if (subscription.status === 'active' && now.getTime() < paidUntil + RENEWAL_GRACE_MS) return plan;
  if (subscription.status === 'cancelled' && now.getTime() < paidUntil) return plan;
  return 'free';
}

function planForProduct(productId) {
  return Object.keys(PLANS).find(id => PLANS[id].productId && PLANS[id].productId === productId) || null;
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

// End of the paid period that began at `start`. A subscription that is still running has kept
// paying since then, so its current period counts.
function paidThrough(plan, start, ongoing, now = new Date()) {
  const { months } = PLANS[plan];
  let periods = 1;
  while (ongoing && addMonths(start, periods * months) <= now) periods++;
  return addMonths(start, periods * months);
}

module.exports = { PLANS, effectivePlan, planForProduct, paidThrough };
