
// Follow this setup guide to integrate the Deno runtime for your Supabase Edge Function
// https://deno.land/manual@v1.37.0/runtime/supabase

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";
import { corsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  imageUrl: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('Missing OpenAI API key');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const requestData = await req.json();
    const { imageUrl, userId } = requestData as RequestBody & { userId: string };
    
    if (!imageUrl) {
      throw new Error('Missing image URL');
    }
    
    if (!userId) {
      throw new Error('Missing user ID');
    }

    // Get the image from Supabase Storage
    const { data: imageData, error: imageError } = await supabase
      .storage
      .from('business_cards')
      .download(imageUrl.replace(`${supabaseUrl}/storage/v1/object/public/business_cards/`, ''));

    if (imageError) {
      throw new Error(`Failed to fetch image: ${imageError.message}`);
    }
    
    // Convert image to base64
    const base64Image = await imageData.arrayBuffer();
    const encodedImage = btoa(
      new Uint8Array(base64Image)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Process image with OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert at extracting contact information from business cards. Extract the following fields if present: full name, email, phone, company, position, website. Return the data as a JSON object with these fields. Do not include any other text in your response."
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${encodedImage}`
                }
              },
              {
                type: "text",
                text: "Extract the contact information from this business card and provide it as JSON."
              }
            ]
          }
        ],
        max_tokens: 1000
      })
    });

    const result = await response.json();
    const extraction = result.choices[0].message.content;
    
    // Parse the JSON response
    let contactData;
    try {
      contactData = JSON.parse(extraction);
    } catch (error) {
      // If parsing fails, extract using regex
      const nameMatch = extraction.match(/["']?full_?name["']?\s*:\s*["']([^"']+)["']/i);
      const emailMatch = extraction.match(/["']?email["']?\s*:\s*["']([^"']+)["']/i);
      const phoneMatch = extraction.match(/["']?phone["']?\s*:\s*["']([^"']+)["']/i);
      const companyMatch = extraction.match(/["']?company["']?\s*:\s*["']([^"']+)["']/i);
      const positionMatch = extraction.match(/["']?position["']?\s*:\s*["']([^"']+)["']/i);
      const websiteMatch = extraction.match(/["']?website["']?\s*:\s*["']([^"']+)["']/i);

      contactData = {
        full_name: nameMatch ? nameMatch[1] : null,
        email: emailMatch ? emailMatch[1] : null,
        phone: phoneMatch ? phoneMatch[1] : null,
        company: companyMatch ? companyMatch[1] : null, 
        position: positionMatch ? positionMatch[1] : null,
        website: websiteMatch ? websiteMatch[1] : null,
      };
    }
    
    // Add the userId
    const contactWithUserId = {
      ...contactData,
      user_id: userId,
      card_image_url: imageUrl
    };

    // Save to database
    const { data, error } = await supabase
      .from('contacts')
      .insert(contactWithUserId)
      .select();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Contact successfully extracted and saved",
        contact: data && data.length > 0 ? data[0] : null,
        extraction: contactData
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error(error);
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
