import { randomBytes } from 'node:crypto';
import { inTransaction } from '../config/database.js';
import type { AuthenticatedUser, BookingRow } from '../types/models.js';
import { AppError } from '../utils/errors.js';
import { countNights, getRoomInventory } from './availability.service.js';
import {
  createBookingRecord,
  findBookingById,
  findBookingForUpdate,
  findBranchManager,
  findBranchManagerAccess,
  findManagerAccessToRoom,
  hasActivePayment,
  hasSuccessfulPayment,
  insertBookingNotification,
  listBookingsForBranch,
  listUserBookings,
  listActivePaymentsForBooking,
  updateBookingDatesAndGuests,
  updateBookingStatus as saveBookingStatus,
} from '../repositories/booking.repository.js';

export interface BookingInput {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  quantity: number;
}

export interface BookingChanges {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  quantity?: number;
}

export async function createBooking(userId: string | null, input: BookingInput): Promise<BookingRow> {
  const nights = countNights(input.checkIn, input.checkOut);
  if (!Number.isSafeInteger(input.guests) || input.guests < 1 ||
      !Number.isSafeInteger(input.quantity) || input.quantity < 1) {
    throw new AppError(400, 'Guest and room quantities must be positive integers', 'INVALID_QUANTITY');
  }
  if (new Date(`${input.checkIn}T00:00:00.000Z`) < new Date(new Date().toISOString().slice(0, 10))) {
    throw new AppError(400, 'Check-in date cannot be in the past', 'INVALID_DATES');
  }

  return inTransaction(async (client) => {
    const { room, reserved } = await getRoomInventory(
      client,
      input.roomId,
      input.checkIn,
      input.checkOut,
      true,
    );
    if (input.guests > room.capacity * input.quantity) {
      throw new AppError(400, 'Guest count exceeds the selected room capacity', 'CAPACITY_EXCEEDED');
    }
    if (room.quantity - reserved < input.quantity) {
      throw new AppError(409, 'Not enough room inventory is available for those dates', 'NO_INVENTORY');
    }

    const reference = `HB-${randomBytes(8).toString('hex').toUpperCase()}`;
    const bookingResult = await createBookingRecord(client, {
      reference,
      userId,
      roomId: input.roomId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
      quantity: input.quantity,
    });
    const booking = bookingResult.rows[0];
    if (userId) {
      await insertBookingNotification(client, userId, 'booking_pending',
        'Your reservation request is awaiting payment.',
        { bookingId: booking.id, bookingReference: reference });
    }
    const manager = await findBranchManager(client, room.branch_id);
    if (manager.rows[0]?.manager_user_id) {
      await insertBookingNotification(client, manager.rows[0].manager_user_id, 'booking_received',
        'A new reservation is awaiting payment.',
        { bookingId: booking.id, bookingReference: reference });
    }
    return booking;
  });
}

export async function listBookings(user: Pick<AuthenticatedUser, 'id' | 'role'>): Promise<BookingRow[]> {
  const result = await listUserBookings(user.id, user.role === 'admin');
  return result.rows;
}

export async function getBooking(
  bookingId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
): Promise<BookingRow> {
  const result = await findBookingById(bookingId);
  const booking = result.rows[0];
  if (
    !booking ||
    (booking.user_id !== user.id &&
      user.role !== 'admin' &&
      !(user.role === 'branch_manager' && booking.manager_user_id === user.id))
  ) {
    throw new AppError(404, 'Booking not found', 'NOT_FOUND');
  }
  const { manager_user_id: _managerUserId, ...publicBooking } = booking;
  return publicBooking;
}

export async function listBranchBookings(
  branchId: string,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
): Promise<BookingRow[]> {
  const result = await listBookingsForBranch(branchId);
  if (user.role !== 'admin') {
    const branch = await findBranchManagerAccess(branchId, user.id);
    if (!branch.rowCount) throw new AppError(404, 'Branch not found', 'NOT_FOUND');
  }
  return result.rows;
}

export async function cancelBooking(
  bookingId: string,
  userId: string,
  isAdmin: boolean,
): Promise<BookingRow> {
  return inTransaction(async (client) => {
    const result = await findBookingForUpdate(client, bookingId);
    const booking = result.rows[0];
    if (!booking || (!isAdmin && booking.user_id !== userId)) {
      throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    }
    if (booking.status === 'cancelled') return booking;
    if (booking.status === 'completed') {
      throw new AppError(409, 'Completed bookings cannot be cancelled', 'INVALID_BOOKING_STATE');
    }
    const payment = await listActivePaymentsForBooking(client, bookingId);
    if (payment.rows.some((row) => row.status === 'pending')) {
      throw new AppError(409, 'A checkout is in progress; wait for it to finish or expire before cancelling', 'PAYMENT_IN_PROGRESS');
    }
    if (payment.rows.some((row) => row.status === 'successful')) {
      throw new AppError(409, 'A paid booking requires a configured refund provider before cancellation', 'REFUND_UNAVAILABLE');
    }
    const cancelled = await saveBookingStatus(client, bookingId, 'cancelled');
    if (booking.user_id) {
      await insertBookingNotification(client, booking.user_id, 'booking_cancelled',
        'Your reservation was cancelled.',
        { bookingId: booking.id, bookingReference: booking.booking_reference });
    }
    return cancelled.rows[0];
  });
}

