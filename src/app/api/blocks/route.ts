import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { en } from "@supabase/auth-ui-shared";
dayjs.extend(utc);

function supabaseFromRequest(req: NextRequest) {

    const token = req.headers.get('Authoization')?.replace('Bearer ', '');

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
        }
    );
}

export async function GET(req: NextRequest) {

    const sb = supabaseFromRequest(req);
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const blocks = await db.collection('quiet_blocks')
    .find({ user_id: user.id })
    .sort({ startAt: 1 })
    .limit(100)
    .toArray();

    return NextResponse.json(blocks);
}

export async function POST(req: NextRequest) {

    const sb = supabaseFromRequest(req);
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, startAt, endAt } = await req.json();

    const start = dayjs.utc(startAt);
    const end = dayjs.utc(endAt);

    if (!start.isValid() || !end.isValid() || !end.isAfter(start)) {

        return NextResponse.json({ error: "Invalid times" }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection('quiet_blocks');

    const overlap = await col.findOne({
        user_id: user.id,
        startAt: { $lt: end.toISOString() },
        endAt: { $gt: start.toISOString() },
    })

    if (overlap) {
        return NextResponse.json({ error: 'Block Overlaps an existing one' }, { status: 409 });
    }

    const now = dayjs.utc().toISOString();

    const doc = {

        user_id: user.id,
        title: (title ?? `Quiet Block`).toString().trim(),
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        notifyAt: start.subtract(10, 'minute').toISOString(),
        notifiedAt: null as string | null,
        status: `pending` as `pending` | `processing` | `done`,
        createdAt: now,
        updatedAt: now,
    }

    const { insertedId } = await col.insertOne(doc);
    return NextResponse.json({ _id: insertedId, ...doc }, { status: 201 });
}