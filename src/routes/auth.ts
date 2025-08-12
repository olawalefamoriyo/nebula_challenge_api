import { Router } from "express";
import authService from "../services/auth";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { email, preferred_username, name, password } = req.body;
    if (!email || !preferred_username || !name || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: email, preferred_username, name, password",
      });
    }
    const result = await authService.registerUser({
      email,
      preferred_username,
      name,
      password,
    });
    if (result.success) {
      res
        .status(201)
        .json({ success: true, message: result.message, data: result.data });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { username, code } = req.body;
    if (!username || !code) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Missing required fields: username, code",
        });
    }
    const result = await authService.verifyOTP({ username, code });
    if (result.success) {
      res.status(200).json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error: any) {
    console.error("OTP verification error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/resend-otp", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required field: username" });
    }
    const result = await authService.resendOTP(username);
    if (result.success) {
      res.status(200).json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error: any) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Missing required fields: username, password",
        });
    }
    const result = await authService.loginUser({ username, password });
    if (result.success) {
      res
        .status(200)
        .json({ success: true, message: result.message, data: result.data });
    } else {
      if (result.message === "UserNotConfirmedException") {
        res
          .status(401)
          .json({
            success: false,
            message: "UserNotConfirmedException",
            data: result.data,
          });
      } else {
        res.status(401).json({ success: false, message: result.message });
      }
    }
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
