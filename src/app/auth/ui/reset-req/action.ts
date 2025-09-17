'use server';

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function sendResetReq(formData: FormData) {

    const supabase = await createClient();

    const dat = {
        email: formData.get('email') as string
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(dat.email);

    if (!error) {
        
        revalidatePath('/', 'layout');
        redirect('/auth/ui/confirmation');
    }

    revalidatePath('/', 'layout')
      redirect('/login')
}