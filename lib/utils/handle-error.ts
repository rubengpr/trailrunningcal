import { NextResponse } from 'next/server';
import {
  AuthError,
  DuplicateRaceError,
  MarkdownTooLongError,
  TimeoutError,
  ValidationError,
} from '@/lib/errors';

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (error instanceof DuplicateRaceError) {
    return NextResponse.json(
      { error: 'conflict', conflicts: error.conflicts },
      { status: 409 },
    );
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  if (error instanceof MarkdownTooLongError) {
    return NextResponse.json(
      { error: 'markdown_too_long', markdown: error.markdown },
      { status: 422 },
    );
  }

  if (error instanceof TimeoutError) {
    return NextResponse.json({ error: 'timeout' }, { status: 504 });
  }

  console.error('API error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
