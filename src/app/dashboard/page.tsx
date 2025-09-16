"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client"; // make sure this path matches your file name
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(utc);
dayjs.extend(isSameOrBefore);

type Block = {
  _id: string;
  title: string;
  startAt: string;
  endAt: string;
  notifyAt: string;
  status: "pending" | "processing" | "done";
};

export default function Dashboard() {
  const [email, setEmail] = useState<string | null>(null);
  const [title, setTitle] = useState("Study Time");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [items, setItems] = useState<Block[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // helper: format Date -> 'YYYY-MM-DDTHH:mm' in LOCAL time
  const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await createClient().auth.getUser();
      setEmail(user?.email ?? null);
      await refresh();
    })();
  }, []);

  // ✅ set sensible defaults ONCE
  useEffect(() => {
    if (!startLocal && !endLocal) {
      const now = new Date();
      const start = new Date(now.getTime() + 30 * 60_000); // +30 min
      const end = new Date(start.getTime() + 60 * 60_000); // +1 hour
      setStartLocal(toLocalInput(start));
      setEndLocal(toLocalInput(end));
    }
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function authHeader(): Promise<HeadersInit> {
    const {
      data: { session },
    } = await createClient().auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function refresh() {
    const headers = await authHeader();
    const res = await fetch("/api/blocks", { headers });
    if (res.ok) {
      const blocks = await res.json();
      setItems(blocks);
    }
  }

  async function createBlock(e: React.FormEvent) {
    e.preventDefault();

    if (!startLocal || !endLocal) {
      alert("Please pick start and end time.");
      return;
    }

    if (dayjs(endLocal).isSameOrBefore(dayjs(startLocal))) {
      alert("End time must be after start time.");
      return;
    }

    setLoading(true);

    const headers = {
      "Content-Type": "application/json",
      ...(await authHeader()),
    };

    // Convert local -> UTC ISO for API
    const startAt = dayjs(startLocal).utc().toISOString();
    const endAt = dayjs(endLocal).utc().toISOString();

    const res = await fetch("/api/blocks", {
      method: "POST",
      headers,
      body: JSON.stringify({ title, startAt, endAt }),
    });

    setLoading(false);

    if (res.ok) {
      setTitle("Study Time");
      // keep values so user sees what they created, or clear if you prefer:
      // setStartLocal(""); setEndLocal("");
      await refresh();
    } else {
      const err = await res.json();
      alert(err.error ?? "Error creating block");
    }
  }

  async function remove(id: string) {
    const headers = await authHeader();
    const res = await fetch(`/api/blocks/${id}`, {
      method: "DELETE",
      headers,
    });
    if (res.ok) await refresh();
  }

  const handleSignOut = async () => {
    await createClient().auth.signOut();
    router.push("/login");
  };

  // ✅ compute min strings in LOCAL format (not ISO/UTC)
  const nowLocalMin = toLocalInput(new Date());
  const endMin = startLocal || nowLocalMin;

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-500">Signed in as: {email ?? "..."}</p>
          <p className="text-xs text-gray-500">
            Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </p>
        </div>
        <button className="rounded-lg px-4 py-2 border" onClick={handleSignOut}>
          Sign Out
        </button>
      </header>

      <section className="border rounded-xl p-4">
        <h2 className="font-medium mb-3">Add Quiet Block</h2>
        <form onSubmit={createBlock} className="grid gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border rounded px-3 py-2"
            placeholder="Title"
            required
          />

          <label className="text-sm">Start</label>
          <input
            type="datetime-local"
            value={startLocal}
            onChange={(e) => setStartLocal(e.target.value)}
            className="border rounded px-3 py-2"
            step={60}
            min={nowLocalMin} // ✅ local min
            required
          />

          <label className="text-sm">End</label>
          <input
            type="datetime-local"
            value={endLocal}
            onChange={(e) => setEndLocal(e.target.value)}
            className="border rounded px-3 py-2"
            step={60}
            min={endMin} // ✅ cannot be before start
            required
          />

          <button type="submit" disabled={loading} className="rounded-lg px-4 py-2 border">
            {loading ? "Saving…" : "Create Block"}
          </button>
        </form>
      </section>

      <section className="border rounded-xl p-4">
        <h2 className="font-medium mb-3">Upcoming Blocks</h2>
        <ul className="space-y-2">
          {items.map((b) => (
            <li key={b._id} className="flex items-center justify-between border rounded px-3 py-2">
              <div className="text-sm">
                <div className="font-medium">{b.title}</div>
                <div>
                  {new Date(b.startAt).toLocaleString()} → {new Date(b.endAt).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  notify at: {new Date(b.notifyAt).toLocaleString()} · status: {b.status}
                </div>
              </div>
              <button
                onClick={() => remove(b._id)}
                className="text-sm text-red-500 hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
          {items.length === 0 && <p className="text-sm text-gray-500">No blocks yet.</p>}
        </ul>
      </section>
    </main>
  );
}
