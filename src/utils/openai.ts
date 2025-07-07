import { createClient } from '@supabase/supabase-js'

export interface BottleForAI {
  name: string;
  category: string;
  cost: number;
}

// Regular non-streaming response
export async function getAIResponse(question: string, bottles: BottleForAI[]): Promise<string> {
  try {
    // Create Supabase client
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Only send name and cost (omit cost if 0)
    const bottlesForAI = bottles.map(({ name, category, cost }) =>
      cost && cost !== 0 ? { name, category, cost } : { name, category }
    );

    console.log("Calling Supabase AI function with question:", question, "and bottles:", bottlesForAI)
    const { data, error } = await supabase.functions.invoke('ai-query', {
        body: { question, bottles: bottlesForAI, max_tokens: 1024 },
        headers: {
            Authorization: `Bearer ${token}`
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

// New streaming implementation (simulated since we don't have actual streaming API)
export async function getAIResponseWithStreaming(
  question: string, 
  bottles: BottleForAI[], 
  onChunk: (chunk: string) => void,
  onDone: (fullText: string) => void
): Promise<void> {
  try {
    // First get the full response
    const fullResponse = await getAIResponse(question, bottles);
    
    // Simulate streaming by sending chunks of text with delays
    let displayedText = '';
    const words = fullResponse.split(' ');
    
    // Process words with a small delay to simulate typing
    for (let i = 0; i < words.length; i++) {
      // Add the next word
      displayedText += (i > 0 ? ' ' : '') + words[i];
      
      // Call the chunk handler
      onChunk(displayedText);
      
      // Delay before the next word (adjust for desired typing speed)
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Signal completion
    onDone(fullResponse);
  } catch (error) {
    console.error("Error in streaming AI function:", error);
    const errorMessage = "I'm sorry, I couldn't process your request at this moment. Please try again later.";
    onChunk(errorMessage);
    onDone(errorMessage);
  }
}
