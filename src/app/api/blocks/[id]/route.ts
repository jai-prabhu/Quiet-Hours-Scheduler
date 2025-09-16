import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";
import { createClient } from "@supabase/supabase-js";

function supabaseFromRequest(req: NextRequest) {

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');

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

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const sb = supabaseFromRequest(req);
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const col = db.collection('quiet_blocks');
    const _id = new ObjectId(params.id);


    const result = await col.deleteOne({ _id, user_id: user.id });

    if (result.deletedCount === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}