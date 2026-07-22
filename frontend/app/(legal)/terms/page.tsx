import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default async function Terms() {
  const input = `
## **MailLink Terms of Service**

**Effective Date:** July 23, 2026  
**Last Updated:** July 23, 2026  

Welcome to MailLink (“we,” “our,” or “us”). These Terms of Service (“Terms”) govern your access to and use of our website, products, and services (collectively, the “Services”). By using MailLink, you agree to these Terms. If you do not agree, do not use our Services.

---

### 1. Eligibility
You must be **at least 13 years old** to use our Services.  
If you are under 18, you must have permission from a parent or legal guardian.  
By using MailLink, you confirm that you meet these requirements.

---

### 2. Accounts
- You must create an account to use certain features.  
- Account creation and authentication are handled by **Clerk**.  
- You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.  
- Notify us immediately at **${process.env.CONTACT_EMAIL}** if you suspect unauthorised use.

---

### 3. Payments & Subscriptions
- Payments are processed securely by **Stripe**.  
- Prices, subscription terms, and billing cycles will be displayed at checkout.  
- All fees are non-refundable except where required by UK law.  
- You authorise us (via Stripe) to charge your payment method for applicable fees.

---

### 4. Acceptable Use
You agree not to:  
- Use the Services for unlawful, harmful, or fraudulent purposes.  
- Interfere with or disrupt the operation of the Services.  
- Attempt to gain unauthorised access to our systems or data.  
- Upload or transmit malicious code, spam, or harmful content.

---

### 5. Data & Privacy
- Your data is stored on **Vercel** (hosting), **Railway** (database and hosting), and processed by **Clerk** (authentication) and **Stripe** (payments).  
- Our use of your data is governed by our [Privacy Policy](/privacy).  
- By using our Services, you consent to the collection and use of your data as described in the Privacy Policy, in compliance with the **UK GDPR** and **Data Protection Act 2018**.

---

### 6. Service Availability
We strive to keep MailLink available, but we do not guarantee uninterrupted or error-free service. We may suspend or modify the Services at any time without liability.

---

### 7. Intellectual Property
- All content, trademarks, and code related to MailLink are our property or licensed to us.  
- You may not copy, modify, distribute, or create derivative works without our written permission.

---

### 8. Termination
We may suspend or terminate your account if you violate these Terms or use the Services in a way that could harm us or others. You may stop using the Services at any time.

---

### 9. Disclaimers
The Services are provided “as is” without warranties of any kind, express or implied. We disclaim all warranties to the fullest extent permitted by UK law.

---

### 10. Limitation of Liability
To the maximum extent permitted by UK law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the Services.

---

### 11. Changes to These Terms
We may update these Terms from time to time. Changes will be posted on this page with an updated “Effective Date.” Continued use of the Services after changes means you accept the new Terms.

---

### 12. Governing Law
These Terms are governed by the laws of **England and Wales**, without regard to conflict of law principles. You agree that the courts of England and Wales will have exclusive jurisdiction over any disputes.

---

### 13. Contact Us
If you have questions about these Terms, contact us at:  
**Email:** ${process.env.CONTACT_EMAIL}
`.trim();

  return (
    <article className="prose prose-lg dark:prose-invert max-w-none py-4">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{input}</ReactMarkdown>
    </article>
  );
}
