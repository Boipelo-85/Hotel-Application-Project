import { Request, Response } from 'express';
import { geocodeAddress } from '../services/geocoding.js';

/**
 * Geocode a destination (address, city, etc.)
 * POST /api/v1/geocode
 * Body: { address: string }
 */
export async function geocodeController(req: Request, res: Response): Promise<void> {
  try {
    const { address } = req.body;

    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      res.status(400).json({ error: 'Address is required' });
      return;
    }

    const result = await geocodeAddress(address.trim());
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Geocoding failed';
    res.status(500).json({ error: message });
  }
}
