import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = [
  '/dashboard',
  '/reset-password',
  '/restaurants',
  '/bookings',
  '/print',
  '/employees',
  '/categories',
  '/menus',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('banquate_auth_token')?.value;

  if (token) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/reset-password',
    '/restaurants/:path*',
    '/bookings/:path*',
    '/print/:path*',
    '/employees/:path*',
    '/categories/:path*',
    '/menus/:path*',
  ],
};
