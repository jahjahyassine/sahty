import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { defaultLocale, isAppLocale } from '@/i18n/config';
import { DEMO_AUTH_SECRET } from '@/lib/demo/config';

const PUBLIC_PATHS = ['/login', '/register'];

function roleHome(locale: string, role?: string) {
  if (role === 'DOCTOR') return `/${locale}/doctor`;
  if (role === 'PATIENT') return `/${locale}/patient`;
  return `/${locale}/login`;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  const maybeLocale = segments[0];

  if (!isAppLocale(maybeLocale)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = maybeLocale;
  const path = `/${segments.slice(1).join('/')}`;
  const token = await getToken({ req: request, secret: DEMO_AUTH_SECRET });
  const role = token?.role as string | undefined;

  // Racine de la locale → tableau de bord ou connexion
  if (path === '/' || path === '') {
    return NextResponse.redirect(new URL(roleHome(locale, role), request.url));
  }

  if (path.startsWith('/dev')) {
    if (process.env.NODE_ENV !== 'production') return NextResponse.next();
    return NextResponse.redirect(new URL(roleHome(locale, role), request.url));
  }

  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
    // Pages publiques toujours accessibles : une session périmée (utilisateur supprimé,
    // secret changé…) ne doit pas provoquer une boucle de redirections.
    return NextResponse.next();
  }

  if (!token) {
    const url = new URL(`/${locale}/login`, request.url);
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }

  if (path.startsWith('/patient') && role !== 'PATIENT') {
    return NextResponse.redirect(new URL(roleHome(locale, role), request.url));
  }
  if (path.startsWith('/doctor') && role !== 'DOCTOR') {
    return NextResponse.redirect(new URL(roleHome(locale, role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|.*\\..*).*)'],
};
