import { Elysia, t } from "elysia";
import { userServiceAPi } from "../grpc/userClient";
import { AppError } from "../types";
import { authPlugin } from "../plugins/auth";
import { checkRateLimit } from "../plugins/rateLimit";

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(authPlugin())

  // POST /auth/register
  .post('/register', async ({ body }) => {
    try {
      const response = await userServiceAPi.register({
        email: body.email,
        username: body.username,
        password: body.password,
        fullName: body.fullName
      });

      return {
        success: true,
        data: {
          userId: response.user_id,
          email: response.email,
          username: response.username,
          walletAddress: response.wallet_address,
          token: response.token,
        },
      };
    } catch (error: any) {
      console.error('Register gRPC error:', error);

      if (error.code === 6) {
        throw new AppError(
          error.details || 'User already exists',
          409,
          'USER_EXISTS'
        );
      }

      throw new AppError(
        error.details || 'Registration failed',
        500,
        'REGISTER_FAILED'
      );
    }
  }, {
    body: t.Object({
      email: t.String({
        format: 'email',
        error: 'Invalid Email address'
      }),
      username: t.String({
        minLength: 3,
        maxLength: 20,
        pattern: '^[a-z0-9_]+$',
        error: 'Username must be 3-20 characters, lowercase alphanumeric and underscores only',
      }),
      password: t.String({
        minLength: 8,
        pattern: '.*[0-9].*',
        error: 'Password must be at least 8 characters and contain at least one number',
      }),
      fullName: t.Optional(
        t.String({
          minLength: 2,
          maxLength: 100
        })
      ),
    }),
    detail: {
      summary: 'Register new user',
      tags: ['Authentication'],
    },
  })

  // POST /auth/login
  .post('/login', async ({ body }) => {
    try {
      const response = await userServiceAPi.login({
        email: body.email,
        password: body.password
      });

      return {
        success: true,
        data: {
          userId: response.user_id,
          email: response.email,
          username: response.username,
          walletAddress: response.wallet_address,
          token: response.token
        },
      };
    } catch (error: any) {
      if (error.code === 16) {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      throw new AppError('Login failed', 500);
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 8 }),
    }),
    detail: {
      summary: 'Login user',
      tags: ['Authentication'],
    },
  })

  // GET /auth/me (RATE LIMITED) ✅
  .get('/me', async ({ user, request,server }) => {
    // ✅ Check rate limit using the request object directly
    await checkRateLimit(request, 5, 60,server);

    if (!user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    try {
      const userData = await userServiceAPi.GetUser(user.userId);

      return {
        success: true,
        data: {
          userId: userData.user_id,
          email: userData.email,
          username: userData.username,
          fullName: userData.full_name,
          walletAddress: userData.wallet_address,
          createdAt: userData.created_at,
        },
      };
    } catch (e: any) {
      console.error('GetUser failed', {
        message: e?.message,
        code: e?.code,
        stack: e?.stack,
      });

      if (e?.code === 5) {
        throw new AppError(e.message, 404, 'USER_NOT_FOUND');
      }

      throw e instanceof AppError
        ? e
        : new AppError(e.message || 'Failed to fetch user', 500);
    }
  }, {
    isAuthenticated: true,
    detail: {
      summary: 'Get current user',
      tags: ['Authentication'],
    },
  });