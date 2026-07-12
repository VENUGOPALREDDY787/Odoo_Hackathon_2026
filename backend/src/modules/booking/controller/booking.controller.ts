import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../service/booking.service';
import { CalendarService } from '../service/calendar.service';
import { createBookingSchema, updateBookingSchema, rescheduleBookingSchema } from '../validators/booking.validators';
import ApiResponse from '../../../core/responses/ApiResponse';

/**
 * BookingController — Handles all HTTP endpoints for the Resource Booking module.
 *
 * Endpoints:
 *  POST   /bookings              — Create booking
 *  GET    /bookings              — List bookings (scoped by role)
 *  GET    /bookings/:id          — Booking detail
 *  PUT    /bookings/:id          — Update metadata
 *  PUT    /bookings/:id/reschedule — Reschedule (new time window)
 *  DELETE /bookings/:id          — Cancel booking
 *
 * Calendar:
 *  GET    /bookings/calendar/today         — Today's bookings
 *  GET    /bookings/calendar/day           — Daily view (?date=YYYY-MM-DD)
 *  GET    /bookings/calendar/week          — Weekly view (?week=YYYY-MM-DD)
 *  GET    /bookings/calendar/month         — Monthly view (?month=YYYY-MM)
 *  GET    /bookings/calendar/agenda        — Agenda view (?days=14)
 *  GET    /bookings/calendar/resource/:assetId — Resource timeline
 *  GET    /bookings/calendar/employee/:empId   — Employee calendar
 *  GET    /bookings/calendar/department/:deptId — Department calendar
 */
export class BookingController {
  private bookingService: BookingService;
  private calendarService: CalendarService;

  constructor(
    bookingService = new BookingService(),
    calendarService = new CalendarService()
  ) {
    this.bookingService = bookingService;
    this.calendarService = calendarService;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────────────────────────────────────

  createBooking = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = createBookingSchema.parse(req.body);
    const data = await this.bookingService.createBooking(user.id, user.organizationId, validated);
    ApiResponse.success(res, data, 'Booking created successfully', 201);
  };

  listBookings = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.bookingService.listBookings(user.id, user.organizationId, user.role, req.query as any);
    ApiResponse.success(res, data.bookings, 'Bookings retrieved successfully', 200, data.pagination);
  };

  getBooking = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.bookingService.getBooking(user.organizationId, req.params.id as string);
    ApiResponse.success(res, data, 'Booking retrieved successfully', 200);
  };

  updateBooking = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = updateBookingSchema.parse(req.body);
    const data = await this.bookingService.updateBooking(user.id, user.organizationId, req.params.id as string, validated);
    ApiResponse.success(res, data, 'Booking updated successfully', 200);
  };

  rescheduleBooking = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const validated = rescheduleBookingSchema.parse(req.body);
    const data = await this.bookingService.rescheduleBooking(user.id, user.organizationId, req.params.id as string, validated);
    ApiResponse.success(res, data, 'Booking rescheduled successfully', 200);
  };

  cancelBooking = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.bookingService.cancelBooking(user.id, user.organizationId, req.params.id as string, user.role);
    ApiResponse.success(res, data, 'Booking cancelled successfully', 200);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CALENDAR VIEWS
  // ─────────────────────────────────────────────────────────────────────────────

  getTodayBookings = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const data = await this.calendarService.getTodayBookings(user.organizationId);
    ApiResponse.success(res, data, "Today's bookings retrieved", 200);
  };

  getDayView = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const { date, assetId, deptId } = req.query as any;
    if (!date) {
      ApiResponse.error(res, 'Query param "date" (YYYY-MM-DD) is required.', 'MISSING_PARAM', 400);
      return;
    }
    const data = await this.calendarService.getDayView(user.organizationId, date, assetId, deptId);
    ApiResponse.success(res, data, 'Daily calendar retrieved', 200);
  };

  getWeekView = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const { week, assetId, deptId } = req.query as any;
    if (!week) {
      ApiResponse.error(res, 'Query param "week" (YYYY-MM-DD) is required.', 'MISSING_PARAM', 400);
      return;
    }
    const data = await this.calendarService.getWeekView(user.organizationId, week, assetId, deptId);
    ApiResponse.success(res, data, 'Weekly calendar retrieved', 200);
  };

  getMonthView = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const { month, assetId, deptId } = req.query as any;
    if (!month) {
      ApiResponse.error(res, 'Query param "month" (YYYY-MM) is required.', 'MISSING_PARAM', 400);
      return;
    }
    const data = await this.calendarService.getMonthView(user.organizationId, month, assetId, deptId);
    ApiResponse.success(res, data, 'Monthly calendar retrieved', 200);
  };

  getAgendaView = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const days = parseInt(req.query.days as string, 10) || 14;
    // Employees see their own agenda; managers see all
    const employeeId = user.role === 'Employee' ? user.id : (req.query.employeeId as string | undefined);
    const data = await this.calendarService.getAgendaView(user.organizationId, days, employeeId);
    ApiResponse.success(res, data, 'Agenda retrieved', 200);
  };

  getResourceTimeline = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const { from, to } = req.query as any;
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const data = await this.calendarService.getResourceTimeline(user.organizationId, req.params.assetId as string, fromDate, toDate);
    ApiResponse.success(res, data, 'Resource timeline retrieved', 200);
  };

  getEmployeeCalendar = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const targetEmpId = req.params.empId;
    // Employees can only view their own calendar
    if (user.role === 'Employee' && user.id !== targetEmpId) {
      ApiResponse.error(res, 'Forbidden. You can only view your own calendar.', 'FORBIDDEN', 403);
      return;
    }
    const { from, to } = req.query as any;
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(fromDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const data = await this.calendarService.getEmployeeCalendar(user.organizationId, targetEmpId as string, fromDate, toDate);
    ApiResponse.success(res, data, 'Employee calendar retrieved', 200);
  };

  getDepartmentCalendar = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    const { from, to } = req.query as any;
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(fromDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const data = await this.calendarService.getDepartmentCalendar(user.organizationId, req.params.deptId as string, fromDate, toDate);
    ApiResponse.success(res, data, 'Department calendar retrieved', 200);
  };
}

export default BookingController;
