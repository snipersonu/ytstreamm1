// Mock user database
const users = [
  { id: '1', email: 'user@example.com', password: 'password123', name: 'Demo User' }
];

// This is a placeholder for a real authentication middleware.
// In a production application, you would verify JWT tokens,
// check against a database, and handle token expiration.
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    // For demonstration, allow access if no token is provided.
    // In a real app, this would be: return res.sendStatus(401);
    req.user = { id: 'guest', email: 'guest@example.com' };
    return next();
  }

  // For this mock, we'll just assume the token is valid if present
  // and assign a mock user.
  const mockUser = users.find(u => u.email === 'user@example.com');
  if (mockUser) {
    req.user = { id: mockUser.id, email: mockUser.email, name: mockUser.name };
  } else {
    req.user = { id: 'mock', email: 'mock@example.com' };
  }
  next();
};

// This is a placeholder for a real token generation.
// In a production application, you would use a strong secret key
// and set appropriate expiration times.
export const generateAccessToken = (user) => {
  return 'mock_jwt_token_for_' + user.id; // Mock token
};