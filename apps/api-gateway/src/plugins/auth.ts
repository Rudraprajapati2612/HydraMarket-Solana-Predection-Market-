import { Elysia } from "elysia";
import jwt from "@elysiajs/jwt";
import bearer from "@elysiajs/bearer";
import { AppError } from "../types";
import type { User } from "../types";

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
        console.log("Bearer token:", bearer);
        if (!bearer) return { user: null };

        try {
          const payload = await jwt.verify(bearer);
          if (!payload) return { user: null };

          return {
            user: {
              userId: payload.userId as string,
              email: payload.email as string,
              username: payload.username as string,
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
          onBeforeHandle(({ 
        // @ts-ignore
            user
         }) => {
            if (!user) {
              throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
            }
          });
        },
      }));
  };
};
