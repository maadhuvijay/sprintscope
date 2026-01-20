import { NextResponse } from 'next/server';

/**
 * Health check endpoint to verify environment variables and configuration
 * Useful for debugging production issues
 */
export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    checks: {
      anthropic: {
        configured: !!process.env.ANTHROPIC_API_KEY,
        keyLength: process.env.ANTHROPIC_API_KEY?.length || 0,
        keyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 10) || 'not set',
      },
      supabase: {
        urlConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL || !!process.env.SUPABASE_URL,
        url: (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'not set').substring(0, 30) + '...',
        anonKeyConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceKeyConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        anonKeyLength: (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').length,
        serviceKeyLength: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length,
      },
    },
    status: 'unknown' as 'healthy' | 'degraded' | 'unhealthy',
  };

  // Determine overall status
  const hasAnthropic = checks.checks.anthropic.configured;
  const hasSupabaseUrl = checks.checks.supabase.urlConfigured;
  const hasSupabaseKey = checks.checks.supabase.anonKeyConfigured || checks.checks.supabase.serviceKeyConfigured;

  if (hasAnthropic && hasSupabaseUrl && hasSupabaseKey) {
    checks.status = 'healthy';
  } else if (hasAnthropic || (hasSupabaseUrl && hasSupabaseKey)) {
    checks.status = 'degraded';
  } else {
    checks.status = 'unhealthy';
  }

  const statusCode = checks.status === 'healthy' ? 200 : checks.status === 'degraded' ? 200 : 503;

  return NextResponse.json(checks, { status: statusCode });
}
