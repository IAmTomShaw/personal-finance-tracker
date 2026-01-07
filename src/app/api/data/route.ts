import { NextResponse, NextRequest } from "next/server";
import { auth0, isAuth0Configured } from "@/lib/auth0";
import { deleteUserCloudData, getUserCloudData, saveUserCloudData } from "@/lib/mongo";

export const runtime = 'nodejs';

// GET data

export async function GET() {

  if (!isAuth0Configured || !auth0 || !process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'Cloud sync unavailable: Auth0 or database not configured' },
      { status: 503 }
    );
  }

  // Get the user ID from the session

  const session = await auth0.getSession();

  if (!session) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  const userId = session.user.sub;

  // Get user cloud data from the database

  const userData = await getUserCloudData(userId);

  return NextResponse.json(userData);

}

// POST data

export async function POST(request: NextRequest) {

  if (!isAuth0Configured || !auth0 || !process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'Cloud sync unavailable: Auth0 or database not configured' },
      { status: 503 }
    );
  }

  const session = await auth0.getSession();

  if (!session) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  // Limit the size of the request body to prevent large payloads

  const MAX_BODY_SIZE = 1e6; // 1 MB

  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
    return NextResponse.json(
      { error: 'Request body too large' },
      { status: 413 }
    );
  }

  const userId = session.user.sub;

  const body = await request.json();

  await saveUserCloudData(userId, body.accounts, body.balances);

  return NextResponse.json(
    { message: 'Cloud data saved successfully' },
    { status: 200 }
  );
}

export async function DELETE() {

  if (!isAuth0Configured || !auth0 || !process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'Cloud sync unavailable: Auth0 or database not configured' },
      { status: 503 }
    );
  }

  const session = await auth0.getSession();

  if (!session) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  const userId = session.user.sub;

  await deleteUserCloudData(userId);

  return NextResponse.json(
    { message: 'Cloud data deleted successfully' },
    { status: 200 }
  );
}