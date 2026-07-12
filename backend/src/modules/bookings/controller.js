const bookingsService = require('./service');
const { createBookingSchema } = require('./validators');
const response = require('../../utils/response');

async function createBooking(req, res, next) {
  try {
    const validatedData = createBookingSchema.parse(req.body);
    const data = await bookingsService.createBooking(
      req.user.id,
      req.user.organizationId,
      req.user.role,
      validatedData
    );
    res.status(201).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function listBookings(req, res, next) {
  try {
    const data = await bookingsService.listBookings(req.user.organizationId, req.query);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function cancelBooking(req, res, next) {
  try {
    const data = await bookingsService.cancelBooking(req.user.id, req.user.organizationId, req.user.role, req.params.id);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBooking,
  listBookings,
  cancelBooking
};
