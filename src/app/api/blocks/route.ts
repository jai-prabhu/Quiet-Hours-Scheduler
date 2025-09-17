import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { createClient } from "@/utils/supabase/server";
dayjs.extend(utc);

export const runtime = "nodejs";


export async function GET(req: NextRequest) {

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const blocks = await db
    .collection("quiet_blocks")
    .find({ user_id: user.id })
    .sort({ startAt: 1 })
    .limit(100)
    .toArray();

  return NextResponse.json(blocks);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, startAt, endAt } = await req.json();

  const start = dayjs.utc(startAt);
  const end = dayjs.utc(endAt);

  if (!start.isValid() || !end.isValid() || !end.isAfter(start)) {
    return NextResponse.json({ error: "Invalid times" }, { status: 400 });
  }

  const db = await getDb();
  const col = db.collection("quiet_blocks");

  const overlap = await col.findOne({
    user_id: user.id,
    startAt: { $lt: end.toISOString() },
    endAt: { $gt: start.toISOString() },
  });

  if (overlap) {
    return NextResponse.json({ error: "Block Overlaps an existing one" }, { status: 409 });
  }

  const now = dayjs.utc().toISOString();

  const doc = {
    user_id: user.id,
    user_email: user.email ?? null,
    title: (title ?? `Quiet Block`).toString().trim(),
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    notifyAt: start.subtract(10, "minute").toISOString(),
    notifiedAt: null as string | null,
    status: `pending` as `pending` | `processing` | `done`,
    createdAt: now,
    updatedAt: now,
  };

  const { insertedId } = await col.insertOne(doc);
  return NextResponse.json({ _id: insertedId, ...doc }, { status: 201 });
}
