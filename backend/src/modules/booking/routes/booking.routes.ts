import { Router } from 'express';
import { BookingController } from '../controller/booking.controller';
import { authenticate, requireRole } from '../../../middleware/auth';
import { asyncHandler } from '../../../utils/asyncHandler';

/**
 * booking.routes.ts — Express router for the Resource Booking module.
 *
 * Route Map:
 *   CRUD:
 *     POST   /                          — Create booking (all authenticated)
 *     GET    /                          — List bookings (role-scoped)
 *     GET    /:id                       — Booking detail
 *     PUT    /:id                       — Update metadata (notes/dept)
 *     PUT    /:id/reschedule            — Reschedule to new time window
 *     DELETE /:id                       — Cancel booking
 *
 *   Calendar:
 *     GET    /calendar/today            — Today's org bookings
 *     GET    /calendar/day             — Day view (?date=YYYY-MM-DD)
 *     GET    /calendar/week            — Week view (?week=YYYY-MM-DD)
 *     GET    /calendar/month           — Month view (?month=YYYY-MM)
 *     GET    /calendar/agenda          — Agenda view (?days=14)
 *     GET    /calendar/resource/:assetId — Resource timeline
 *     GET    /calendar/employee/:empId   — Employee calendar
 *     GET    /calendar/department/:deptId — Department calendar
 */
const router = Router();
const controller = new BookingController();

// ─── Calendar Views (defined BEFORE /:id to avoid route collision) ────────────
router.get('/calendar/today', authenticate, asyncHandler(controller.getTodayBookings));
router.get('/calendar/day', authenticate, asyncHandler(controller.getDayView));
router.get('/calendar/week', authenticate, asyncHandler(controller.getWeekView));
router.get('/calendar/month', authenticate, asyncHandler(controller.getMonthView));
router.get('/calendar/agenda', authenticate, asyncHandler(controller.getAgendaView));
router.get('/calendar/resource/:assetId', authenticate, asyncHandler(controller.getResourceTimeline));
router.get('/calendar/employee/:empId', authenticate, asyncHandler(controller.getEmployeeCalendar));
router.get('/calendar/department/:deptId',
  authenticate,
  requireRole(['Admin', 'Asset Manager', 'Department Head']),
  asyncHandler(controller.getDepartmentCalendar)
);

// ─── CRUD ─────────────────────────────────────────────────────────────────────
router.get('/', authenticate, asyncHandler(controller.listBookings));
router.post('/', authenticate, asyncHandler(controller.createBooking));
router.get('/:id', authenticate, asyncHandler(controller.getBooking));
router.put('/:id', authenticate, asyncHandler(controller.updateBooking));
router.put('/:id/reschedule', authenticate, asyncHandler(controller.rescheduleBooking));
router.delete('/:id', authenticate, asyncHandler(controller.cancelBooking));

export default router;
