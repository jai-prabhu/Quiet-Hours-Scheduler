// app/api/notify/route.ts
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/mongo";
import sgMail from "@sendgrid/mail";

export const runtime = "nodejs";

function timingSafeEq(a: string, b: string) {
  const A = Buffer.from(a), B = Buffer.from(b);
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

type QuietDoc = {
  _id: string
  title?: string
  status?: string
  notifyAt?: string | Date
  notifiedAt?: string | Date | null
  leaseUntil?: string | Date | null
};

function bool(v: boolean) { return v ? "true" : "false"; }

function flagsForDoc(d: QuietDoc, now: Date, windowEnd: Date) {
  const statusOk   = d.status === "pending";
  const notifiedOk = d.notifiedAt == null; // null or missing (we’ll treat missing as null in agg)
  const leaseOk    = !d.leaseUntil || new Date(d.leaseUntil ?? "") <= now;
  const timeOk     = new Date(d.notifyAt ?? "") <= windowEnd; // string ISO is fine here
  const wouldMatch = statusOk && notifiedOk && leaseOk && timeOk;

  return { statusOk, notifiedOk, leaseOk, timeOk, wouldMatch };
}

import type { Collection, Document } from "mongodb";

async function logDebugSnapshot(col: Collection<Document>, now: Date, windowEnd: Date) {
  // Unified counters that match your $expr leasing logic
  const qStatus   = { status: "pending" };
  const qNotified = { $or: [ { notifiedAt: null }, { notifiedAt: { $exists: false } } ] };
  const qLease    = { $or: [ { leaseUntil: { $exists: false } }, { leaseUntil: { $lte: now } } ] };
  const qTimeExpr = { $expr: { $lte: [ { $toDate: "$notifyAt" }, windowEnd ] } };

  const [cTotal, cStatus, cNotified, cLease, cTime, cFinal] = await Promise.all([
    col.estimatedDocumentCount(),
    col.countDocuments(qStatus),
    col.countDocuments(qNotified),
    col.countDocuments(qLease),
    col.countDocuments(qTimeExpr),
    col.countDocuments({ ...qStatus, ...qNotified, ...qLease, ...qTimeExpr }),
  ]);

  console.log("[notify] counts", { cTotal, cStatus, cNotified, cLease, cTime, cFinal, windowEnd });

  // Peek a few earliest-by-time and print booleans per clause
  const peek = await col.aggregate([
    { $addFields: {
        // normalize for printing; we won’t change stored schema
        _notifiedMissing: { $eq: [ { $type: "$notifiedAt" }, "missing" ] },
        parsedNotifyAt: { $convert: { input: "$notifyAt", to: "date", onError: null, onNull: null } },
        parsedLeaseUntil: { $convert: { input: "$leaseUntil", to: "date", onError: null, onNull: null } },
      }
    },
    { $sort: { notifyAt: 1 } },
    { $limit: 5 },
  ]).toArray();

  console.log("[notify] sample flags (first 5 by notifyAt):");
  for (const d of peek) {
    const doc: QuietDoc = {
      _id: d._id,
      title: d.title,
      status: d.status,
      notifyAt: d.notifyAt ?? d.parsedNotifyAt,
      notifiedAt: (d._notifiedMissing ? null : d.notifiedAt),
      leaseUntil: d.leaseUntil ?? d.parsedLeaseUntil,
    };
    const f = flagsForDoc(doc, now, windowEnd);
    console.log(`• ${doc.title ?? "(no title)"} ${String(doc._id)}`);
    console.log(`  statusOk=${bool(f.statusOk)}  notifiedOk=${bool(f.notifiedOk)}  leaseOk=${bool(f.leaseOk)}  timeOk=${bool(f.timeOk)}  → wouldMatch=${bool(f.wouldMatch)}`);
    console.log(`  notifyAt=${doc.notifyAt}  notifiedAt=${doc.notifiedAt}  leaseUntil=${doc.leaseUntil}`);
  }
}

export async function POST(req: Request) {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET missing" }, { status: 500 });

  // Auth (trim, timing-safe)
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!timingSafeEq(token, secret)) {
    console.log("notify 401", { hasBearer: auth.startsWith("Bearer "), tokenLen: token.length });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // SendGrid readiness (fail fast with clear message)
  const sgKey = process.env.SENDGRID_API_KEY;
  const from = process.env.FROM_EMAIL;
  if (!sgKey || !from) {
    return NextResponse.json({ error: "Email not configured" }, { status: 500 });
  }
  sgMail.setApiKey(sgKey);

  const db = await getDb();
  const col = db.collection("quiet_blocks");

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 60_000);

  await logDebugSnapshot(col, now, windowEnd);

  let processed = 0;
  const limit = 100;

  for (let i = 0; i < limit; i++) {

    const windowEndISO = new Date(Date.now() + 60_000).toISOString();

    const qStatus     = { status: "pending" };
    const qNotified   = { $or: [ { notifiedAt: null }, { notifiedAt: { $exists: false } } ] };
    const qTime       = { notifyAt: { $lte: windowEndISO } };
    // const qLease   = { $or: [ { leaseUntil: { $exists: false } }, { leaseUntil: { $lte: new Date().toISOString() } } ] };

    const cTotal    = await col.estimatedDocumentCount();
    const cStatus   = await col.countDocuments(qStatus);
    const cNotified = await col.countDocuments(qNotified);
    const cTime     = await col.countDocuments(qTime);
    // const cLease = await col.countDocuments(qLease);
    const cFinal    = await col.countDocuments({ ...qStatus, ...qNotified, ...qTime /*, ...qLease*/ });

    console.log({ cTotal, cStatus, cNotified, cTime, /* cLease, */ cFinal, windowEndISO });


    const leased = await col.findOneAndUpdate(
      {
        status: "pending",
        $and: [
            { $or: [ { notifiedAt: null }, { notifiedAt: { $exists: false } } ] },
            { $or: [ { leaseUntil: { $exists: false } }, { leaseUntil: { $lte: now } } ] },
            // Coerce notifyAt to Date at query time (works if stored as string or number)
            { $expr: { $lte: [ { $toDate: "$notifyAt" }, windowEnd ] } },
        ],
      },
      {
        $set: { status: "processing", leaseUntil: new Date(now.getTime() + 2 * 60_000) },
      },
      { sort: { notifyAt: 1 }, returnDocument: "after" }
    );

    const b = leased?.value;
    if (!b) {
    
        console.log("Ca't find the data: ", windowEnd.toLocaleString());
        break;
    };

    try {
      if (!b.userEmail) throw new Error("Missing userEmail");

      const subject = `Reminder: “${b.title}” starts soon`;
      const html = `
        <h2>Quiet time starts soon</h2>
        <p><b>${b.title}</b> begins in ~10 minutes.</p>
        <p><small>${new Date(b.startAt).toLocaleString()} → ${new Date(b.endAt).toLocaleString()}</small></p>
      `;

      await sgMail.send({ to: b.userEmail, from, subject, html });

      await col.updateOne(
        { _id: b._id },
        { $set: { status: "done", notifiedAt: new Date(), leaseUntil: null } }
      );
      processed++;
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      console.error("notify send failed", { id: String(b._id), code: err?.code, msg: err?.message });
      await col.updateOne(
        { _id: b._id },
        { $set: { status: "pending", leaseUntil: null }, $inc: { attempts: 1 } }
      );
      // Optional: backoff if attempts too high:
      // if ((b.attempts??0) >= 5) set status:"error" to avoid infinite loops
    }
  }

  return NextResponse.json({ ok: true, processed, windowTo: windowEnd.toISOString() });
}

export async function GET(req: Request) {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  const token = new URL(req.url).searchParams.get("token")?.trim() || "";
  if (!timingSafeEq(token, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Reuse POST logic
  return POST(new Request(new URL(req.url).origin + "/api/notify", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  }));
}
