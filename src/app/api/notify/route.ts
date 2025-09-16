import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export const runtime = "nodejs"; // ensure Node runtime on Vercel

export async function POST(req: Request) {
  // Simple auth for the cron call
  const auth = req.headers.get("authorization") || "";
  const ok = auth === `Bearer ${process.env.CRON_SECRET}`;
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const col = db.collection("quiet_blocks");

  const now = new Date();
  const inOneMinute = new Date(now.getTime() + 60_000);

  let processed = 0;
  const limit = 100; // per run

  for (let i = 0; i < limit; i++) {
    // Lease one due document atomically to avoid duplicates
    const leased = await col.findOneAndUpdate(
      {
        status: "pending",
        notifiedAt: null,
        notifyAt: { $lte: inOneMinute.toISOString() },
      },
      { $set: { status: "processing" } },
      { sort: { notifyAt: 1 }, returnDocument: "after" }
    );

    if (leased === null) break;

    const b = leased.value;
    if (!b) break;

    try {
      if (!b.userEmail) throw new Error("Missing userEmail");

      const subject = `Reminder: “${b.title}” starts soon`;
      const html = `
        <h2>Quiet time starts soon</h2>
        <p><b>${b.title}</b> begins in ~10 minutes.</p>
        <p><small>${new Date(b.startAt).toLocaleString()} → ${new Date(b.endAt).toLocaleString()}</small></p>
      `;

      await sgMail.send({
        to: b.userEmail,
        from: process.env.FROM_EMAIL!, // must be verified in SendGrid
        subject,
        html,
      });

      await col.updateOne(
        { _id: b._id },
        { $set: { status: "done", notifiedAt: new Date().toISOString() } }
      );
      processed++;
    } catch (e) {
      // Release the lease so it retries next run
      await col.updateOne({ _id: b._id }, { $set: { status: "pending" } });
      // Optional: log errors to a collection
      // await db.collection("notify_errors").insertOne({ blockId: b._id, err: String(e), at: new Date() })
    }
  }

  return NextResponse.json({ ok: true, processed });
}

// Optional GET to test quickly in the browser (remove in prod)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = await POST(new Request(req.url, { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }));
  return res;
}
