"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client"; // make sure this path matches your file name
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { Clock, User, Calendar, LogOut, Plus, Trash2 } from "lucide-react";

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
  const [removing, setRemoving] = useState(false);
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

    setRemoving(true);
    const headers = await authHeader();
    const res = await fetch(`/api/blocks/${id}`, {
      method: "DELETE",
      headers,
    });
    if (res.ok) await refresh();

    setRemoving(false);
  }

  const handleSignOut = async () => {
    await createClient().auth.signOut();
    router.push("/login");
  };

  // ✅ compute min strings in LOCAL format (not ISO/UTC)
  const nowLocalMin = toLocalInput(new Date());
  const endMin = startLocal || nowLocalMin;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Enhanced Header */}
        <header className="bg-gray-700 rounded-xl p-6 shadow-sm border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-background">Focus Dashboard</h1>
                <p className="text-gray-400 mt-1">Manage your quiet blocks and stay productive</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <User className="h-4 w-4" />
                  <span>{email ?? "Loading..."}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                  <Calendar className="h-3 w-3" />
                  <span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-4 py-2 bg-primary hover:bg-teal-600 text-white cursor-pointer hover:text-background rounded-lg transition-colors duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Enhanced Form Section */}
        <section className="bg-gray-700 rounded-xl p-6 shadow-sm border border-gray-700">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Plus className="h-5 w-5 text-secondary" />
            </div>
            <h2 className="text-xl font-semibold text-background">Create New Quiet Block</h2>
          </div>

          <form onSubmit={createBlock} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-background mb-2">Block Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-500 bg-gray-700 rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent 
                transition-all duration-200 text-gray-100 placeholder-gray-500-foreground"
                placeholder="Enter a descriptive title for your focus time"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-background mb-2">Start Time</label>
                <input
                  type="datetime-local"
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-500 bg-gray-700 rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent 
                transition-all duration-200 text-gray-100 placeholder-gray-500-foreground"
                  step={60}
                  min={nowLocalMin}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-background mb-2">End Time</label>
                <input
                  type="datetime-local"
                  value={endLocal}
                  onChange={(e) => setEndLocal(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-500 bg-gray-700 rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent 
                transition-all duration-200 text-gray-100 placeholder-gray-500-foreground"
                  step={60}
                  min={endMin}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-medium rounded-lg transition-colors duration-200 disabled:cursor-not-allowed
              cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent"></div>
                  <span>Creating Block...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Create Quiet Block</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* Enhanced Blocks List */}
        <section className="bg-gray-700 rounded-xl p-6 shadow-sm border border-gray-700">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Calendar className="h-5 w-5 text-accent" />
            </div>
            <h2 className="text-xl font-semibold text-background">Upcoming Quiet Blocks</h2>
            {items.length > 0 && (
              <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium">
                {items.length} scheduled
              </span>
            )}
          </div>

          <div className="space-y-4">
            {items.map((b) => (
              <div
                key={b._id}
                className="bg-gray-500/30 border bg-gray-700 rounded-lg p-4 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-background text-lg">{b.title}</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          b.status === "done"
                            ? "bg-green-100 text-green-800"
                            : b.status === "processing"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-gray-300">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {new Date(b.startAt).toLocaleString()} → {new Date(b.endAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs">Notification:</span>
                        <span>{new Date(b.notifyAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => remove(b._id)}
                    className="flex items-center space-x-1 px-3 py-2 text-red-500 hover:bg-destructive/10 rounded-lg transition-colors duration-200 group cursor-pointer"
                  >
                    {removing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-destructive border-t-transparent mr-4"></div>
                        <span className="text-sm">Removing...</span>
                      </>
                    ): (
                      <>
                        <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                        <span className="text-sm">Remove</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="text-center py-12">
                <div className="p-4 bg-gray-500/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-gray-300 text-lg mb-2">No quiet blocks scheduled</p>
                <p className="text-gray-300 text-sm">
                  Create your first block above to get started with focused work sessions.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
