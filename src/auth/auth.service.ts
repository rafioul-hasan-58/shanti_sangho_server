import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  Member,
  Prisma,
  Role,
  UserStatus,
  BloodGroup,
  MembershipType,
  AuthProvider,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { MembersRepository } from '../modules/members/members.repository';
import { sanitizeMember } from '../modules/members/members.utils';
import { MailService } from '../mail/mail.service';
import {
  RegisterDto,
  LoginDto,
  GoogleLoginDto,
  ForgotPasswordDto,
  VerifyOtpDto,
  ResetPasswordDto,
} from './dto';
import { EnvConfig } from '../config/env.schema';

const OTP_EXPIRY_MINUTES = 10;
const OTP_EXPIRY_MS = OTP_EXPIRY_MINUTES * 60 * 1000;

interface GoogleJwtPayload {
  iss?: string;
  sub?: string;
  aud?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  iat?: number;
  exp?: number;
}

interface RefreshTokenPayload {
  id: string;
  email: string;
}

interface PasswordResetOtpState {
  hash: string;
  expiresAt: Date;
  verified: boolean;
}

@Injectable()
export class AuthService {
  private readonly resetOtpStore = new Map<string, PasswordResetOtpState>();

  constructor(
    private readonly membersRepository: MembersRepository,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    @Optional()
    private readonly configService?: ConfigService<EnvConfig, true>,
  ) {}

  /**
   * Helper to generate both accessToken and refreshToken for a member
   */
  private generateTokens(user: Member): {
    accessToken: string;
    refreshToken: string;
  } {
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      fullName: user.fullName,
    };

    const accessSecret =
      this.configService?.get('JWT_ACCESS_SECRET', { infer: true }) ||
      process.env.JWT_ACCESS_SECRET ||
      'default_jwt_secret_key_12345';
    const accessExpiresIn =
      this.configService?.get('JWT_ACCESS_EXPIRES_IN', { infer: true }) ||
      process.env.JWT_ACCESS_EXPIRES_IN ||
      '7d';

    const refreshSecret =
      this.configService?.get('JWT_REFRESH_SECRET', { infer: true }) ||
      process.env.JWT_REFRESH_SECRET ||
      `${accessSecret}_refresh`;
    const refreshExpiresIn =
      this.configService?.get('JWT_REFRESH_EXPIRES_IN', { infer: true }) ||
      process.env.JWT_REFRESH_EXPIRES_IN ||
      '30d';

    const accessSignOptions: JwtSignOptions = {
      secret: accessSecret,
      expiresIn: accessExpiresIn as unknown as number,
    };

    const refreshSignOptions: JwtSignOptions = {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as unknown as number,
    };

