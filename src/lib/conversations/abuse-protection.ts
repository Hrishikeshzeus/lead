export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  reason?: string;
}

export interface AbuseCheckResult {
  passed: boolean;
  reason?: string;
}

interface RequestRecord {
  timestamps: number[];
  recentMessages: string[];
}

class AbuseProtectionService {
  private sessions: Map<string, RequestRecord> = new Map();

  /**
   * Check sliding-window rate limit for a session or IP.
   */
  public checkRateLimit(
    tenantId: string,
    key: string,
    limitPerMinute: number = 15
  ): RateLimitResult {
    const compositeKey = `${tenantId}:${key}`;
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;

    let record = this.sessions.get(compositeKey);
    if (!record) {
      record = { timestamps: [], recentMessages: [] };
      this.sessions.set(compositeKey, record);
    }

    // Clean up timestamps older than 1 minute
    record.timestamps = record.timestamps.filter((ts) => ts > oneMinuteAgo);

    if (record.timestamps.length >= limitPerMinute) {
      const oldest = record.timestamps[0];
      const resetSeconds = Math.max(1, Math.ceil((oldest + 60_000 - now) / 1000));
      return {
        allowed: false,
        remaining: 0,
        resetSeconds,
        reason: `Message limit reached (${limitPerMinute}/min). Please wait ${resetSeconds} seconds before sending another inquiry.`,
      };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: limitPerMinute - record.timestamps.length,
      resetSeconds: 60,
    };
  }

  /**
   * Validate message content against spam, excessive length, and abuse vectors.
   */
  public checkMessageAbuse(
    tenantId: string,
    sessionId: string,
    message: string
  ): AbuseCheckResult {
    const trimmed = message.trim();

    // 1. Empty message check
    if (!trimmed || trimmed.length === 0) {
      return {
        passed: false,
        reason: "Message cannot be empty.",
      };
    }

    // 2. Length check (max 1500 characters)
    if (trimmed.length > 1500) {
      return {
        passed: false,
        reason: `Message is too long (${trimmed.length} characters). Please keep inquiries under 1500 characters.`,
      };
    }

    // 3. Null bytes or script injection
    if (trimmed.includes("\0") || /<script[\s\S]*?>/i.test(trimmed) || /javascript:/i.test(trimmed)) {
      return {
        passed: false,
        reason: "Invalid or unsupported characters detected in message.",
      };
    }

    // 4. Repeated spam detection
    const compositeKey = `${tenantId}:${sessionId}`;
    let record = this.sessions.get(compositeKey);
    if (!record) {
      record = { timestamps: [], recentMessages: [] };
      this.sessions.set(compositeKey, record);
    }

    const lower = trimmed.toLowerCase();
    const lastThree = record.recentMessages.slice(-3);
    if (lastThree.length === 3 && lastThree.every((m) => m === lower)) {
      return {
        passed: false,
        reason: "Duplicate inquiry detected. Please wait for the assistant's reply or ask a different question.",
      };
    }
    record.recentMessages.push(lower);
    if (record.recentMessages.length > 10) {
      record.recentMessages.shift();
    }

    return { passed: true };
  }

  /**
   * Reset store (useful for test runs)
   */
  public reset(): void {
    this.sessions.clear();
  }
}

export const abuseProtection = new AbuseProtectionService();
