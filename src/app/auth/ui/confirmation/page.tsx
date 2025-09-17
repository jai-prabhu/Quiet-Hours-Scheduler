'use client';

import { MailIcon } from "lucide-react";

export default function LoginPage() {

  return (
    <div className='max-w-screen w-full min-h-screen bg-gradient-to-br from-black via-gray-900 to-black'
    style={{fontFamily: "var(--font-poppins)"}}>
      <div className='container max-w-4xl mx-auto'>
            <div className='flex flex-col gap-8 w-full min-h-screen items-center justify-center'>
                <MailIcon className="w-24 h-24 text-primary"/>
                <h1 className='inline-flex items-center justidycenter gap-3 text-white text-2xl font-mediumd'>
                
                Password Reset Link Send to your Email...
                </h1>
            </div>
        </div>
    </div>
  )
}