import { Account, Balance, RecurringTransaction } from "@/types/finance";
import { MongoClient } from "mongodb";

interface UserData {
  userId: string;
  accounts: Account[];
  balances: Balance[];
  calendarEvents?: RecurringTransaction[];
}

let client: MongoClient | null = null;

function getClient(): MongoClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  if (!client) {
    client = new MongoClient(databaseUrl);
  }
  return client;
}

export async function getUserCloudData(userId: string): Promise<{ accounts: Account[]; balances: Balance[]; calendarEvents: RecurringTransaction[] } | null> {
  const client = getClient();
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME);
  const userCollection = db.collection<UserData>("user_data");

  const userData = await userCollection.findOne({ userId });

  if (!userData) {
    return null;
  }

  return {
    accounts: userData.accounts || [],
    balances: userData.balances || [],
    calendarEvents: userData.calendarEvents || [],
  };
}

export async function saveUserCloudData(
  userId: string,
  accounts?: Account[],
  balances?: Balance[],
  calendarEvents?: RecurringTransaction[]
): Promise<void> {
  const client = getClient();
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME);
  const userCollection = db.collection<UserData>("user_data");

  // Only $set fields that were provided
  const setFields: Record<string, unknown> = {};
  if (accounts !== undefined) setFields.accounts = accounts;
  if (balances !== undefined) setFields.balances = balances;
  if (calendarEvents !== undefined) setFields.calendarEvents = calendarEvents;

  if (Object.keys(setFields).length === 0) return;

  await userCollection.updateOne(
    { userId },
    { $set: setFields },
    { upsert: true }
  );
}


export async function deleteUserCloudData(userId: string): Promise<void> {
  const client = getClient();
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME);
  const userCollection = db.collection<UserData>("user_data");

  await userCollection.deleteOne({ userId });
}