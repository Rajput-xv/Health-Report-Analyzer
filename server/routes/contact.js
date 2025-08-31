const express = require('express');
const Contact = require('../models/Contact');
const router = express.Router();

// Submit contact form
router.post('/submit', async (req, res) => {
  try {
    const { name, email, mobile, message } = req.body;

    // Validation
    if (!name || !email || !mobile || !message) {
      return res.status(400).json({
        error: 'All fields are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Please enter a valid email address'
      });
    }

    // Mobile validation (basic)
    if (mobile.length < 10) {
      return res.status(400).json({
        error: 'Please enter a valid mobile number'
      });
    }

    // Create new contact submission
    const newContact = new Contact({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile.trim(),
      message: message.trim()
    });

    await newContact.save();

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully! We will get back to you soon.'
    });

  } catch (error) {
    console.error('Contact form submission failed:', error);
    res.status(500).json({
      error: 'Failed to send message. Please try again later.'
    });
  }
});

// Get all contact submissions (for admin use)
router.get('/all', async (req, res) => {
  try {
    const contacts = await Contact.find({}).sort({ createdAt: -1 });
    res.json({
      success: true,
      contacts
    });
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
    res.status(500).json({
      error: 'Failed to fetch contacts'
    });
  }
});

// Update contact status (for admin use)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['new', 'read', 'replied'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status'
      });
    }

    const contact = await Contact.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        error: 'Contact not found'
      });
    }

    res.json({
      success: true,
      contact
    });

  } catch (error) {
    console.error('Failed to update contact status:', error);
    res.status(500).json({
      error: 'Failed to update contact status'
    });
  }
});

module.exports = router;
