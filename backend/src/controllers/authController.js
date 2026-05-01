
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../config/database");
const { asyncHandler } = require("../middleware/errorHandler");


const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const userResponse = (user, token) => {
  const { password_hash, ...safe } = user;
  return { user: safe, token };
};

const register = asyncHandler(async (req, res) => {
  const { first_name, last_name, username, email, password } = req.body;

  const existing = await db.findOne("users", { email });
  if (existing) {
    return res.status(409).json({ message: "Email already registered." });
  }

  const existingUsername = await db.findOne("users", { username });
  if (existingUsername) {
    return res.status(409).json({ message: "Username already taken." });
  }

  const password_hash = await bcrypt.hash(password, 12);

  const user = await db.insert("users", {
    first_name,
    last_name,
    username,
    email,
    password_hash,
    notifications_enabled: true,
  });

  const token = signToken(user.id);
  res.status(201).json({
    message: "Registration successful.",
    ...userResponse(user, token),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await db.findOne("users", { email });

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const token = signToken(user.id);
  res.json({ message: "Login successful.", ...userResponse(user, token) });
});


const logout = asyncHandler(async (_req, res) => {
  res.json({ message: "Logged out successfully." });
});

const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { first_name, last_name, email, username, current_password, new_password } = req.body;
  const user = await db.findById("users", req.user.id);

  if (email && email !== user.email) {
    const taken = await db.findOne("users", { email });
    if (taken) return res.status(409).json({ message: "Email already in use." });
  }

  let password_hash = user.password_hash;
  if (new_password) {
    if (!current_password) {
      return res.status(400).json({ message: "Current password required to set a new one." });
    }
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(401).json({ message: "Current password is incorrect." });
    password_hash = await bcrypt.hash(new_password, 12);
  }

  const updated = await db.update("users", user.id, {
    first_name: first_name || user.first_name,
    last_name:  last_name  || user.last_name,
    username:   username   || user.username,
    email:      email      || user.email,
    password_hash,
  });

  const { password_hash: _, ...safe } = updated;
  res.json({ message: "Profile updated.", user: safe });
});

const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await db.findOne("users", { email });

  if (!user) {
    return res.json({ message: "If that email exists, a reset link has been sent." });
  }

  const oldTokens = await db.findAll("password_reset_tokens", { user_id: user.id });
  for (const t of oldTokens) {
    await db.delete("password_reset_tokens", t.id);
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES || "15", 10);
  const expires_at = new Date(Date.now() + expiry * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " "); 

  await db.insert("password_reset_tokens", {
    user_id: user.id,
    token,
    expires_at,
    used_at: null,
  });

  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}`;
  console.log(`[DEV] Password reset URL: ${resetUrl}`);

  res.json({
    message: "If that email exists, a reset link has been sent.",
    dev_reset_url: process.env.NODE_ENV === "development" ? resetUrl : undefined,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, new_password } = req.body;

  const resetToken = await db.findOne("password_reset_tokens", { token });

  if (
    !resetToken ||
    resetToken.used_at ||
    new Date(resetToken.expires_at) < new Date()
  ) {
    return res.status(400).json({ message: "Reset link is invalid or has expired." });
  }

  const password_hash = await bcrypt.hash(new_password, 12);
  await db.update("users", resetToken.user_id, { password_hash });

  const used_at = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db.update("password_reset_tokens", resetToken.id, { used_at });

  res.json({ message: "Password reset successfully. You may now log in." });
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  requestPasswordReset,
  resetPassword,
};
