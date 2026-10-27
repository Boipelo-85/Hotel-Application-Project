import type { RequestHandler } from 'express';
import { query } from '../config/database.js';
import { AppError } from '../utils/errors.js';

export const getDashboardStatsController: RequestHandler = async (_request, response) => {
  const stats = await query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
      (SELECT COUNT(*) FROM branches WHERE publication_status = 'published') as total_branches,
      (SELECT COUNT(*) FROM rooms WHERE status = 'active') as total_rooms,
      (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as active_bookings,
      (SELECT COUNT(*) FROM bookings WHERE status = 'pending') as pending_bookings,
      (SELECT COUNT(*) FROM bookings WHERE created_at >= CURRENT_DATE) as today_bookings,
      (SELECT COALESCE(SUM(total_amount::numeric), 0) FROM bookings WHERE status = 'confirmed' AND created_at >= CURRENT_DATE) as today_revenue,
      (SELECT COALESCE(SUM(total_amount::numeric), 0) FROM bookings WHERE status = 'confirmed' AND created_at >= CURRENT_DATE - INTERVAL '30 days') as monthly_revenue
  `);

  response.json({ stats: stats.rows[0] });
};

export const getRecentBookingsController: RequestHandler = async (request, response) => {
  const limit = parseInt(request.query.limit as string) || 10;
  const result = await query(`
    SELECT
      b.id,
      b.booking_reference,
      b.check_in,
      b.check_out,
      b.total_amount,
      b.currency,
      b.status,
      b.created_at,
      u.name as user_name,
      u.email as user_email,
      h.name as branch_name,
      r.room_type
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    JOIN rooms r ON r.id = b.room_id
    JOIN branches h ON h.id = r.branch_id
    ORDER BY b.created_at DESC
    LIMIT $1
  `, [limit]);

  response.json({ bookings: result.rows });
};

export const getBranchStatsController: RequestHandler = async (request, response) => {
  const result = await query(`
    SELECT
      h.id,
      h.name,
      h.city,
      h.province,
      h.publication_status,
      COUNT(DISTINCT r.id) as total_rooms,
      COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'confirmed') as active_bookings,
      COALESCE(SUM(b.total_amount::numeric) FILTER (WHERE b.status = 'confirmed' AND b.created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as monthly_revenue
    FROM branches h
    LEFT JOIN rooms r ON r.branch_id = h.id AND r.status = 'active'
    LEFT JOIN bookings b ON b.room_id = r.id
    GROUP BY h.id, h.name, h.city, h.province, h.publication_status
    ORDER BY monthly_revenue DESC NULLS LAST
  `);

  response.json({ branches: result.rows });
};

export const getUserStatsController: RequestHandler = async (request, response) => {
  const result = await query(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.email_verified,
      u.created_at,
      COUNT(DISTINCT b.id) as total_bookings,
      COALESCE(SUM(b.total_amount::numeric) FILTER (WHERE b.status = 'confirmed'), 0) as total_spent
    FROM users u
    LEFT JOIN bookings b ON b.user_id = u.id
    WHERE u.is_active = true
    GROUP BY u.id, u.name, u.email, u.role, u.email_verified, u.created_at
    ORDER BY total_spent DESC NULLS LAST
    LIMIT 50
  `);

  response.json({ users: result.rows });
};

export const getAllUsersController: RequestHandler = async (request, response) => {
  const page = parseInt(request.query.page as string) || 1;
  const limit = parseInt(request.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const result = await query(`
    SELECT
      id,
      name,
      email,
      role,
      email_verified,
      is_active,
      phone,
      created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  const countResult = await query('SELECT COUNT(*) as total FROM users');

  response.json({
    users: result.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].total),
      totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
    },
  });
};

export const updateUserController: RequestHandler = async (request, response) => {
  const userId = request.params.userId;
  const { role, is_active } = request.body;

  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (role !== undefined) {
    updates.push(`role = $${paramIndex++}`);
    values.push(role);
  }
  if (is_active !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(is_active);
  }

  if (updates.length === 0) {
    throw new AppError(400, 'No fields to update', 'INVALID_DATA');
  }

  values.push(userId);
  const result = await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  if (!result.rows[0]) {
    throw new AppError(404, 'User not found', 'NOT_FOUND');
  }

  response.json({ user: result.rows[0] });
};

export const getAvailabilityReportController: RequestHandler = async (request, response) => {
  const result = await query(`
    SELECT
      h.id as branch_id,
      h.name as branch_name,
      h.city,
      r.id as room_id,
      r.room_type,
      r.quantity,
      r.status as room_status,
      COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'confirmed' AND b.check_out >= CURRENT_DATE) as current_bookings,
      r.quantity - COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'confirmed' AND b.check_out >= CURRENT_DATE) as available_rooms
    FROM branches h
    JOIN rooms r ON r.branch_id = h.id
    LEFT JOIN bookings b ON b.room_id = r.id
    WHERE h.publication_status = 'published'
    GROUP BY h.id, h.name, h.city, r.id, r.room_type, r.quantity, r.status
    ORDER BY h.name, r.room_type
  `);

  response.json({ availability: result.rows });
};

export const getRevenueReportController: RequestHandler = async (request, response) => {
  const startDate = request.query.startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = request.query.endDate as string || new Date().toISOString().split('T')[0];

  const result = await query(`
    SELECT
      DATE(b.created_at) as date,
      COUNT(*) as bookings,
      COALESCE(SUM(b.total_amount::numeric), 0) as revenue
    FROM bookings b
    WHERE b.status = 'confirmed'
      AND b.created_at::date >= $1
      AND b.created_at::date <= $2
    GROUP BY DATE(b.created_at)
    ORDER BY date ASC
  `, [startDate, endDate]);

  response.json({ revenue: result.rows });
};