export async function modifyBooking(
  bookingId: string,
  actor: Pick<AuthenticatedUser, 'id' | 'role'>,
  changes: BookingChanges,
): Promise<BookingRow> {
  return inTransaction(async (client) => {
    const bookingResult = await findBookingForUpdate(client, bookingId);
    const booking = bookingResult.rows[0];
    if (!booking) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    if (actor.role !== 'admin' && booking.user_id !== actor.id) {
      const access = await findManagerAccessToRoom(client, booking.room_id, actor.id);
      if (!access.rowCount) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    }
    if (
      booking.status !== 'pending' ||
      !booking.expires_at ||
      booking.expires_at <= new Date()
    ) {
      throw new AppError(409, 'Only unpaid, unexpired bookings can be modified', 'INVALID_BOOKING_STATE');
    }
    const payment = await hasActivePayment(client, bookingId);
    if (payment.rowCount) {
      throw new AppError(409, 'A booking with an active payment attempt cannot be modified', 'PAYMENT_IN_PROGRESS');
    }

    const checkIn = changes.checkIn ?? booking.check_in;
    const checkOut = changes.checkOut ?? booking.check_out;
    const guests = changes.guests ?? booking.guests;
    const quantity = changes.quantity ?? booking.quantity;
    countNights(checkIn, checkOut);
    if (new Date(`${checkIn}T00:00:00.000Z`) < new Date(new Date().toISOString().slice(0, 10))) {
      throw new AppError(400, 'Check-in date cannot be in the past', 'INVALID_DATES');
    }
    if (!Number.isSafeInteger(guests) || guests < 1 || !Number.isSafeInteger(quantity) || quantity < 1) {
      throw new AppError(400, 'Guest and room quantities must be positive integers', 'INVALID_QUANTITY');
    }
    const { room, reserved } = await getRoomInventory(
      client,
      booking.room_id,
      checkIn,
      checkOut,
      true,
      bookingId,
    );
    if (guests > room.capacity * quantity) {
      throw new AppError(400, 'Guest count exceeds the selected room capacity', 'CAPACITY_EXCEEDED');
    }
    if (room.quantity - reserved < quantity) {
      throw new AppError(409, 'Not enough room inventory is available for those dates', 'NO_INVENTORY');
    }
    const updated = await updateBookingDatesAndGuests(client, bookingId, {
      checkIn,
      checkOut,
      guests,
      quantity,
      price: room.price,
      currency: room.currency,
    });
    if (booking.user_id) {
      await insertBookingNotification(client, booking.user_id, 'booking_updated',
        'Your reservation details were updated.',
        { bookingId: booking.id, bookingReference: booking.booking_reference });
    }
    return updated.rows[0];
  });
}

export async function updateBookingStatus(
  bookingId: string,
  status: 'confirmed' | 'cancelled' | 'completed',
  actor: Pick<AuthenticatedUser, 'id' | 'role'>,
): Promise<BookingRow> {
  return inTransaction(async (client) => {
    const result = await findBookingForUpdate(client, bookingId);
    const booking = result.rows[0];
    if (!booking) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    if (actor.role !== 'admin') {
      const access = await findManagerAccessToRoom(client, booking.room_id, actor.id);
      if (!access.rowCount) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    }
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      throw new AppError(409, 'Booking is in a terminal state', 'INVALID_BOOKING_STATE');
    }
    if (status === 'confirmed') {
      if (
        booking.status !== 'pending' ||
        !booking.expires_at ||
        booking.expires_at <= new Date()
      ) {
        throw new AppError(409, 'This booking is no longer awaiting payment', 'BOOKING_EXPIRED');
      }
      const successfulPayment = await hasSuccessfulPayment(client, bookingId);
      if (!successfulPayment.rowCount) {
        throw new AppError(409, 'A booking can only be confirmed after verified payment', 'PAYMENT_REQUIRED');
      }
    }
    if (status === 'completed') {
      if (booking.status !== 'confirmed' || booking.check_out > new Date().toISOString().slice(0, 10)) {
        throw new AppError(409, 'Only a confirmed booking after check-out can be completed', 'INVALID_BOOKING_STATE');
      }
    }
    if (status === 'cancelled') {
      const activePayment = await listActivePaymentsForBooking(client, bookingId);
      if (activePayment.rows.some((row) => row.status === 'pending')) {
        throw new AppError(409, 'A checkout is in progress; wait for it to finish or expire before cancelling', 'PAYMENT_IN_PROGRESS');
      }
      if (activePayment.rows.some((row) => row.status === 'successful')) {
        throw new AppError(409, 'A paid booking requires a configured refund provider before cancellation', 'REFUND_UNAVAILABLE');
      }
    }
    const updated = await saveBookingStatus(client, bookingId, status);
    if (booking.user_id) {
      await insertBookingNotification(client, booking.user_id, `booking_${status}`,
        `Your reservation was ${status}.`,
        { bookingId: booking.id, bookingReference: booking.booking_reference });
    }
    return updated.rows[0];
  });
}
