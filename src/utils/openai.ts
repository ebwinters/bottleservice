import { createClient } from '@supabase/supabase-js'

export interface BottleForAI {
  name: string;
  category: string;
}

export async function getAIResponse(question: string, bottles: BottleForAI[]): Promise<string> {
  try {
    // Create Supabase client
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Invoke the Supabase function
    const { data, error } = await supabase.functions.invoke('ai-query', {
      body: {
        question,
        bottles
      }
    });
    
    if (error) {
      console.error("Supabase function error:", error.message);
      throw new Error(`Supabase function error: ${error.message}`);
    }
      // Assuming the response contains a text field with the AI's answer
    return data?.text || data?.answer || data?.response || "No clear response received";
  } catch (error) {
    console.error("Error calling Supabase AI function:", error);
    return "I'm sorry, I couldn't process your request at this moment. Please try again later.";
  }
}
