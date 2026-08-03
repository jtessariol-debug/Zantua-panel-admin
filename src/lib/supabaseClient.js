import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log("Supabase URL configured:", Boolean(supabaseUrl));
console.log("Supabase anon key configured:", Boolean(supabaseAnonKey));

if (!supabaseUrl) {
  throw new Error("Faltan variables de configuración de Supabase");
}

if (!supabaseAnonKey) {
  throw new Error("Faltan variables de configuración de Supabase");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
