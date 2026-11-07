import { NextResponse, type NextRequest } from "next/server";

/**
 * Checagem otimista: sem cookie de sessão, nem tenta abrir as telas internas.
 * A validação de verdade acontece no servidor (requireUser), perto dos dados.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("pv_session")) {
    const url = new URL("/entrar", request.url);
    const path = request.nextUrl.pathname + request.nextUrl.search;
    if (path !== "/") url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/armario/:path*", "/adicionar/:path*", "/roupa/:path*", "/look/:path*", "/perfil/:path*"],
};
