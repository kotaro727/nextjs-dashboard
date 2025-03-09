'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from './utils';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
export async function createInvoice(formData: FormData) {
    const rawFormData = {
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    };

    // CreateInvoiceスキーマを使用してデータを検証
    const validatedFields = CreateInvoice.parse(rawFormData);

    const { customerId, amount, status } = validatedFields;

    // 金額をセント（円）単位に変換
    const amountInCents = Math.round(amount * 100);
    const date = new Date().toISOString().split('T')[0];

    try {
        // Supabaseクライアントを初期化
        const supabase = await createClient();

        // invoicesテーブルにデータを挿入
        const { error } = await supabase
            .from('invoices')
            .insert([
                {
                    customer_id: customerId,
                    amount: amountInCents,
                    status: status,
                    date: date
                }
            ]);

        if (error) {
            console.error('Supabase挿入エラー:', error);
            throw new Error('請求書の作成に失敗しました。');
        }

        // キャッシュを再検証してデータの更新を反映
        revalidatePath('/dashboard/invoices');
        // 請求書一覧ページにリダイレクト
        redirect('/dashboard/invoices');

    } catch (error) {
        console.error('データベース操作エラー:', error);
        throw new Error('請求書の作成に失敗しました。');
    }
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
   
    const amountInCents = Math.round(amount * 100);
   
    try {
        // Supabaseクライアントを初期化
        const supabase = await createClient();

        // デバッグ用にIDを確認
        console.log('更新対象のID:', id);

        // invoicesテーブルのデータを更新
        const { error, data } = await supabase
            .from('invoices')
            .update({
                customer_id: customerId,
                amount: amountInCents,
                status: status
            })
            .eq('id', id)
            .select();

        console.log('更新結果:', data);

        if (error) {
            console.error('Supabase更新エラー:', error);
            // throw new Error('請求書の更新に失敗しました。');
        }

        revalidatePath('/dashboard/invoices');
        redirect('/dashboard/invoices');
    } catch (error) {
        console.error('データベース操作エラー:', error);
        // throw new Error('請求書の更新に失敗しました。');
    }
}
