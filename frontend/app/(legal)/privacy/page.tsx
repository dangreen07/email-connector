import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default async function Privacy() {
  const input = `
## **MailLink Privacy Policy**

**Effective Date:** July 23, 2026  
**Last Updated:** July 23, 2026  

MailLink (“we,” “our,” or “us”) values your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our website and services.

---

### 1. Information We Collect

**a. Information You Provide**  
- **Account Information:** When you sign up, we collect your name, email address, and other details you provide.  
- **Payment Information:** Processed securely by **Stripe**. We do not store your full payment card details.  

**b. Information Collected Automatically**  
- **Usage Data:** Pages visited, actions taken, and timestamps.  
- **Device & Browser Data:** IP address, browser type, operating system.  
- **Analytics Data:** Collected via **Vercel Analytics** to improve performance and user experience.  

**c. Authentication Data**  
- Managed by **Clerk** to securely handle sign-ins, sessions, and identity verification.

---

### 2. How We Use Your Information

We use your information to:  
- Provide and maintain our services.  
- Process payments and subscriptions.  
- Authenticate and secure your account.  
- Store and manage your data in our database.  
- Improve site performance and user experience.  
- Communicate with you about updates, offers, and support.  

---

### 3. How We Share Your Information

We do not sell your personal information. We share data only with:  
- **Stripe** (payment processing)  
- **Clerk** (authentication)  
- **Vercel** (hosting and analytics)  
- **Railway** (database hosting and storage)  
- Service providers who help us operate our business, bound by confidentiality agreements.  

We may also share information if required by law or to protect our rights.

---

### 4. Data Storage & Security

- Your data is stored securely on **Vercel** and **Railway** infrastructure.  
- We use encryption in transit (HTTPS) and at rest where applicable.  
- Access to your data is restricted to authorized personnel only.  

---

### 5. Your Rights

Depending on your location, you may have rights under GDPR, CCPA, or other laws, including:  
- Accessing the personal data we hold about you.  
- Requesting corrections or deletion.  
- Opting out of certain data uses.  

To exercise these rights, contact us at **${process.env.CONTACT_EMAIL}**.

---

### 6. Cookies & Tracking

We use cookies and similar technologies for:  
- Authentication (via Clerk)  
- Payment sessions (via Stripe)  
- Analytics (via Vercel)  

You can control cookies through your browser settings.

---

### 7. Third-Party Services

Our service integrates with:  
- **Stripe** - [Stripe Privacy Policy](https://stripe.com/privacy)  
- **Clerk** - [Clerk Privacy Policy](https://clerk.com/privacy)  
- **Vercel** - [Vercel Privacy Policy](https://vercel.com/legal/privacy-policy)  
- **Railway** - [Railway Privacy Policy](https://railway.com/legal/privacy)  

These providers have their own privacy practices.

---

### 8. Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated “Effective Date.”

---

### 9. Contact Us

If you have questions about this Privacy Policy, contact us at:  
**Email:** ${process.env.CONTACT_EMAIL}  
`.trim();

  return (
    <article className="prose prose-lg dark:prose-invert max-w-none py-4">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{input}</ReactMarkdown>
    </article>
  );
}
