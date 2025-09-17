import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";


export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // ⬅️ await the promised params

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const col = db.collection('quiet_blocks');
    const _id = new ObjectId(id);

    // Delete the quiet block only if it belongs to the authenticated user
    const result = await col.deleteOne({ _id, user_id: user.id });

    if (result.deletedCount === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}
