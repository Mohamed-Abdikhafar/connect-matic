
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "../hooks/use-toast";

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  position: string;
  notes: string;
  createdAt: string;
  tags: string[];
}

export interface Email {
  id: string;
  contactId: string;
  subject: string;
  body: string;
  status: "draft" | "scheduled" | "sent" | "failed";
  scheduledDate: string;
  createdAt: string;
}

interface DataContextType {
  contacts: Contact[];
  emails: Email[];
  addContact: (contact: Omit<Contact, "id" | "createdAt">) => void;
  updateContact: (id: string, contact: Partial<Omit<Contact, "id" | "createdAt">>) => void;
  deleteContact: (id: string) => void;
  addEmail: (email: Omit<Email, "id" | "createdAt">) => void;
  updateEmail: (id: string, email: Partial<Omit<Email, "id" | "createdAt">>) => void;
  deleteEmail: (id: string) => void;
  getContactById: (id: string) => Contact | undefined;
  getEmailsForContact: (contactId: string) => Email[];
  generateEmail: (contactId: string, notes: string) => Promise<string>;
  scheduleEmail: (contactId: string, email: { subject: string; body: string; scheduledDate: string }) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);

  // Load stored data on user change
  useEffect(() => {
    if (user) {
      const storedContacts = localStorage.getItem(`contacts-${user.id}`);
      const storedEmails = localStorage.getItem(`emails-${user.id}`);
      
      if (storedContacts) {
        setContacts(JSON.parse(storedContacts));
      } else {
        // Initialize with sample data for demo
        const sampleContacts: Contact[] = [
          {
            id: "contact-1",
            name: "John Doe",
            email: "john.doe@example.com",
            phone: "123-456-7890",
            company: "Acme Corp",
            website: "acmecorp.com",
            position: "Marketing Director",
            notes: "Met at TechConf 2023. Interested in our design services.",
            createdAt: new Date().toISOString(),
            tags: ["tech", "marketing"]
          },
          {
            id: "contact-2",
            name: "Jane Smith",
            email: "jane.smith@example.com",
            phone: "987-654-3210",
            company: "Globex Inc",
            website: "globex.com",
            position: "CEO",
            notes: "Introduced by Michael at Startup Weekend. Looking for partnerships.",
            createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            tags: ["startup", "potential client"]
          }
        ];
        setContacts(sampleContacts);
        localStorage.setItem(`contacts-${user.id}`, JSON.stringify(sampleContacts));
      }
      
      if (storedEmails) {
        setEmails(JSON.parse(storedEmails));
      } else {
        // Initialize with sample data for demo
        const sampleEmails: Email[] = [
          {
            id: "email-1",
            contactId: "contact-1",
            subject: "Great meeting you at TechConf",
            body: "Hi John,\n\nIt was a pleasure meeting you at TechConf yesterday. I'm excited about the possibility of helping Acme Corp with your design needs.\n\nWould you be available for a quick call next week to discuss potential collaboration?\n\nBest regards,\n" + user.name,
            status: "sent",
            scheduledDate: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
            createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
          },
          {
            id: "email-2",
            contactId: "contact-2",
            subject: "Following up on our conversation",
            body: "Hi Jane,\n\nI hope this email finds you well. I wanted to follow up on our conversation at Startup Weekend.\n\nI'd love to explore how we might be able to collaborate with Globex Inc. Are you available for a meeting next Tuesday?\n\nBest regards,\n" + user.name,
            status: "scheduled",
            scheduledDate: new Date(Date.now() + 86400000).toISOString(), // 1 day in future
            createdAt: new Date().toISOString()
          }
        ];
        setEmails(sampleEmails);
        localStorage.setItem(`emails-${user.id}`, JSON.stringify(sampleEmails));
      }
    } else {
      // Clear data when user logs out
      setContacts([]);
      setEmails([]);
    }
  }, [user]);

  // Save data when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(`contacts-${user.id}`, JSON.stringify(contacts));
      localStorage.setItem(`emails-${user.id}`, JSON.stringify(emails));
    }
  }, [contacts, emails, user]);

  const addContact = (contact: Omit<Contact, "id" | "createdAt">) => {
    const newContact: Contact = {
      ...contact,
      id: "contact-" + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    setContacts([...contacts, newContact]);
    toast({
      title: "Contact added",
      description: `${contact.name} has been added to your contacts.`
    });
  };

  const updateContact = (id: string, contactUpdates: Partial<Omit<Contact, "id" | "createdAt">>) => {
    setContacts(contacts.map(contact => 
      contact.id === id ? { ...contact, ...contactUpdates } : contact
    ));
    toast({
      title: "Contact updated",
      description: "Contact information has been updated."
    });
  };

  const deleteContact = (id: string) => {
    setContacts(contacts.filter(contact => contact.id !== id));
    // Also delete related emails
    setEmails(emails.filter(email => email.contactId !== id));
    toast({
      title: "Contact deleted",
      description: "Contact and associated emails have been removed."
    });
  };

  const addEmail = (email: Omit<Email, "id" | "createdAt">) => {
    const newEmail: Email = {
      ...email,
      id: "email-" + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    setEmails([...emails, newEmail]);
    toast({
      title: "Email created",
      description: email.status === "scheduled" 
        ? `Email scheduled to be sent on ${new Date(email.scheduledDate).toLocaleDateString()}.`
        : "Email has been created."
    });
  };

  const updateEmail = (id: string, emailUpdates: Partial<Omit<Email, "id" | "createdAt">>) => {
    setEmails(emails.map(email => 
      email.id === id ? { ...email, ...emailUpdates } : email
    ));
    toast({
      title: "Email updated",
      description: "Email has been updated."
    });
  };

  const deleteEmail = (id: string) => {
    setEmails(emails.filter(email => email.id !== id));
    toast({
      title: "Email deleted",
      description: "Email has been removed."
    });
  };

  const getContactById = (id: string) => {
    return contacts.find(contact => contact.id === id);
  };

  const getEmailsForContact = (contactId: string) => {
    return emails.filter(email => email.contactId === contactId);
  };

  // Simulate GPT integration for email generation
  const generateEmail = async (contactId: string, notes: string): Promise<string> => {
    const contact = getContactById(contactId);
    if (!contact) {
      throw new Error("Contact not found");
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate a basic email template based on contact info and notes
    const email = `Hi ${contact.name},

I hope this email finds you well. It was a pleasure meeting you recently.

${notes}

I'd love to connect further and explore potential synergies between our work. Would you be available for a brief call in the coming days?

Looking forward to hearing from you.

Best regards,
${user?.name || "User"}`;

    return email;
  };

  const scheduleEmail = (contactId: string, emailData: { subject: string; body: string; scheduledDate: string }) => {
    const newEmail: Omit<Email, "id" | "createdAt"> = {
      contactId,
      subject: emailData.subject,
      body: emailData.body,
      status: "scheduled",
      scheduledDate: emailData.scheduledDate
    };
    
    addEmail(newEmail);
  };

  return (
    <DataContext.Provider
      value={{
        contacts,
        emails,
        addContact,
        updateContact,
        deleteContact,
        addEmail,
        updateEmail,
        deleteEmail,
        getContactById,
        getEmailsForContact,
        generateEmail,
        scheduleEmail
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
