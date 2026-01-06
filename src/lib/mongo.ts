import { Account, Balance } from "@/types/finance";
import { MongoClient } from "mongodb";

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

export async function getUserCloudData(userId: string): Promise<{ accounts: Account[]; balances: Balance[] } | null> {
  const client = getClient();
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME);
  const userCollection = db.collection<{ userId: string; accounts: Account[]; balances: Balance[] }>("user_data");

  const userData = await userCollection.findOne({ userId });

  if (!userData) {
    return null;
  }

  return {
    accounts: userData.accounts || [],
    balances: userData.balances || [],
  };
}

export async function saveUserCloudData(userId: string, accounts: Account[], balances: Balance[]): Promise<void> {
  const client = getClient();
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME);
  const userCollection = db.collection<{ userId: string; accounts: Account[]; balances: Balance[] }>("user_data");

  await userCollection.updateOne(
    { userId },
    { $set: { accounts, balances } },
    { upsert: true }
  );
}


export async function deleteUserCloudData(userId: string): Promise<void> {
  const client = getClient();
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME);
  const userCollection = db.collection<{ userId: string; accounts: Account[]; balances: Balance[] }>("user_data");

  await userCollection.deleteOne({ userId });
}