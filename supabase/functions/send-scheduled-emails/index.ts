
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const apiKey = Deno.env.get('SMTP_API_KEY');
    if (!apiKey) {
      throw new Error('Missing SMTP API key');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get emails that are scheduled to be sent but are past their scheduled date
    const now = new Date().toISOString();
    const { data: emails, error: emailsError } = await supabase
      .from('follow_up_emails')
      .select(`
        id, 
        subject, 
        content, 
        scheduled_for, 
        contacts (
          id, 
          full_name, 
          email, 
          user_id
        )
      `)
      .eq('status', 'scheduled')
      .lt('scheduled_for', now);

    if (emailsError) {
      throw new Error(`Failed to fetch scheduled emails: ${emailsError.message}`);
    }

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No emails to send",
          sent: 0
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    // Process each email
    const results = [];
    for (const email of emails) {
      // Get the sender information
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', email.contacts.user_id)
        .single();

      if (userError) {
        console.error(`Failed to fetch user data for email ${email.id}: ${userError.message}`);
        results.push({
          id: email.id,
          status: 'failed',
          error: `Failed to fetch user data: ${userError.message}`
        });
        continue;
      }

      // Here, you would integrate with your email sending service (SendGrid, Mailgun, etc.)
      // For now, we'll simulate success/failure
      const success = Math.random() > 0.1; // 90% chance of success for the simulation
      
      // Update the email status in the database
      const { error: updateError } = await supabase
        .from('follow_up_emails')
        .update({ 
          status: success ? 'sent' : 'failed',
          sent_at: success ? new Date().toISOString() : null
        })
        .eq('id', email.id);

      if (updateError) {
        console.error(`Failed to update email status for email ${email.id}: ${updateError.message}`);
      }

      results.push({
        id: email.id,
        status: success ? 'sent' : 'failed',
        recipient: email.contacts.email,
        sender: userData.email
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${emails.length} email(s)`,
        results
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
