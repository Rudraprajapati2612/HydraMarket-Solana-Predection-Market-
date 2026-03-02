import { Elysia } from "elysia";
import jwt from "@elysiajs/jwt";
import bearer from "@elysiajs/bearer";
import { prisma } from "db/client";
import { AppError } from "../types";

export const authPlugin = () => {
  return (app: Elysia) => {
    return app
      .use(
        jwt({
          name: "jwt",
          secret: process.env.JWT_SECRET!,
        })
      )
      .use(bearer())
      .derive(async ({ jwt, bearer }) => {
        if (!bearer) return { user: null };

        try {
          const payload = await jwt.verify(bearer);
          if (!payload) return { user: null };

          // ✅ Fetch fresh user from DB
          const dbUser = await prisma.user.findUnique({
            where: { id: payload.userId as string },
            select: {
              id: true,
              email: true,
              username: true,
              role: true,
              walletAddress: true, // ✅ ADD THIS
            },
          });

          if (!dbUser) return { user: null };

          return {
            user: {
              userId: dbUser.id,
              email: dbUser.email,
              username: dbUser.username,
              role: dbUser.role,
              walletAddress: dbUser.walletAddress, // ✅ NOW AVAILABLE
            },
          };
        } catch (e) {
          console.error("JWT verification failed:", e);
          return { user: null };
        }
      })
      .macro(({ onBeforeHandle }) => ({
        isAuthenticated(enabled: boolean) {
          if (!enabled) return;
          onBeforeHandle(({ user }: any) => {
            if (!user) {
              throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
            }
          });
        },
        isAdmin(enabled: boolean) {
          if (!enabled) return;
          onBeforeHandle(({ user }: any) => {
            if (!user) {
              throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
            }
            if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
              throw new AppError(
                "Forbidden: Admin access required",
                403,
                "FORBIDDEN"
              );
            }
          });
        },
      }));
  };
};