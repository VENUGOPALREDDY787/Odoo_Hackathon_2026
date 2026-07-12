import { BookingRepository } from '../repository/booking.repository';
import { AppError } from '../../../core/errors/AppError';
import redis from '../../../core/redis/client';
import { REDIS_KEYS, CALENDAR_CACHE_TTL } from '../constants/booking.constants';

/**
 * CalendarService — Provides date-range queries for calendar views.
 *
 * Supports:
 *  - Daily view  (single day)
 *  - Weekly view (Mon–Sun window)
 *  - Monthly view (1st – last day of month)
 *  - Agenda view (next N days)
 *  - Resource timeline (filtered by assetId)
 *  - Employee calendar (filtered by employeeId)
 *  - Department calendar (filtered by deptId)
 *
 * All views are Redis-cached with a short TTL (5 min default).
 * Cache keys are invalidated by BookingService on every mutation.
 */
export class CalendarService {
  private bookingRepository: BookingRepository;

  constructor(bookingRepository = new BookingRepository()) {
    this.bookingRepository = bookingRepository;
  }

  /**
   * Returns all bookings for a specific calendar day.
   * Result is Redis-cached.
   */
  async getDayView(orgId: string, dateStr: string, assetId?: string, deptId?: string) {
    const cacheKey = REDIS_KEYS.calendarDay(orgId, dateStr);
    const cached = await this.getFromCache(cacheKey);
    if (cached && !assetId && !deptId) return cached;

    const from = new Date(dateStr + 'T00:00:00.000Z');
    const to = new Date(dateStr + 'T23:59:59.999Z');

    if (isNaN(from.getTime())) throw new AppError('Invalid date format. Use YYYY-MM-DD.', 400, 'INVALID_DATE');

    const bookings = await this.bookingRepository.findInDateRange(orgId, from, to, assetId, undefined, deptId);

    if (!assetId && !deptId) {
      await redis.setex(cacheKey, CALENDAR_CACHE_TTL, JSON.stringify(bookings));
    }

    return bookings;
  }

  /**
   * Returns all bookings within a 7-day window starting from Monday of the given week.
   * weekStr format: YYYY-MM-DD (any day in the target week).
   */
  async getWeekView(orgId: string, weekStr: string, assetId?: string, deptId?: string) {
    const anchor = new Date(weekStr + 'T00:00:00.000Z');
    if (isNaN(anchor.getTime())) throw new AppError('Invalid date format. Use YYYY-MM-DD.', 400, 'INVALID_DATE');

    // Normalize to Monday
    const day = anchor.getUTCDay() || 7;
    const monday = new Date(anchor);
    monday.setUTCDate(anchor.getUTCDate() - day + 1);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 59, 999);

    const isoWeek = `${monday.getUTCFullYear()}-W${String(this.getISOWeekNumber(monday)).padStart(2, '0')}`;
    const cacheKey = REDIS_KEYS.calendarWeek(orgId, isoWeek);
    const cached = await this.getFromCache(cacheKey);
    if (cached && !assetId && !deptId) return cached;

    const bookings = await this.bookingRepository.findInDateRange(orgId, monday, sunday, assetId, undefined, deptId);

    if (!assetId && !deptId) {
      await redis.setex(cacheKey, CALENDAR_CACHE_TTL, JSON.stringify(bookings));
    }

    return bookings;
  }

  /**
   * Returns all bookings within a calendar month.
   * monthStr format: YYYY-MM
   */
  async getMonthView(orgId: string, monthStr: string, assetId?: string, deptId?: string) {
    const [year, month] = monthStr.split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
      throw new AppError('Invalid month format. Use YYYY-MM.', 400, 'INVALID_DATE');
    }

    const cacheKey = REDIS_KEYS.calendarMonth(orgId, monthStr);
    const cached = await this.getFromCache(cacheKey);
    if (cached && !assetId && !deptId) return cached;

    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const bookings = await this.bookingRepository.findInDateRange(orgId, from, to, assetId, undefined, deptId);

    if (!assetId && !deptId) {
      await redis.setex(cacheKey, CALENDAR_CACHE_TTL, JSON.stringify(bookings));
    }

    return bookings;
  }

  /**
   * Returns upcoming bookings for the next N days (agenda view).
   */
  async getAgendaView(orgId: string, days = 14, employeeId?: string) {
    const from = new Date();
    const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
    return this.bookingRepository.findInDateRange(orgId, from, to, undefined, employeeId);
  }

  /**
   * Returns today's bookings for an organization.
   * Redis-cached via todayBookings key.
   */
  async getTodayBookings(orgId: string) {
    const cacheKey = REDIS_KEYS.todayBookings(orgId);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const bookings = await this.bookingRepository.findInDateRange(orgId, from, to);
    await redis.setex(cacheKey, CALENDAR_CACHE_TTL, JSON.stringify(bookings));
    return bookings;
  }

  /**
   * Returns a resource timeline view for a specific asset across a date range.
   */
  async getResourceTimeline(orgId: string, assetId: string, from: Date, to: Date) {
    return this.bookingRepository.findInDateRange(orgId, from, to, assetId);
  }

  /**
   * Returns all bookings for a specific employee.
   */
  async getEmployeeCalendar(orgId: string, employeeId: string, from: Date, to: Date) {
    return this.bookingRepository.findInDateRange(orgId, from, to, undefined, employeeId);
  }

  /**
   * Returns all bookings for a specific department.
   */
  async getDepartmentCalendar(orgId: string, deptId: string, from: Date, to: Date) {
    return this.bookingRepository.findInDateRange(orgId, from, to, undefined, undefined, deptId);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async getFromCache(key: string): Promise<any | null> {
    try {
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private getISOWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}

export default CalendarService;
