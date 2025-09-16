'use client';

import { login, signup } from './actions'
import { useState } from "react";
import { UserIcon, LockIcon, MailIcon } from "lucide-react";

export default function LoginPage() {

  const [ haveAccount, setHaveAccount ] = useState(true);

  return (
    <div className='max-w-screen w-full min-h-screen bg-gradient-to-br from-black via-gray-900 to-black'
    style={{fontFamily: "var(--font-poppins)"}}>
      <div className='container max-w-md mx-auto'>
      <div className='flex flex-col gap-8 w-full min-h-screen items-center justify-center'>
        <h1 className='inline-flex items-center justidycenter gap-3 text-white text-2xl font-mediumd'>
          <UserIcon/>
          { haveAccount ? `Log In` : `Register` }
        </h1>
        <div className='bg-slate-700/30 p-6 w-full rounded-lg border border-slate-700 backdrop-blur-lg
        drop-shadow-md drop-shadow-slate-600 backdrop-brightness-150 '>
          <form className='flex flex-col justify-center gap-4 w-full'>
            <label className='inline-flex gap-2 text-lg items-center text-start w-full'>
              <MailIcon className='w-5 h-5'/>
              Email
            </label>
            <input
            type="email"
            placeholder='Email'
            id='email'
            name='email'
            className='w-full border border border-slate-500 px-4 py-2 rounded-lg'
            />
            <label className='inline-flex gap-2 text-lg items-center text-start w-full'>
              <LockIcon className='w-5 h-5'/>
              Password
            </label>
            <input
            type="password"
            placeholder='password'
            id='password'
            name='password'
            className='w-full border border border-slate-500 px-4 py-2 rounded-lg'
            />
            <button
            className='px-4 py-2 bg-teal-600 rounded-lg cursor-pointer
            hover:bg-teal-700 hover:scale-102 transition-all duration-300 active:scale-102
            border border-teal-700'
            formAction={haveAccount ? login : signup}>
              { haveAccount ? `Sign In` : `Sign Up` }
            </button>
          </form>
        </div>
        {haveAccount && (<div className='flex gap-2 items-center justidy-center text-gray-400'>
            Forgot Password?
            <button className='text-teal-300 bg-transparent cursor-pointer hover:text-teal-500 hover:underline transition-all duration-300'>
              Reset Passwoed
            </button>
        </div>)}
        <div className='flex gap-2 items-center justidy-center text-gray-400'
        onClick={() => {

          setHaveAccount(!haveAccount);
        }}>
            {haveAccount ? `Don't have an Account?` : `Already have an Account?`}
            <button className='text-teal-300 bg-transparent cursor-pointer hover:text-teal-500 hover:underline transition-all duration-300'>
              { haveAccount ? `Sign Up` : `Sign In` }
            </button>
        </div>
      </div>
      </div>
    </div>
  )
}