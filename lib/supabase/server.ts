import { createClient } from "@supabase/supabase-js";

export async function createServerSecretClient() {
	const supabase = await createClient(
		process.env.SUPABASE_PUBLIC_URL!,
		process.env.SUPABASE_SECRET_KEY!,
	);
}
