'use client';

import { CheckCircleIcon } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EmailConfirmed() {

    const router = useRouter();

    useEffect(() => {
    const timeout = setTimeout(() => {
      router.push("/login");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className='max-w-screen w-full min-h-screen bg-gradient-to-br from-black via-gray-900 to-black'
    style={{fontFamily: "var(--font-poppins)"}}>
      <div className='container max-w-4xl mx-auto'>
            <div className='flex flex-col gap-8 w-full min-h-screen items-center justify-center'>
                <CheckCircleIcon className="w-24 h-24 text-primary"/>
                <div className="flex items-center gap-2 justify-center">
                    <h1 className='inline-flex items-center justidycenter gap-3 text-white text-2xl font-mediumd'>
                
                      Your Email is Verifyed Successfully!
                     </h1>
                     <button className="text-primary hover:text-teal-500 cursor-pointer hover:underline transition-all duration-300 text-2xl">
                        Login....
                     </button>
                </div>
            </div>
        </div>
    </div>
  )
}