    const accessToken = this.jwtService.sign(tokenPayload, accessSignOptions);
    const refreshToken = this.jwtService.sign(
      { id: user.id, email: user.email },
      refreshSignOptions,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Helper to decode a Google JWT token (e.g. from Google One Tap / Sign-In)
   */
  private decodeGoogleToken(rawToken: string): GoogleJwtPayload | null {
    try {
      // 1. Base64url decode of JWT payload
      const parts = rawToken.split('.');
      if (parts.length === 3) {
        const payloadStr = Buffer.from(parts[1], 'base64url').toString('utf-8');
        const parsed = JSON.parse(payloadStr) as Record<string, unknown>;
        if (parsed && typeof parsed.email === 'string') {
          return parsed;
        }
      }

      // 2. Fallback using jwtService.decode
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const decoded: any = this.jwtService.decode(rawToken);

      if (
        decoded &&
        typeof decoded === 'object' &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        typeof decoded.email === 'string'
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return decoded;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Register a new user with email and password
   */
  async register(payload: RegisterDto) {
    const email = payload.email.toLowerCase().trim();
    const existing = await this.membersRepository.findByEmail(email);

    if (existing) {
      throw new ConflictException('This email is already in use!');
    }

    const fullName = (payload.fullName || '').trim();
    if (!fullName) {
      throw new BadRequestException('Full name is required');
    }

    const hashedPassword = await bcrypt.hash(payload.password, 12);
    const membershipType = payload.membershipType || MembershipType.PERMANENT;
    const bloodGroup = payload.bloodGroup || BloodGroup.UNKNOWN;

    const user = await this.membersRepository.create({
      fullName,
      email,
      password: hashedPassword,
      fatherName: payload.fatherName || null,
      motherName: payload.motherName || null,
      phoneNumber: payload.phoneNumber || null,
      bloodGroup,
      bio: payload.bio || null,
      summary: payload.summary || null,
      profession: payload.profession || null,
      village: payload.village || null,
      currentLocation: payload.currentLocation || null,
      whatsappNumber: payload.whatsappNumber || null,
      membershipType,
      facebookProfile: payload.facebookProfile || null,
      profileImage: payload.profileImage || null,
      role: Role.USER,
      status: UserStatus.ACTIVE,
      authProvider: AuthProvider.EMAIL,
    });

    const { accessToken, refreshToken } = this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login user with email and password
   */
  async login(payload: LoginDto) {
    const email = payload.email.toLowerCase().trim();
    const user = await this.membersRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password!');
    }

    const isMatch = await bcrypt.compare(payload.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password!');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Your account has been suspended!');
    }

    const { accessToken, refreshToken } = this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Google JWT Token Login and Registration
   */
  async googleLogin(payload: GoogleLoginDto) {
    const rawJwt = payload.token?.trim();
    if (!rawJwt) {
      throw new BadRequestException('Google token is required');
    }

    const decoded = this.decodeGoogleToken(rawJwt);
    if (!decoded || !decoded.email) {
      throw new UnauthorizedException(
        'Invalid Google token: unable to decode user information',
      );
    }

    const email = decoded.email.toLowerCase().trim();
    const fullName =
      decoded.name?.trim() ||
      decoded.given_name?.trim() ||
      email.split('@')[0] ||
      'Google User';
    const profileImage = decoded.picture || null;
    const googleId = decoded.sub || null;

    // Find or create user
    let user = await this.membersRepository.findByEmail(email);

    if (user) {
      if (user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('Your account has been suspended!');
      }

      // Update missing profile info if available from Google
      const updateData: Prisma.MemberUpdateInput = {};
      if (!user.profileImage && profileImage) {
        updateData.profileImage = profileImage;
      }
      if (!user.googleId && googleId) {
        updateData.googleId = googleId;
      }
      if (!user.emailVerified) {
        updateData.emailVerified = true;
      }
      if (Object.keys(updateData).length > 0) {
        const updated = await this.membersRepository.update(
          user.id,
          updateData,
        );
        user = updated || { ...user, ...updateData };
      }
    } else {
      // Create new user for first-time Google sign-in
      const randomPassword =
        crypto.randomUUID() + crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 12);

      user = await this.membersRepository.create({
        fullName,
        email,
        password: hashedPassword,
        googleId,
        profileImage,
        authProvider: AuthProvider.GOOGLE,
        emailVerified: true,
        role: Role.USER,
        status: UserStatus.ACTIVE,
        bloodGroup: BloodGroup.UNKNOWN,
        membershipType: MembershipType.PERMANENT,
      });
    }

    const { accessToken, refreshToken } = this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using a valid refresh token
   */
  async refreshToken(refreshTokenString: string) {
    if (!refreshTokenString) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const accessSecret =
      this.configService?.get('JWT_ACCESS_SECRET', { infer: true }) ||
      process.env.JWT_ACCESS_SECRET ||
      'default_jwt_secret_key_12345';
    const refreshSecret =
      this.configService?.get('JWT_REFRESH_SECRET', { infer: true }) ||
      process.env.JWT_REFRESH_SECRET ||
      `${accessSecret}_refresh`;

    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshTokenString,
        {
          secret: refreshSecret,
        },
      );

      const user = await this.membersRepository.findById(payload.id);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('Your account has been suspended!');
      }

      const { accessToken, refreshToken } = this.generateTokens(user);

      return {
        accessToken,
        refreshToken,
        user: sanitizeMember(user),
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  private isOtpMatch(submittedOtp: string, storedHash: string): boolean {
    const submittedBuf = Buffer.from(this.hashOtp(submittedOtp), 'utf8');
    const storedBuf = Buffer.from(storedHash, 'utf8');
    return (
      submittedBuf.length === storedBuf.length &&
      crypto.timingSafeEqual(submittedBuf, storedBuf)
    );
  }

  private async findResettableUser(email: string): Promise<Member> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.membersRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new NotFoundException('No account found with this email address');
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Your account has been suspended!');
    }
    return user;
  }

  private assertOtpValid(user: Member, otp?: string): void {
    const normalizedEmail = user.email.toLowerCase().trim();
    const record = this.resetOtpStore.get(normalizedEmail);

    if (
      !record ||
      !record.hash ||
      !record.expiresAt ||
      record.expiresAt.getTime() <= Date.now()
    ) {
      this.resetOtpStore.delete(normalizedEmail);
      throw new BadRequestException(
        'OTP is invalid or has expired. Please request a new one.',
      );
    }

    if (otp !== undefined) {
      if (!this.isOtpMatch(otp.trim(), record.hash)) {
        throw new BadRequestException('Invalid OTP code');
      }
      return;
    }

    if (!record.verified) {
      throw new BadRequestException(
        'Please verify your OTP before resetting your password',
      );
    }
  }

  /**
   * Test/internal helper to pre-seed or inspect OTP store.
   */
  getResetOtpRecord(email: string): PasswordResetOtpState | undefined {
    return this.resetOtpStore.get(email.toLowerCase().trim());
  }

  setResetOtpRecord(email: string, state: PasswordResetOtpState): void {
    this.resetOtpStore.set(email.toLowerCase().trim(), state);
  }

  clearResetOtpStore(): void {
    this.resetOtpStore.clear();
  }

  /**
   * Generate a 6-digit OTP and send it via SMTP for password reset.
   */
  async forgotPassword(payload: ForgotPasswordDto) {
    const user = await this.findResettableUser(payload.email);
    const normalizedEmail = user.email.toLowerCase().trim();

    const otp = crypto.randomInt(100000, 1000000).toString();
    const resetOtpHash = this.hashOtp(otp);
    const resetOtpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    this.resetOtpStore.set(normalizedEmail, {
      hash: resetOtpHash,
      expiresAt: resetOtpExpiresAt,
      verified: false,
    });

    try {
      await this.mailService.sendPasswordResetOtp(
        user.email,
        user.fullName,
        otp,
        OTP_EXPIRY_MINUTES,
      );
    } catch (error) {
      this.resetOtpStore.delete(normalizedEmail);
      throw error;
    }

    return {
      email: user.email,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    };
  }

  /**
   * Verify the 6-digit password reset OTP sent to email.
   */
  async verifyOtp(payload: VerifyOtpDto) {
    const user = await this.findResettableUser(payload.email);
    this.assertOtpValid(user, payload.otp);

    const normalizedEmail = user.email.toLowerCase().trim();
    const record = this.resetOtpStore.get(normalizedEmail);
    if (record) {
      record.verified = true;
      record.expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    }

    return {
      email: user.email,
      verified: true,
    };
  }

  /**
   * Reset user password after OTP verification (supports otp inline or pre-verified state).
   */
  async resetPassword(payload: ResetPasswordDto) {
    const user = await this.findResettableUser(payload.email);
    this.assertOtpValid(user, payload.otp);

    const hashedPassword = await bcrypt.hash(payload.newPassword, 12);

    await this.membersRepository.update(user.id, {
      password: hashedPassword,
      emailVerified: true,
    });

    this.resetOtpStore.delete(user.email.toLowerCase().trim());

    return {
      email: user.email,
    };
  }
}
