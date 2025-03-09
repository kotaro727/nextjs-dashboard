import { sql } from '@vercel/postgres';
import { CustomerField, CustomersTableType, InvoiceForm, } from './definitions';
import { createClient, formatCurrency } from './utils';


export async function fetchRevenue() {
  try {
    const supabase = await createClient();
    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const { data: revenue } = await supabase.from('revenue').select('*');
    console.log('Data fetch completed after 3 seconds.');

    return revenue ?? [];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  try {
    const supabase = await createClient();

    await new Promise((resolve) => setTimeout(resolve, 2000));
    const { data, error } = await supabase
      .from('invoices')
      .select('amount, customers(name, image_url, email), id')
      .order('date', { ascending: false })
      .limit(5);

    if (error) {
      throw error;
    }

    const latestInvoices = data.map((invoice) => ({
      id: invoice.id,
      name: invoice.customers.name,
      image_url: invoice.customers.image_url,
      email: invoice.customers.email,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    const supabase = await createClient();

    const invoiceCountPromise = supabase
      .from('invoices')
      .select('id', { count: 'exact' });

    const customerCountPromise = supabase
      .from('customers')
      .select('id', { count: 'exact' });

    const invoiceStatusPromise = supabase
      .from('invoices')
      .select('status, amount');

    const [invoiceCount, customerCount, invoiceStatus] = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = invoiceCount.count ?? 0;
    const numberOfCustomers = customerCount.count ?? 0;

    const totalPaidInvoices = invoiceStatus.data?.filter((invoice) => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.amount, 0);

    const totalPendingInvoices = invoiceStatus.data?.filter((invoice) => invoice.status === 'pending')
      .reduce((sum, invoice) => sum + invoice.amount, 0);

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices: formatCurrency(totalPaidInvoices ?? 0),
      totalPendingInvoices: formatCurrency(totalPendingInvoices ?? 0),
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  try {
    const supabase = await createClient();
    // @ts-ignore
    const { data, error } = await supabase.rpc('fetch_filtered_invoices3', {
      search_query: query,
      offset_value: offset,
      limit_value: ITEMS_PER_PAGE,
    }) as { id: string; amount: number; date: string; status: string; customer_name: string; customer_email: string; customer_image_url: string }[];

    if (error) {
      console.error('Database Error:', error);
      throw error;
    }

    // data は返り値の配列となるので、必要に応じて整形
    return data.map((invoice: any) => ({
      id: invoice.id,
      amount: invoice.amount,
      date: invoice.date,
      status: invoice.status,
      name: invoice.customer_name,
      email: invoice.customer_email,
      image_url: invoice.customer_image_url,
    }));
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const count = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data = await sql<InvoiceForm>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.rows.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customers table.');
  }
}
