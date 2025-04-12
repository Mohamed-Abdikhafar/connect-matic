
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  contactName: string;
  userId: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    console.log("Starting send-email function");
    
    // Get request body
    let emailData: EmailRequest;
    try {
      emailData = await req.json() as EmailRequest;
      console.log("Request received for:", {
        to: emailData.to,
        subject: emailData.subject,
        contactName: emailData.contactName,
        userId: emailData.userId ? "provided" : "missing"
      });
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Invalid request body: ${parseError.message}` 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }
    
    // Validate required fields
    const { to, subject, body, contactName, userId } = emailData;
    
    if (!to) {
      console.error("Missing recipient email address");
      return new Response(
        JSON.stringify({ success: false, message: "Missing recipient email address" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    if (!subject) {
      console.error("Missing email subject");
      return new Response(
        JSON.stringify({ success: false, message: "Missing email subject" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    if (!body) {
      console.error("Missing email body");
      return new Response(
        JSON.stringify({ success: false, message: "Missing email body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Get SMTP credentials from environment variables
    const host = Deno.env.get('SMTP_HOST');
    const portStr = Deno.env.get('SMTP_PORT');
    const port = portStr ? parseInt(portStr) : 587;
    const secure = Deno.env.get('SMTP_SECURE') === 'true';
    const user = Deno.env.get('SMTP_USER');
    const password = Deno.env.get('SMTP_PASSWORD');
    const from = Deno.env.get('SMTP_FROM');
    
    console.log("SMTP Configuration:", {
      host: host ? "configured" : "missing",
      port,
      secure,
      user: user ? "configured" : "missing",
      from: from ? "configured" : "missing"
    });
    
    if (!host) {
      console.error("Missing SMTP_HOST environment variable");
      return new Response(
        JSON.stringify({ success: false, message: "Server configuration error: Missing SMTP host" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    if (!user) {
      console.error("Missing SMTP_USER environment variable");
      return new Response(
        JSON.stringify({ success: false, message: "Server configuration error: Missing SMTP username" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    if (!password) {
      console.error("Missing SMTP_PASSWORD environment variable");
      return new Response(
        JSON.stringify({ success: false, message: "Server configuration error: Missing SMTP password" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    if (!from) {
      console.error("Missing SMTP_FROM environment variable");
      return new Response(
        JSON.stringify({ success: false, message: "Server configuration error: Missing sender email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // Initialize SMTP client
    console.log("Initializing SMTP client");
    let client: SMTPClient;
    try {
      client = new SMTPClient({
        connection: {
          hostname: host,
          port: port,
          tls: secure,
          auth: {
            username: user,
            password: password,
          },
        },
      });
      console.log("SMTP client initialized successfully");
    } catch (smtpError) {
      console.error("Failed to initialize SMTP client:", smtpError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `SMTP configuration error: ${smtpError.message}` 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500 
        }
      );
    }

    // Send the email
    try {
      console.log(`Attempting to send email to ${to}`);
      await client.send({
        from: from,
        to: to,
        subject: subject,
        content: body,
        html: body,
      });
      console.log("Email sent successfully");
    } catch (sendError) {
      console.error("Failed to send email:", sendError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Email sending failed: ${sendError.message}` 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500 
        }
      );
    } finally {
      // Close the connection
      try {
        await client.close();
        console.log("SMTP connection closed");
      } catch (closeError) {
        console.error("Error closing SMTP connection:", closeError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email sent to ${contactName}` 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Unexpected error in send-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Unexpected error: ${error.message}` 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
