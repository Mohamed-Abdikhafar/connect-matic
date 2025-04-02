
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, SparklesIcon, CalendarIcon, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EmailGenerator = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getContactById, generateEmail, scheduleEmail } = useData();
  
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  useEffect(() => {
    if (!id) {
      navigate("/contacts");
      return;
    }
    
    const contact = getContactById(id);
    
    if (!contact) {
      toast({
        variant: "destructive",
        title: "Contact not found",
        description: "The contact you're trying to email doesn't exist."
      });
      navigate("/contacts");
      return;
    }
    
    if (contact.notes) {
      setNotes(contact.notes);
    }
    
    // Set default subject
    setSubject(`Follow up from our conversation - ${contact.name}`);
    
    // Set default date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledDate(tomorrow.toISOString().split("T")[0]);
    
  }, [id, getContactById, navigate, toast]);
  
  const contact = id ? getContactById(id) : null;
  
  if (!contact) {
    return null;
  }
  
  const handleGenerateEmail = async () => {
    if (notes.trim() === "") {
      toast({
        variant: "destructive",
        title: "Notes required",
        description: "Please enter some synergy notes to generate an email."
      });
      return;
    }
    
    setIsGenerating(true);
    try {
      const generatedEmail = await generateEmail(id, notes);
      setEmailBody(generatedEmail);
      toast({
        title: "Email generated",
        description: "Your follow-up email has been generated successfully."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: "Failed to generate email. Please try again."
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleScheduleEmail = () => {
    if (subject.trim() === "") {
      toast({
        variant: "destructive",
        title: "Subject required",
        description: "Please enter a subject for your email."
      });
      return;
    }
    
    if (emailBody.trim() === "") {
      toast({
        variant: "destructive",
        title: "Email body required",
        description: "Please generate or write an email body."
      });
      return;
    }
    
    if (!scheduledDate) {
      toast({
        variant: "destructive",
        title: "Schedule date required",
        description: "Please select when you want to send this email."
      });
      return;
    }
    
    setIsSending(true);
    
    try {
      scheduleEmail(id, {
        subject,
        body: emailBody,
        scheduledDate: new Date(scheduledDate).toISOString()
      });
      
      toast({
        title: "Email scheduled",
        description: `Your follow-up email to ${contact.name} has been scheduled for ${new Date(scheduledDate).toLocaleDateString()}.`
      });
      
      navigate(`/contacts/${id}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Scheduling failed",
        description: "Failed to schedule email. Please try again."
      });
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      <Button 
        variant="ghost" 
        className="mb-4 flex items-center gap-1"
        onClick={() => navigate(`/contacts/${id}`)}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Contact
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>Create Follow-up Email</CardTitle>
          <CardDescription>
            Generate and schedule a personalized follow-up email to {contact.name}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Synergy Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Synergy Notes</Label>
            <Textarea 
              id="notes" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes about your conversation, potential opportunities, or talking points to include in the follow-up."
              rows={4}
            />
            <div className="flex justify-end">
              <Button 
                type="button" 
                onClick={handleGenerateEmail}
                disabled={isGenerating || notes.trim() === ""}
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4" />
                    Generate Email
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Email Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject</Label>
            <Input 
              id="subject" 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject"
            />
          </div>
          
          {/* Email Body */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="emailBody">Email Body</Label>
              {emailBody && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleGenerateEmail}
                  disabled={isGenerating}
                  className="flex items-center gap-1 h-7"
                >
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </Button>
              )}
            </div>
            <Textarea 
              id="emailBody" 
              value={emailBody} 
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Your follow-up email content will appear here after generation, or you can write it manually."
              rows={10}
            />
          </div>
          
          {/* Schedule Date */}
          <div className="space-y-2">
            <Label htmlFor="scheduledDate" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Schedule Date
            </Label>
            <Input 
              id="scheduledDate" 
              type="date" 
              value={scheduledDate} 
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate(`/contacts/${id}`)}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleScheduleEmail}
            disabled={isSending || !subject || !emailBody || !scheduledDate}
          >
            {isSending ? "Scheduling..." : "Schedule Email"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EmailGenerator;
