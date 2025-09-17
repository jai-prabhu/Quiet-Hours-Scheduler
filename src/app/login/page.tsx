'use client';

import { login, signup } from './actions'
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserIcon, LockIcon, MailIcon } from "lucide-react";


const Alert = ({ haveAccount }: {haveAccount: boolean}) =>{

  const params = useSearchParams();

  return (
    <>
      {
          params.get("success") && haveAccount && (
            <div className='px-4 py-2 bg-red-500/10 text-red-500 rounded-lg border border-red-600'>
              Email or Password Incorrect
            </div>
          )
        }
        {
          params.get("register") && !haveAccount && (
            <div className='px-4 py-2 bg-red-500/10 text-red-500 rounded-lg border border-red-600'>
              Verification link is expired!
            </div>
          )
        }
    </>
  )
}

interface HaveAccountProps {

  onChange: (val: boolean) => void;
}

const GetHaveAccount = ( { onChange }: HaveAccountProps ) => {

  const params = useSearchParams();

  const mode = params.get('mode');

  useEffect(() => {

    onChange(mode === 'register' ? false : true)
  }, [mode])

  return (
    <></>
  )
}

export default function LoginPage() {

  const [ haveAccount, setHaveAccount ] = useState(true);
  const [ loading, setLoading ] = useState(false);
  const [ email, setEmail ] = useState("");
  const [ password, setPassword ] = useState("");
  const [ passwordError, setPasswordError ] = useState(false);

  const router = useRouter();
  

  return (
    <div className='max-w-screen w-full min-h-screen bg-gradient-to-br from-black via-gray-900 to-black'
    style={{fontFamily: "var(--font-poppins)"}}>
      <div className='container max-w-md mx-auto'>
      
      <div className='flex flex-col gap-8 w-full min-h-screen items-center justify-center'>
        <Suspense>
          <Alert haveAccount={haveAccount}/>
          <GetHaveAccount onChange={e => {
            if (haveAccount !== e) setHaveAccount(e);
          }}/>
        </Suspense>
        <h1 className='inline-flex items-center justidycenter gap-3 text-white text-2xl font-mediumd'>
          <UserIcon/>
          { haveAccount ? `Log In` : `Register` }
        </h1>
        <div className='bg-slate-700/30 p-6 w-full rounded-lg border text-background border-slate-700 backdrop-blur-lg
        drop-shadow-md drop-shadow-slate-600 backdrop-brightness-150 '>
          <form className='flex flex-col justify-center gap-4 w-full'
          onSubmit={
              async (e : React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();

                if (loading) return;

                setLoading(true);

                const formData = new FormData();
                 
                formData.append('email', email);
                formData.append('password', password);

                try {
                  if (haveAccount) {
                    await login(formData);
                  } else {
                    await signup(formData);
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  setLoading(false);
                }
              }
            }>
            <label className='inline-flex gap-2 text-lg items-center text-start w-full'>
              <MailIcon className='w-5 h-5 text-background'/>
              Email
            </label>
            <input
            type="email"
            placeholder='Email'
            id='email'
            name='email'
            onChange={e => {setEmail(e.target.value)}}
            className='w-full placeholder-gray-500 border border border-slate-500 px-4 py-2 rounded-lg'
            />
            <label className='inline-flex gap-2 text-lg items-center text-start w-full'>
              <LockIcon className='w-5 h-5'/>
              Password
            </label>
            <input
            type="password"
            placeholder='password'
            id='password'
            onChange={e => { setPassword(e.target.value) }}
            onBlur={
              () => {

                if (haveAccount) {

                  setPasswordError(false);
                  return;
                };

                if(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+=[\]{}|\\,.<>/?~-]).{8,}$/.test(password)) {

                  setPasswordError(false);
                }

                else {

                  setPasswordError(true);
                }
              }
            }
            name='password'
            className='w-full placeholder-gray-500 border border border-slate-500 px-4 py-2 rounded-lg'
            />
            {
              passwordError && !haveAccount && (
                <p className='text-sm text-red-500'>password must be<br/> - 8 character long <br/> - mix of upper and lower case case <br/> - atleast number <br/> - atleast 1 symbol</p>
              )
            }
            <button
            className='px-4 py-2 bg-teal-600 rounded-lg cursor-pointer
            hover:bg-teal-700 hover:scale-102 transition-all duration-300 active:scale-102
            border border-teal-700 disabled:opacity-50 disabled:scale-100 disabled:bg-teal-600'
            type="submit"
            disabled={loading || !email || !password || passwordError}>
              {loading ? (
                <div className='flex items-center justify-center gap-2'>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent"></div>
                  <span>{ haveAccount ? `Sign In` : `Sign Up` }...</span>
                </div>
              ) : (
                <>
                  <span>{ haveAccount ? `Sign In` : `Sign Up` }</span>
                </>
              )}
              
            </button>
          </form>
        </div>
        {haveAccount && (<div className='flex gap-2 items-center justidy-center text-gray-400'>
            Forgot Password?
            <button 
            onClick={() => {
              router.push('/auth/ui/reset-req');
            }}
            className='text-teal-300 bg-transparent cursor-pointer hover:text-teal-500 hover:underline transition-all duration-300'>
              Reset Password
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