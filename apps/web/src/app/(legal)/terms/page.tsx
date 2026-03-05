import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service' }

/**
 * Terms of Service page. Uses placeholder company info that should be
 * customized before production launch. Covers acceptance, accounts,
 * acceptable use, AI disclaimers, IP, termination, and liability.
 */
export default function TermsOfServicePage() {
  return (
    <article className="space-y-8 animate-fade-in">
      <header className="space-y-3 border-b border-border pb-8">
        <h1 className="text-3xl font-bold gradient-text">Terms of Service</h1>
        <p className="text-sm text-text-tertiary">
          Last updated: March 1, 2026
        </p>
      </header>

      <Section title="1. Acceptance of Terms">
        <p>
          By accessing or using VitaMind (&quot;the Service&quot;), you agree
          to be bound by these Terms of Service (&quot;Terms&quot;). If you do
          not agree to these Terms, you may not use the Service.
        </p>
        <p>
          We may update these Terms from time to time. Continued use after
          changes are posted constitutes acceptance. We will notify you of
          material changes via email or in-app notice.
        </p>
      </Section>

      <Section title="2. Account Registration">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>You must be at least 13 years old to create an account.</li>
          <li>You must provide accurate and complete information during registration.</li>
          <li>You are responsible for maintaining the security of your account credentials.</li>
          <li>You must notify us immediately of any unauthorized access to your account.</li>
          <li>One person may not maintain more than one account.</li>
        </ul>
      </Section>

      <Section title="3. Use of the Service">
        <p>
          VitaMind provides AI-powered personal life management tools
          including task management, goal tracking, habit tracking, daily
          planning, and an AI assistant. You may use the Service for lawful,
          personal productivity purposes.
        </p>
      </Section>

      <Section title="4. Acceptable Use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Use the Service for any unlawful purpose or in violation of any applicable law.</li>
          <li>Attempt to gain unauthorized access to any part of the Service or its infrastructure.</li>
          <li>Interfere with or disrupt the Service, servers, or networks connected to the Service.</li>
          <li>Reverse engineer, decompile, or disassemble any part of the Service.</li>
          <li>Use automated systems (bots, scrapers) to access the Service without permission.</li>
          <li>Upload malicious content, spam, or content that infringes on others&apos; rights.</li>
          <li>Attempt to abuse or circumvent AI usage limits or rate limiting.</li>
        </ul>
      </Section>

      <Section title="5. AI Features Disclaimer">
        <p>
          VitaMind uses artificial intelligence to provide daily planning
          suggestions, productivity insights, and conversational assistance.
          You acknowledge and agree that:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>AI suggestions are informational only</strong> &mdash; they
            are not professional advice (medical, financial, legal, or
            otherwise). You should not rely solely on AI output for important
            life decisions.
          </li>
          <li>
            <strong>AI output may be inaccurate</strong> &mdash; while we
            strive for quality, AI-generated content may contain errors,
            omissions, or biased information.
          </li>
          <li>
            <strong>You retain responsibility</strong> &mdash; for all
            decisions and actions you take based on AI suggestions.
          </li>
          <li>
            <strong>AI features may change</strong> &mdash; we may modify,
            improve, or discontinue AI features at any time.
          </li>
        </ul>
      </Section>

      <Section title="6. Data Ownership and Intellectual Property">
        <p>
          <strong>Your data is yours.</strong> You retain full ownership of all
          content you create within VitaMind, including tasks, goals, habits,
          notes, and AI chat messages.
        </p>
        <p>
          By using the Service, you grant us a limited license to process your
          data solely for the purpose of providing and improving the Service
          (including sending data to AI providers for feature functionality).
        </p>
        <p>
          The VitaMind brand, logo, design, and underlying software are the
          intellectual property of VitaMind. You may not copy, modify, or
          distribute any part of the Service without written permission.
        </p>
      </Section>

      <Section title="7. Privacy">
        <p>
          Your use of the Service is also governed by our{' '}
          <a href="/privacy" className="text-primary-300 hover:text-primary-200 transition-colors">
            Privacy Policy
          </a>
          , which describes how we collect, use, and protect your information.
        </p>
      </Section>

      <Section title="8. Subscription and Payments">
        <p>
          VitaMind may offer free and paid subscription tiers. If you purchase
          a paid plan:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Prices and billing cycles will be clearly displayed before purchase.</li>
          <li>Subscriptions renew automatically unless cancelled before the renewal date.</li>
          <li>Refunds are handled on a case-by-case basis; contact support for assistance.</li>
          <li>We reserve the right to change pricing with reasonable advance notice.</li>
        </ul>
      </Section>

      <Section title="9. Service Availability">
        <p>
          We strive to keep VitaMind available at all times but do not
          guarantee uninterrupted access. The Service may be temporarily
          unavailable due to maintenance, updates, or circumstances beyond our
          control. We are not liable for any losses resulting from service
          downtime.
        </p>
      </Section>

      <Section title="10. Account Termination">
        <p>
          <strong>By you:</strong> You may delete your account at any time
          through your account settings. Upon deletion, your data will be
          permanently removed within 30 days.
        </p>
        <p>
          <strong>By us:</strong> We may suspend or terminate your account if
          you violate these Terms, engage in abusive behavior, or if required
          by law. We will provide notice when reasonably possible.
        </p>
      </Section>

      <Section title="11. Limitation of Liability">
        <p>
          To the maximum extent permitted by applicable law, VitaMind and its
          team shall not be liable for any indirect, incidental, special,
          consequential, or punitive damages, including but not limited to loss
          of data, revenue, or productivity, arising from your use of the
          Service.
        </p>
        <p>
          The Service is provided &quot;as is&quot; and &quot;as
          available&quot; without warranties of any kind, express or implied.
        </p>
      </Section>

      <Section title="12. Indemnification">
        <p>
          You agree to indemnify and hold harmless VitaMind and its team from
          any claims, damages, or expenses arising from your use of the
          Service or violation of these Terms.
        </p>
      </Section>

      <Section title="13. Governing Law">
        <p>
          These Terms shall be governed by and construed in accordance with
          applicable law. Any disputes shall be resolved through good-faith
          negotiation before pursuing formal proceedings.
        </p>
      </Section>

      <Section title="14. Contact Us">
        <p>
          For questions about these Terms, contact us at:
        </p>
        <p className="mt-2">
          <strong>VitaMind</strong><br />
          Email:{' '}
          <a href="mailto:support@vitamind.app" className="text-primary-300 hover:text-primary-200 transition-colors">
            support@vitamind.app
          </a>
        </p>
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-text-secondary">
        {children}
      </div>
    </section>
  )
}
