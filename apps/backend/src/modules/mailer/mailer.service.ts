export interface SentEmailRecord {
  to: string;
  subject: string;
  otp?: string;
  link?: string;
  sentAt: number;
}

export class MailerService {
  private static sentEmails: SentEmailRecord[] = [];
  private static emailDispatchHistory = new Map<string, number[]>(); // email -> timestamps
  private static readonly RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 mins
  private static readonly MAX_EMAILS_PER_WINDOW = 3;

  /**
   * Dispatches a 6-digit verification OTP email
   */
  public static async sendVerificationOtp(email: string, otp: string): Promise<boolean> {
    this.enforceRateLimit(email);

    const record: SentEmailRecord = {
      to: email,
      subject: "Verify Your Let's Track It Account",
      otp,
      link: `letstrackit://verify?email=${encodeURIComponent(email)}&token=${otp}`,
      sentAt: Date.now()
    };

    this.sentEmails.push(record);
    this.recordDispatch(email);

    // In a live SMTP environment, nodemailer.createTransport() sends the message
    return true;
  }

  /**
   * Dispatches a password reset HMAC link / OTP email
   */
  public static async sendPasswordResetLink(email: string, resetToken: string): Promise<boolean> {
    this.enforceRateLimit(email);

    const record: SentEmailRecord = {
      to: email,
      subject: "Reset Your Let's Track It Password",
      link: `letstrackit://reset-password?email=${encodeURIComponent(email)}&token=${resetToken}`,
      sentAt: Date.now()
    };

    this.sentEmails.push(record);
    this.recordDispatch(email);
    return true;
  }

  private static enforceRateLimit(email: string): void {
    const now = Date.now();
    const timestamps = (this.emailDispatchHistory.get(email) || []).filter(
      t => now - t < this.RATE_LIMIT_WINDOW_MS
    );

    if (timestamps.length >= this.MAX_EMAILS_PER_WINDOW) {
      throw new Error(`Email rate limit exceeded for ${email}. Maximum 3 attempts per 15 minutes.`);
    }
  }

  private static recordDispatch(email: string): void {
    const timestamps = (this.emailDispatchHistory.get(email) || []).filter(
      t => Date.now() - t < this.RATE_LIMIT_WINDOW_MS
    );
    timestamps.push(Date.now());
    this.emailDispatchHistory.set(email, timestamps);
  }

  public static getSentEmails(): SentEmailRecord[] {
    return [...this.sentEmails];
  }

  public static getLastSentEmail(email: string): SentEmailRecord | undefined {
    return [...this.sentEmails].reverse().find(e => e.to.toLowerCase() === email.toLowerCase());
  }

  public static clear(): void {
    this.sentEmails = [];
    this.emailDispatchHistory.clear();
  }
}
