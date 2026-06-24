import crypto from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { User } from "./model.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_jwt_key_123456";

// Hash string using scrypt
function hashCredential(str, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(str, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// Verify dynamic credential against stored "salt:hash"
function verifyCredential(str, storedHash) {
  if (!storedHash) return false;
  const [salt, hash] = storedHash.split(":");
  const testHash = crypto.scryptSync(str, salt, 64).toString("hex");
  return testHash === hash;
}

export function validateAuthInput(email, password, secret) {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email must be a valid string." };
  }
  const trimmedEmail = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: "Please enter a valid email address." };
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return { valid: false, error: "Password must be at least 6 characters long." };
  }
  if (!secret || typeof secret !== "string" || secret.length < 4) {
    return { valid: false, error: "Secret must be at least 4 characters long." };
  }
  return { valid: true };
}

export async function registerUser(name, email, password, secret) {
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return { success: false, error: "Name must be at least 2 characters long." };
  }
  const validation = validateAuthInput(email, password, secret);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Double check if user exists in MongoDB
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return { success: false, error: "User already exists." };
  }

  // Hash credentials
  const passwordHash = hashCredential(password);
  const secretHash = hashCredential(secret);

  const user = new User({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    secretHash
  });

  await user.save();
  return { success: true, user: { email: user.email, name: user.name } };
}

export async function authenticateUser(email, password, secret) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return { success: false, error: "User does not exist." };
  }

  // Verify both password and secret
  const isPasswordValid = verifyCredential(password, user.passwordHash);
  const isSecretValid = verifyCredential(secret, user.secretHash);

  if (!isPasswordValid || !isSecretValid) {
    return { success: false, error: "Invalid password or secret." };
  }

  return { success: true, user: { email: user.email, name: user.name } };
}

export async function userExists(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const count = await User.countDocuments({ email: normalizedEmail });
  return count > 0;
}

export function generateToken(email, name) {
  return jwt.sign({ email: email.toLowerCase(), name }, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}
