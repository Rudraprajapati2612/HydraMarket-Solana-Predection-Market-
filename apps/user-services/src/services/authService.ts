import bcrypt from "bcryptjs";
import { prisma } from "db/client";
import jwt from "jsonwebtoken";
import { redis } from "../redis";
import { generateDepositMemo } from "../utils/memoGenerator";


const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

const HOT_WALLET_ADDRESS = process.env.HOT_WALLET_ADDRESS! ;

export class AuthServices {
  
  async register(data: {
    email: string;
    password: string;
    username: string;
    fullName?: string;
  }) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingEmail) {
      throw new Error("Email already exist");
    }
    
    const existingUsername = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existingUsername) {
      throw new Error("UserName Already exist");
    }

    const hassedPassword = await bcrypt.hash(data.password, 10);
    
    // Generate unique deposit memo
    let depositeMemo = generateDepositMemo();
    let attempts = 0;

    while (await prisma.user.findUnique({ where: { depositeMemo } })) {
      if (attempts++ > 10) {
        throw new Error("Failed to Generate unique memo");
      }
      depositeMemo = generateDepositMemo();
    }

    console.log(`📝 Generated deposit memo: ${depositeMemo}`);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          password: hassedPassword,
          username: data.username,
          fullName: data.fullName,
          depositeMemo,
          role: "USER", // ✅ Default role
        },
      });

      await tx.ledger.create({
        data: {
          userId: newUser.id,
          asset: "USDC",
          available: 0,
          reserved: 0,
        },
      });

      return newUser;
    });

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role, // ✅ Include role in token
    });

    // Cache session with role
    await this.cacheSession(token, {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role, // ✅ Cache role
    });

    console.log(`✅ User registered: ${user.username} (${user.email}) [${user.role}]`);
    console.log(`   Deposit Address: ${HOT_WALLET_ADDRESS}`);
    console.log(`   Deposit Memo: ${user.depositeMemo}`);

    return {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role, // ✅ Return role
      depositeMemo: user.depositeMemo,
      token,
    };
  }

  async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error("User Not exist Please Register");
    }

    if (!user.isActive) {
      throw new Error("User is not Active");
    }

    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      throw new Error("Incorrect Password");
    }

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role, // ✅ Include role
    });

    await this.cacheSession(token, {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role, // ✅ Cache role
    });

    console.log(`✅ User logged in: ${user.username} [${user.role}]`);

    return {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role, // ✅ Return role
      depositAddress: HOT_WALLET_ADDRESS,
      depositeMemo: user.depositeMemo,
      token,
    };
  }

  private async cacheSession(
    token: string,
    data: {
      userId: string;
      email: string;
      username: string;
      role: string; // ✅ Add role
    }
  ) {
    await redis.setex(
      `session:${token}`,
      7 * 24 * 60 * 60, // 7 Days
      JSON.stringify(data)
    );
  }

  async validateToken(token: string) {
    try {
      const cached = await redis.get(`session:${token}`);

      if (cached) {
        const session = JSON.parse(cached);
        return {
          valid: true,
          ...session,
        };
      }

      // Verify JWT
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      // Cache for next time
      await this.cacheSession(token, {
        userId: decoded.userId,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role, // ✅ Cache role
      });

      return {
        valid: true,
        userId: decoded.userId,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role, // ✅ Return role
      };
    } catch (e) {
      return {
        valid: false,
        userId: null,
        email: null,
        username: null,
        role: null,
      };
    }
  }

  private generateToken(payload: {
    userId: string;
    email: string;
    username: string;
    role: string; // ✅ Add role
  }): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: "7d",
    });
  }

  async getUserById(userId: string) {
    const cached = await redis.get(`user:${userId}`);

    if (cached) {
      return JSON.parse(cached);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User Not Exist");
    }

    const response = {
      userId: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role, // ✅ Include role
      depositeAddress: HOT_WALLET_ADDRESS,
      depositeMemo: user.depositeMemo,
      createdAt: user.createdAt.toISOString(),
    };

    // Cache for 1 hour
    await redis.setex(`user:${userId}`, 3600, JSON.stringify(response));

    return response;
  }

  async getUserByUsername(username: string) {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      userId: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role, // ✅ Include role
      depositeAddress: HOT_WALLET_ADDRESS,
      depositeMemo: user.depositeMemo,
      createdAt: user.createdAt.toISOString(),
    };
  }

  // ✅ NEW: Promote user to admin (superadmin only)
  async promoteToAdmin(
    adminUserId: string,
    targetUserId: string
  ) {
    // Check if requester is superadmin
    const admin = await prisma.user.findUnique({
      where: { id: adminUserId },
    });

    if (!admin || admin.role !== 'SUPERADMIN') {
      throw new Error('Unauthorized: Only superadmins can promote users');
    }

    // Promote target user
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: 'ADMIN' },
    });

    console.log(`✅ User ${updatedUser.username} promoted to ADMIN`);

    return {
      userId: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
    };
  }
}