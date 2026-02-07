import type { User } from './types'
import 'elysia';
declare module 'elysia' {
  interface Context {
    user: User | null
  }
}




declare module 'elysia' {
  interface Context {
    clientIp: string;
  }
}