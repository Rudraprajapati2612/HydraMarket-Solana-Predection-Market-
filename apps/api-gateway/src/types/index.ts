// User types
export interface User {
    userId: string;
    email: string;
    username: string;
  }
  
  // Extend Elysia context
  export interface AuthContext {
    user: User | null;
  }
  
  // Error types
  export class AppError extends Error {
    constructor(
      public override message: string,
      public statusCode: number = 500,
      public code?: string
    ) {
      super(message);
      this.name = 'AppError';
    }
  }