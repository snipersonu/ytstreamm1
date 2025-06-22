import express from 'express';
import { generateAccessToken } from '../middleware/auth.js';

const router = express.Router();

// Mock user database (for demonstration purposes)
const users = [
  { id: '1', email: 'user@example.com', password: 'password123', name: 'Demo User' }
];

// Mock login route
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // In a real application, you would hash passwords and compare securely
  const user = users.find(u => u.email === email && u.password === password);

  if (user) {
    const token = generateAccessToken({ id: user.id, email: user.email });
    res.json({ 
      message: 'Login successful', 
      token, 
      user: { id: user.id, email: user.email, name: user.name } 
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Mock registration route
router.post('/register', (req, res) => {
  const { email, password, name } = req.body;

  // In a real application, you would validate input, hash passwords,
  // and save to a database.
  if (users.some(u => u.email === email)) {
    return res.status(409).json({ message: 'User with this email already exists' });
  }

  const newUser = { 
    id: (users.length + 1).toString(), 
    email, 
    password, 
    name: name || 'User' 
  };
  users.push(newUser); // Add to mock database

  const token = generateAccessToken({ id: newUser.id, email: newUser.email });
  res.status(201).json({ 
    message: 'Registration successful', 
    token, 
    user: { id: newUser.id, email: newUser.email, name: newUser.name } 
  });
});

export default router;