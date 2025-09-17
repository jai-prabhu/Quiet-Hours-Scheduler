'use client';

import { resetPassword } from './action'
import { useState } from "react";
import { UserIcon, LockIcon } from "lucide-react";

export default function LoginPage() {

  const [ loading, setLoading ] = useState(false);

  const [ password, setPassword ] = useState("");

  return (
    <div className='max-w-screen w-full min-h-screen bg-gradient-to-br from-black via-gray-900 to-black'
    style={{fontFamily: "var(--font-poppins)"}}>
      <div className='container max-w-md mx-auto'>
      <div className='flex flex-col gap-8 w-full min-h-screen items-center justify-center'>
        <h1 className='inline-flex items-center justidycenter gap-3 text-white text-2xl font-mediumd'>
          <UserIcon/>
          Set new Password
        </h1>
        <div className='bg-slate-700/30 p-6 w-full rounded-lg border text-background border-slate-700 backdrop-blur-lg
        drop-shadow-md drop-shadow-slate-600 backdrop-brightness-150'>
          <form className='flex flex-col justify-center gap-4 w-full'
          onSubmit={
            async (e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault();

              if (loading) return;
              
              setLoading(true);

              const formData = new FormData();
                
              formData.append('password', password);

              try {
                await resetPassword(formData)
              } catch (err) {
                console.error(err);
              } finally {
                setLoading(false);
              }
            }
          }>
            <label className='inline-flex gap-2 text-lg items-center text-start w-full'>
              <LockIcon className='w-5 h-5'/>
              Password
            </label>
            <input
            type="password"
            placeholder='password'
            id='password'
            name='password'
            onChange={e => { setPassword(e.target.value) }}
            className='w-full placeholder-gray-500 border border border-slate-500 px-4 py-2 rounded-lg'
            />
            <button
            className='px-4 py-2 bg-teal-600 rounded-lg cursor-pointer
            hover:bg-teal-700 hover:scale-102 transition-all duration-300 active:scale-102
            border border-teal-700 disabled:opacity-50 disabled:scale-100 disabled:bg-teal-600'
            disabled={ loading || !password }
            type="submit">
              {loading ? (
                <div className='flex items-center justify-center gap-2'>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent"></div>
                  <span>Resetting Password...</span>
                </div>
              ) : (
                <>
                  <span>Reset Password</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      </div>
    </div>
  )
}