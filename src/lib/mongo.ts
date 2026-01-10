import { Account, Balance, Transaction } from "@/types/finance";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.DATABASE_URL as string);

export async function getUserCloudData(userId: string): Promise<{ accounts: Account[]; balances: Balance[]; transactions?: Transaction[] } | null> {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME);
  const userCollection = db.collection<{ userId: string; accounts: Account[]; balances: Balance[]; transactions?: Transaction[] }>("user_data");

  const userData = await userCollection.findOne({ userId });

  if (!userData) {
    return null;
  }

  return {
    accounts: userData.accounts || [],
    balances: userData.balances || [],
    transactions: userData.transactions || [],
  };
}

export async function saveUserCloudData(userId: string, accounts: Account[], balances: Balance[], transactions: Transaction[]): Promise<void> {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME);
  const userCollection = db.collection<{ userId: string; accounts: Account[]; balances: Balance[]; transactions?: Transaction[] }>("user_data");

  await userCollection.updateOne(
    { userId },
    { $set: { accounts, balances, transactions } },
    { upsert: true }
  );
}

export async function deleteUserCloudData(userId: string): Promise<void> {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME);
  const userCollection = db.collection<{ userId: string; accounts: Account[]; balances: Balance[]; transactions?: Transaction[] }>("user_data");

  await userCollection.deleteOne({ userId });
}