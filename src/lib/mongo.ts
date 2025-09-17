// lib/mongo.ts
import 'server-only';
import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import path from 'node:path';
import fs from 'node:fs';

let cached: { client: MongoClient; db: Db } | null = null;

function reqEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export async function getDb(): Promise<Db> {
  if (cached) return cached.db;

  const uri = reqEnv('MONGODB_URI');
  const dbName = reqEnv('MONGODB_DB');

  const opts: MongoClientOptions = {
    // avoids long hangs when it can’t pick a server
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 5,
  };

  // --- If you’re on DocumentDB or a custom CA, enable one of these paths ---

  // 1) Use a CA file committed in your repo (e.g., certs/rds-combined-ca-bundle.pem)
  if (process.env.MONGODB_TLS_CA_FILE === 'rds') {
    opts.tls = true;
    opts.tlsCAFile = path.join(process.cwd(), 'certs', 'rds-combined-ca-bundle.pem');
  }

  // 2) Or supply a base64-encoded PEM via env (avoids shipping a file)
  if (process.env.MONGODB_CA_B64) {
    const pemPath = '/tmp/mongo-ca.pem';
    try {
      fs.writeFileSync(pemPath, Buffer.from(process.env.MONGODB_CA_B64, 'base64'));
      opts.tls = true;
      opts.tlsCAFile = pemPath;
    } catch (e) {
      throw new Error('Failed to write MONGODB_CA_B64 to /tmp');
    }
  }

  // TEMP ONLY: to confirm it’s a CA issue (remove after testing!)
  if (process.env.MONGODB_TLS_ALLOW_INVALID === 'true') {
    
    opts.tlsAllowInvalidCertificates = true;
  }

  const client = new MongoClient(uri, opts);
  await client.connect();
  const db = client.db(dbName);

  // Create indexes once; if they already exist this is cheap
  await db.collection('quiet_blocks').createIndex({ user_id: 1, startAt: 1 }, { unique: true });
  await db.collection('quiet_blocks').createIndex({ notifyAt: 1, status: 1 });
  

  cached = { client, db };
  return db;
}
