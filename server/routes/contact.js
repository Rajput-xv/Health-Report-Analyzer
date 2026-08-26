const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Web3Forms key stays on the server
const WEB3FORMS_ACCESS_KEY = process.env.WEB3FORMS_ACCESS_KEY;

// Tighter limit on the public contact form
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many messages sent. Please try again later.' }
});

const isNonEmptyString = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/contact - forward a contact message to Web3Forms
router.post('/', contactLimiter, async (req, res) => {
  try {
    if (!WEB3FORMS_ACCESS_KEY) {
      console.error('Contact form not configured: WEB3FORMS_ACCESS_KEY is missing');
      return res.status(503).json({ success: false, error: 'Contact form is not configured' });
    }

    const { name, email, subject, message } = req.body || {};

    if (!isNonEmptyString(name, 200) ||
        !isNonEmptyString(subject, 300) ||
        !isNonEmptyString(message, 5000) ||
        typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid name, email, subject, and message.' });
    }

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        from_name: name.trim(),
        replyto: email.trim()
      })
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      return res.json({ success: true, message: 'Message sent successfully' });
    }

    console.error('Web3Forms rejected submission:', data.message || response.status);
    return res.status(502).json({ success: false, error: 'Failed to send message. Please try again.' });
  } catch (error) {
    console.error('Contact form error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to send message. Please try again.' });
  }
});

module.exports = router;
