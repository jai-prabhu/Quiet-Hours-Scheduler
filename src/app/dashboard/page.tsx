"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

export default function Dashboard() {

    const [ email, setEmail ] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setEmail(user ?.email ?? null);
        })();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <main className="max-w-2xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
            <p className="mb-6">Signed in as: { email ?? '...' }</p>
            <button
            onClick={handleSignOut}
            className="rounded-lg px-4 py-2 border">
                Sign Out
            </button>
        </main>
    );
    
}