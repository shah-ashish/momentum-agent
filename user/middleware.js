import { verifyToken } from "./auth.js";

/**
 * Express middleware to authenticate routes via JWT in HttpOnly cookies or Authorization header.
 */
export function authenticateToken(req, res, next) {
  // Extract token from cookies or authorization header
  let token = req.cookies?.token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts[0] === "Bearer" && parts[1]) {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing authentication token" });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }

  // Attach user information to request
  req.user = decoded;
  next();
}
