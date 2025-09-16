import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB!;

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb() {

    if (db) return db;
    
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    

    await db.collection('quiet_blocks').createIndex({ user_id: 1, startAt: 1 }, { unique: true });
    await db.collection('quiet_blocks').createIndex({ notifyAt: 1, status: 1 });

    return db;
}