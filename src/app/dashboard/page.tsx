"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

type Block = {

    _id: string;
    title: string;
    startAt: string;
    endAt: string;
    notifyAt: string;
    status: 'pending' | 'processing' | 'done';
}

export default function Dashboard() {

    const [ email, setEmail ] = useState<string | null>(null);
    const [ title, setTitle ] = useState('Study Time');
    const [ startLocal, setStartLocal ] = useState('');
    const [ endLocal, setEndLocal ] = useState('');
    const [ items, setItems ] = useState<Block[]>([]);
    const [ loading, setLoading ] = useState(false);
    const router = useRouter();

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setEmail(user ?.email ?? null);
            await refresh();
        })();
    }, []);

    useEffect(() => {
        if (!startLocal && !endLocal) {
            const pad = (n: number) => n.toString().padStart(2, '0');
            const toLocalInput = (d: Date) => {
                return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            }

            const now = new Date();
            const start = new Date(now.getTime() + 30 * 60_000);
            const end = new Date(now.getTime() + 90 * 60_000);
        };
    })

    async function authHeader() : Promise<HeadersInit> {

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    async function refresh() {

        const headers = await authHeader();

        const res = await fetch('/api/blocks',  { headers });

        if (res.ok) {
            const blocks = await res.json();
            setItems(blocks);
        }
    }

    async function createBlock(e: React.FormEvent) {
        e.preventDefault();

        if (!startLocal || !endLocal) await refresh();

        setLoading(true);

        const headers = {

            'Content-Type': 'application/json',
            ...(await authHeader()),
        };

        const startAt = dayjs(startLocal).utc().toISOString();
        const endAt = dayjs(endLocal).utc().toISOString();

        const res = await fetch('/api/blocks', {
            method: 'POST',
            headers,
            body: JSON.stringify({ title, startAt, endAt }),
        });

        setLoading(false);

        if (res.ok) {
            setTitle('Study Time');
            setStartLocal('');
            setEndLocal('');
            await refresh();
        }
        else {
            const err = await res.json();
            alert(err.error ?? 'Error creating block');
        }
    }

    async function remove (id: string) {

        const headers = await authHeader();

        const res = await fetch(`/api/blocks/${id}`, {
            method: 'DELETE',
            headers,
        });

        if (res.ok) {
            await refresh();
        }
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <main className="max-w-2xl mx-auto p-6 space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Dashboard</h1>
                    <p className="text-sm text-gray-500">Signed in as: { email ?? '...' }</p>
                </div>
                <button className="rounded-lg px-4 py-2 boder"
                    onClick={handleSignOut}
                >
                    Sign Out

                </button>
            </header>
            <section className="border rounded-xl p-4">
                <h2 className="font-medium mb-3">Add Quiet Block</h2>
                <form
                onSubmit={createBlock}
                className="grid gap-3">
                    <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="border rounded px-3 py-2"
                    placeholder="Title"/>
                    <label className="text-sm">Start</label>
                    <input
                    type="datetime-local"
                    value={startLocal}
                    onChange={e => setStartLocal(e.target.value)}
                    className="border rounded px-3 py-2"
                    step={60}
                    min={new Date(Date.now() - 60_000).toISOString().slice(0, 16)}
                    required/>
                    <label className="text-sm">End</label>
                    <input
                    type="datetime-local"
                    value={endLocal}
                    onChange={e => setEndLocal(e.target.value)}
                    className="border rounded px-3 py-2"
                    step={60}
                    min={ startLocal || new Date().toISOString().slice(0, 16) }
                    required
                    />
                    <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg px-4 py-2 border">
                        { loading ? 'Saving..' : 'Create Block' }
                    </button>
                </form>
            </section>

            <section className="border rounded-xl p-4">
                <h2 className="font-medium mb-3">
                    Upcoming Blocks
                </h2>
                <ul className="space-y-2">
                    {items.map(b => {
                        return (
                            <li key={b._id}
                            className="flex items-center justify-between border rounded px-3 py-2">
                                <div className="text-sm">
                                    <div className="font-medium">{b.title}</div>
                                    <div>
                                        { new Date(b.startAt).toLocaleString() } -{'>'} {new Date(b.endAt).toLocaleString() }
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        notify at: { new Date(b.notifyAt).toLocaleString()} - status: {b.status}
                                    </div>
                                </div>
                                <button
                                onClick={() => {
                                    remove(b._id);
                                }}
                                className="text-sm text-red-500 hover:underline">
                                    Remove  

                                </button>
                            </li>
                        )
                    })}
                    { items.length === 0 && <p className="text-sm text-gray-500">No blocks yet.</p>}
                </ul>
            </section>
        </main>
    );
    
}