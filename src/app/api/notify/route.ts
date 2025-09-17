// app/api/notify/route.ts
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/mongo";
import sgMail from "@sendgrid/mail";
import type { Collection, Document } from "mongodb";

export const runtime = "nodejs";

function timingSafeEq(a: string, b: string) {
  const A = Buffer.from(a), B = Buffer.from(b);
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

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


    const qStatus   = { status: "pending" };
    const qNotified = { $or: [ { notifiedAt: null }, { notifiedAt: { $exists: false } } ] };
    const qLease    = { $or: [ { leaseUntil: { $exists: false } }, { leaseUntil: { $lte: now } } ] };
    const qTimeExpr = { $expr: { $lte: [ { $toDate: "$notifyAt" }, windowEnd ] } };
    // const qLease   = { $or: [ { leaseUntil: { $exists: false } }, { leaseUntil: { $lte: new Date().toISOString() } } ] };

    const leased = await col.findOneAndUpdate(
    {
        ...qStatus, ...qNotified, ...qLease, ...qTimeExpr
    },
    {
        $set: {
        status: "processing",
        // keep types consistent with your string schema
        leaseUntil: new Date(Date.now() + 2 * 60_000).toISOString()
        }
    },
    { sort: { notifyAt: 1 }, returnDocument: "after" }
    );

    const b = leased?.value;
    if (!b) {
    
        console.log("Ca't find the data: ", windowEnd.toLocaleString());
        break;
    };

    try {
      if (!b.userEmail) {
        console.log("Failes to get the Email")
        throw new Error("Missing userEmail")
    };

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
