import { cognitoISP } from "./aws";
import * as crypto from "crypto";

export interface UserRegistrationData {
  email: string;
  preferred_username: string;
  name: string;
  password: string;
}

export interface UserLoginData {
  username: string;
  password: string;
}

export interface OTPVerificationData {
  username: string;
  code: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: any;
}

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private getClientId(): string {
    const id = process.env.COGNITO_CLIENT_ID;
    if (!id) throw new Error("COGNITO_CLIENT_ID is not set in environment");
    return id;
  }

  private getClientSecret(): string {
    const secret = process.env.COGNITO_CLIENT_SECRET;
    if (!secret) throw new Error("COGNITO_CLIENT_SECRET is not set in environment");
    return secret;
  }

  private calculateSecretHash(username: string): string {
    const message = username + this.getClientId();
    const hmac = crypto.createHmac("SHA256", this.getClientSecret());
    hmac.update(message);
    return hmac.digest("base64");
  }

  async registerUser(userData: UserRegistrationData): Promise<AuthResponse> {
    try {
      const params = {
        ClientId: this.getClientId(),
        Username: userData.preferred_username,
        Password: userData.password,
        SecretHash: this.calculateSecretHash(userData.preferred_username),
        UserAttributes: [
          { Name: "email", Value: userData.email },
          { Name: "preferred_username", Value: userData.preferred_username },
          { Name: "name", Value: userData.name },
        ],
        ValidationData: [],
      };

      const result = await cognitoISP.signUp(params).promise();

      return {
        success: true,
        message: "User registered successfully. Please check your email for verification code.",
        data: {
          userId: result.UserSub,
          username: userData.preferred_username,
          email: userData.email,
          name: userData.name,
        },
      };
    } catch (error: any) {
      console.error("Registration error:", error);
      return {
        success: false,
        message: error.message || "Registration failed",
      };
    }
  }

  async verifyOTP(otpData: OTPVerificationData): Promise<AuthResponse> {
    try {
      const params = {
        ClientId: this.getClientId(),
        Username: otpData.username,
        ConfirmationCode: otpData.code,
        SecretHash: this.calculateSecretHash(otpData.username),
      };

      await cognitoISP.confirmSignUp(params).promise();

      return {
        success: true,
        message: "Email verified successfully! You can now login.",
      };
    } catch (error: any) {
      console.error("OTP verification error:", error);
      return {
        success: false,
        message: error.message || "OTP verification failed",
      };
    }
  }

  async resendOTP(username: string): Promise<AuthResponse> {
    try {
      const params = {
        ClientId: this.getClientId(),
        Username: username,
        SecretHash: this.calculateSecretHash(username),
      };

      await cognitoISP.resendConfirmationCode(params).promise();

      return {
        success: true,
        message: "Verification code resent successfully!",
      };
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      return {
        success: false,
        message: error.message || "Failed to resend verification code",
      };
    }
  }

  async loginUser(loginData: UserLoginData): Promise<AuthResponse> {
    try {
      const params = {
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: this.getClientId(),
        AuthParameters: {
          USERNAME: loginData.username,
          PASSWORD: loginData.password,
          SECRET_HASH: this.calculateSecretHash(loginData.username),
        },
      };

      const result = await cognitoISP.initiateAuth(params).promise();
      const accessToken = result.AuthenticationResult?.AccessToken;

      const userInfo = await cognitoISP
        .getUser({ AccessToken: accessToken! })
        .promise();

      const userAttributes = Object.fromEntries(
        userInfo.UserAttributes.map((attr) => [attr.Name, attr.Value])
      );

      return {
        success: true,
        message: "Login successful",
        data: {
          accessToken: result.AuthenticationResult?.AccessToken,
          refreshToken: result.AuthenticationResult?.RefreshToken,
          idToken: result.AuthenticationResult?.IdToken,
          expiresIn: result.AuthenticationResult?.ExpiresIn,
          userId: userAttributes.sub,
          name: userAttributes.name,
          username: userAttributes.preferred_username,
          email: userAttributes.email,
        },
      };
    } catch (error: any) {
      console.error("Login error:", error);

      if (error.code === "UserNotConfirmedException") {
        return {
          success: false,
          message: "UserNotConfirmedException",
          data: {
            requiresVerification: true,
            username: loginData.username,
          },
        };
      }

      return {
        success: false,
        message: error.message || "Login failed",
      };
    }
  }

  async validateToken(token: string): Promise<AuthResponse> {
    try {
      const params = {
        AccessToken: token,
      };

      const result = await cognitoISP.getUser(params).promise();

      return {
        success: true,
        message: "Token is valid",
        data: {
          username: result.Username,
          attributes: result.UserAttributes,
        },
      };
    } catch (error: any) {
      console.error("Token validation error:", error);
      return {
        success: false,
        message: "Invalid token",
      };
    }
  }
}

export default AuthService.getInstance();
