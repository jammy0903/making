// Supabase 공개 접속 정보 — anon 키는 공개 노출이 안전하도록 설계된 값(RLS 방어).
// 기존 정적 사이트도 public/config.js에 같은 값을 번들로 공개해 왔다(프로젝트 관례).
// Vercel 등에 PUBLIC_SUPABASE_* 환경변수가 있으면 그것이 우선한다.
import { env } from '$env/dynamic/public';

export const SB_URL = env.PUBLIC_SUPABASE_URL || 'https://faofjruxrabdbtesrkub.supabase.co';
export const SB_KEY =
  env.PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb2ZqcnV4cmFiZGJ0ZXNya3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODE4OTEsImV4cCI6MjA5OTE1Nzg5MX0.018PxkK231Kj6jSbD7_2JP3uE-t_7DS5ia7uQ7m7cLQ';
