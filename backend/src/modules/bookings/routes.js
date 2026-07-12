const express = require('express');
const router = express.Router();
const bookingsController = require('./controller');
const { authenticate } = require('../../middleware/auth');

// Bookings query & booking registration (Any authenticated staff)
router.get('/', authenticate, bookingsController.listBookings);
router.post('/', authenticate, bookingsController.createBooking);

// Cancel a booking
router.put('/:id/cancel', authenticate, bookingsController.cancelBooking);

module.exports = router;
