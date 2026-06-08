import { NextResponse } from "next/server";

/**
 * Standard success response
 */
export function success<T>(data: T, message?: string, status = 200) {
  return NextResponse.json(
    { data, ...(message && { message }) },
    { status }
  );
}

/**
 * Paginated success response
 */
export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

/**
 * Error response
 */
export function error(
  message: string,
  status = 400,
  details?: unknown
) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status }
  );
}

/**
 * Parse pagination params from URL search params
 */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
