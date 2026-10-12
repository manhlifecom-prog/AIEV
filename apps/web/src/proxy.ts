import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (process.env.CUSTOMER_MODE !== "1") return NextResponse.next();
  const pathname = request.nextUrl.pathname;
  if (pathname === "/studio" || pathname.startsWith("/studio/") || pathname.startsWith("/_next/") || pathname.startsWith("/api/customer/") || pathname === "/favicon.ico") return NextResponse.next();
  if (pathname.startsWith("/api/") || pathname.startsWith("/media/")) return NextResponse.json({ error: "Không tìm thấy chức năng" }, { status: 404 });
  return NextResponse.redirect(new URL("/studio", request.url));
}
export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
