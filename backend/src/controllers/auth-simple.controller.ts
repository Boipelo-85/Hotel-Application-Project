import type { RequestHandler } from 'express';
import { createUser, findUserByEmail } from '../repositories/user-simple.repository.js';
import type { UserInput } from '../types/models.js';
import bcrypt from 'bcrypt';

export const registerController: RequestHandler = async (request, response) => {
  const { fullname, email, password, role } = request.body as UserInput;

  // Check if user already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return response.status(400).json({ error: 'User already exists' });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await createUser({
    fullname,
    email,
    password: hashedPassword,
    role: role || 'customer',
  });

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  response.status(201).json({ user: userWithoutPassword });
};

export const loginController: RequestHandler = async (request, response) => {
  const { email, password } = request.body;

  const user = await findUserByEmail(email);
  if (!user) {
    return response.status(401).json({ error: 'Invalid credentials' });
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return response.status(401).json({ error: 'Invalid credentials' });
  }

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  response.json({ user: userWithoutPassword });
};
