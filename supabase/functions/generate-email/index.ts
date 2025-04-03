
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";
import { corsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  contactId: string;
  notes: string;
  userId: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      console.error("Missing OpenAI API key");
      throw new Error('Missing OpenAI API key');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    let body;
    try {
      body = await req.json() as RequestBody;
    } catch (error) {
      console.error("Failed to parse request body:", error);
      throw new Error('Invalid request body: ' + error.message);
    }
    
    const { contactId, notes, userId } = body;
    
    if (!contactId) {
      console.error("Missing contact ID");
      throw new Error('Missing contact ID');
    }
    
    if (!userId) {
      console.error("Missing user ID");
      throw new Error('Missing user ID');
    }

    console.log(`Fetching contact with ID: ${contactId} for user: ${userId}`);

    // Get the contact details
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', userId)
      .single();

    if (contactError) {
      console.error(`Failed to fetch contact:`, contactError);
      throw new Error(`Failed to fetch contact: ${contactError.message}`);
    }

    if (!contact) {
      console.error(`Contact not found for ID: ${contactId}`);
      throw new Error('Contact not found');
    }

    console.log(`Successfully fetched contact: ${contact.full_name}`);

    // Get any existing notes for this contact
    const { data: existingNotes, error: notesError } = await supabase
      .from('synergy_notes')
      .select('notes')
      .eq('contact_id', contactId)
      .maybeSingle();

    if (notesError) {
      console.error(`Error fetching existing notes:`, notesError);
    }

    // Get user details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error(`Failed to fetch user data:`, userError);
      throw new Error(`Failed to fetch user data: ${userError.message}`);
    }

    if (!userData) {
      console.error(`User data not found for ID: ${userId}`);
      throw new Error('User data not found');
    }

    console.log(`Successfully fetched user: ${userData.full_name}`);

    // Combine notes
    let allNotes = notes || "";
    if (existingNotes?.notes) {
      allNotes = `${existingNotes.notes}\n\n${allNotes}`;
    }

    console.log("Preparing OpenAI API request");
    
    // Create the prompt for GPT
    const systemPrompt = "You are an expert at writing personalized, professional follow-up emails based on networking contacts and conversation notes. Write in a friendly, professional tone. Focus on building genuine connections. Do not add any explanations - just write the email text.";
    
    const userPrompt = `Write a follow-up email to ${contact.full_name} who works at ${contact.company || "their company"} as a ${contact.position || "professional"}. 
    I want to follow up based on these notes from our conversation: "${allNotes}"
    
    My name is ${userData.full_name || "the sender"}.
    
    Write a complete, personalized email that references our conversation, reinforces connections we discovered, and suggests a next step.`;

    console.log("Sending request to OpenAI API");
    
    try {
      // Generate email with GPT-4
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            }
          ],
          max_tokens: 1000
        })
      });

      // Check if the response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenAI API error (${response.status}):`, errorText);
        throw new Error(`OpenAI API returned status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("OpenAI API response received");
      
      if (!result.choices || result.choices.length === 0 || !result.choices[0].message) {
        console.error("Invalid response structure from OpenAI:", JSON.stringify(result));
        throw new Error("Failed to generate email: Invalid response from OpenAI");
      }
      
      const emailContent = result.choices[0].message.content;
      console.log("Email content generated successfully");
      
      // Save the new notes if they were provided
      if (notes) {
        if (existingNotes) {
          // Update existing notes
          const { error: updateError } = await supabase
            .from('synergy_notes')
            .update({ notes: allNotes })
            .eq('contact_id', contactId);
            
          if (updateError) {
            console.error("Error updating notes:", updateError);
          }
        } else {
          // Create new notes
          const { error: insertError } = await supabase
            .from('synergy_notes')
            .insert({ contact_id: contactId, notes: allNotes });
            
          if (insertError) {
            console.error("Error inserting notes:", insertError);
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          email: emailContent
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    } catch (openAiError) {
      console.error("OpenAI API error:", openAiError);
      throw new Error(`OpenAI API error: ${openAiError.message}`);
    }
  } catch (error) {
    console.error("Error in generate-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    );
  }
});
