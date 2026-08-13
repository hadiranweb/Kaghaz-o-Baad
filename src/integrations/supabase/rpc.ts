import { supabase } from './client';

/**
 * فراخوانی تایپ‌شدهٔ توابع RPC سفارشی
 *
 * تایپ‌های تولیدشدهٔ Supabase فقط توابع شناخته‌شده (مانند has_role) را دارند؛
 * این کمکی، فراخوانی توابع سفارشی (پجینیشن، مدارشکن و…) را بدون خطای تایپ ممکن می‌کند.
 */
export interface RpcResult<T> {
  data: T | null;
  error: { message: string } | null;
}

export function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<RpcResult<T>> {
  return (supabase.rpc as unknown as (name: string, params?: Record<string, unknown>) => Promise<RpcResult<T>>)(
    fn,
    args,
  );
}
