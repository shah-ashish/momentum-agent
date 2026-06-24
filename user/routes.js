import { registerUser, authenticateUser, userExists, generateToken, validateAuthInput } from "./auth.js";
import { authenticateToken } from "./middleware.js";
import { Router } from "express";

const router = Router();

/**
 * Unified login and signup endpoint.
 * - If email does not exist: treats as registration/signup.
 * - If email exists: treats as login verification.
 */
router.post("/login-signup", async (req, res) => {
  const { email, password, secret, name } = req.body;

  const validation = validateAuthInput(email, password, secret);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const isExistingUser = await userExists(normalizedEmail);

    if (isExistingUser) {
      // Treat as Login
      console.log(`🔑 Login attempt for: ${normalizedEmail}`);
      const authResult = await authenticateUser(normalizedEmail, password, secret);

      if (!authResult.success) {
        return res.status(401).json({ error: authResult.error });
      }

      // Generate JWT and set HttpOnly Cookie
      const token = generateToken(normalizedEmail, authResult.user.name);
      res.cookie("token", token, {
        httpOnly: true,
        secure: false, // set to true in production
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      return res.status(200).json({
        message: "Login successful",
        user: authResult.user
      });
    } else {
      // Treat as Signup
      console.log(`➕ Signup attempt for: ${normalizedEmail}`);
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({ error: "Name must be at least 2 characters long." });
      }

      const regResult = await registerUser(name, normalizedEmail, password, secret);

      if (!regResult.success) {
        return res.status(400).json({ error: regResult.error });
      }

      // Generate JWT and set HttpOnly Cookie
      const token = generateToken(normalizedEmail, regResult.user.name);
      res.cookie("token", token, {
        httpOnly: true,
        secure: false, // set to true in production
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      return res.status(201).json({
        message: "User registered successfully",
        user: regResult.user
      });
    }
  } catch (err) {
    console.error("Auth handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Verify current user session endpoint.
 * Protected by JWT authentication middleware.
 */
router.get("/verify", authenticateToken, (req, res) => {
  return res.status(200).json({
    verified: true,
    user: req.user
  });
});

/**
 * Logout endpoint.
 * Clears HttpOnly cookie.
 */
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false, // matches setting on login
    sameSite: "strict"
  });
  return res.status(200).json({ success: true, message: "Logged out successfully" });
});

export default router;
