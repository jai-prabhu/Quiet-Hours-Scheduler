'use server';

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function resetPassword(formData: FormData) {

    const supabase = await createClient();

    const data = {
        password: formData.get('password') as string
    }

    const res = supabase.auth.updateUser({ password: data.password });

    revalidatePath('/', 'layout')
      redirect('/auth/ui/password-success')
}