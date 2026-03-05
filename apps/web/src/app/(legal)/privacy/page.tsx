import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy' }

/**
 * Privacy Policy page. Uses placeholder company info and dates that should be
 * customized before production launch. Covers data collection, AI processing,
 * storage, user rights, and cookies as required for a SaaS product.
 */
export default function PrivacyPolicyPage() {
  return (
    <article className="space-y-8 animate-fade-in">
      <header className="space-y-3 border-b border-border pb-8">
        <h1 className="text-3xl font-bold gradient-text">Privacy Policy</h1>
        <p className="text-sm text-text-tertiary">
          Last updated: March 1, 2026
        </p>
      </header>

      <Section title="1. Introduction">
        <p>
          VitaMind (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates
          the VitaMind application and website (collectively, the
          &quot;Service&quot;). This Privacy Policy explains how we collect, use,
          store, and protect your personal information when you use our Service.
        </p>
        <p>
          By creating an account or using VitaMind, you agree to the practices
          described in this policy. If you do not agree, please do not use the
          Service.
        </p>
      </Section>

      <Section title="2. Information We Collect">
        <p>We collect the following categories of data:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Account information</strong> &mdash; name, email address,
            and authentication credentials (password hash or OAuth token).
          </li>
          <li>
            <strong>User-generated content</strong> &mdash; tasks, goals,
            habits, daily plans, and notes you create within the Service.
          </li>
          <li>
            <strong>AI interaction data</strong> &mdash; messages you send to
            the AI assistant and the generated responses.
          </li>
          <li>
            <strong>Usage analytics</strong> &mdash; anonymized interaction
            data such as feature usage, session duration, and device type,
            collected via PostHog or similar analytics tools.
          </li>
          <li>
            <strong>Device information</strong> &mdash; operating system,
            browser type, and push notification tokens (for Firebase Cloud
            Messaging).
          </li>
        </ul>
      </Section>

      <Section title="3. How We Use Your Information">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>To provide and personalize the Service, including AI-powered daily planning and productivity insights.</li>
          <li>To authenticate your identity and secure your account.</li>
          <li>To send transactional emails (account verification, password resets) and optional notifications.</li>
          <li>To improve the Service through aggregated, anonymized analytics.</li>
          <li>To respond to support requests and communicate important updates.</li>
        </ul>
      </Section>

      <Section title="4. AI Data Processing">
        <p>
          VitaMind uses third-party AI services (OpenAI and/or Groq) to power
          the daily planner, productivity insights, and AI chat assistant.
          When you use these features, relevant context (such as your tasks and
          goals) is sent to the AI provider to generate personalized
          suggestions.
        </p>
        <p>
          We minimize data sent to AI providers by using structured prompts and
          caching responses. AI providers process data according to their own
          privacy policies and do not use your data to train their models
          under our agreements.
        </p>
      </Section>

      <Section title="5. Data Storage and Security">
        <p>
          Your data is stored in Supabase (powered by PostgreSQL) with
          row-level security policies ensuring each user can only access their
          own data. All data is encrypted in transit (TLS/HTTPS) and at rest.
        </p>
        <p>
          We implement industry-standard security measures including
          authentication checks on all protected routes, API rate limiting,
          input sanitization, and secure token handling.
        </p>
      </Section>

      <Section title="6. Data Sharing">
        <p>
          We do not sell your personal information. We share data only with:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>AI service providers</strong> (OpenAI/Groq) &mdash; as
            described in Section 4, solely to provide AI features.
          </li>
          <li>
            <strong>Infrastructure providers</strong> (Supabase, Vercel,
            Firebase) &mdash; for hosting, storage, and push notifications.
          </li>
          <li>
            <strong>Analytics providers</strong> (PostHog) &mdash; anonymized
            usage data only.
          </li>
          <li>
            <strong>Legal authorities</strong> &mdash; only when required by
            applicable law or to protect our rights.
          </li>
        </ul>
      </Section>

      <Section title="7. Your Rights">
        <p>You have the right to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Access</strong> &mdash; request a copy of all personal data
            we hold about you.
          </li>
          <li>
            <strong>Export</strong> &mdash; download your tasks, goals, habits,
            and other content in a standard format.
          </li>
          <li>
            <strong>Correction</strong> &mdash; update or correct inaccurate
            information in your account settings.
          </li>
          <li>
            <strong>Deletion</strong> &mdash; request permanent deletion of
            your account and all associated data. We will process deletion
            requests within 30 days.
          </li>
          <li>
            <strong>Opt-out</strong> &mdash; disable push notifications and
            optional emails at any time through your account settings.
          </li>
        </ul>
        <p>
          To exercise any of these rights, contact us at{' '}
          <a href="mailto:support@vitamind.app" className="text-primary-300 hover:text-primary-200 transition-colors">
            support@vitamind.app
          </a>.
        </p>
      </Section>

      <Section title="8. Cookies and Local Storage">
        <p>
          We use essential cookies and browser local storage to maintain your
          authentication session and preferences. We do not use third-party
          advertising or tracking cookies. Analytics cookies are anonymized
          and do not contain personally identifiable information.
        </p>
      </Section>

      <Section title="9. Data Retention">
        <p>
          We retain your data for as long as your account is active. If you
          delete your account, we will remove all personal data within 30 days,
          except where retention is required by law. Anonymized analytics data
          may be retained indefinitely.
        </p>
      </Section>

      <Section title="10. Children's Privacy">
        <p>
          VitaMind is not intended for users under the age of 13. We do not
          knowingly collect personal information from children. If you believe
          a child has provided us with personal data, please contact us and we
          will promptly delete it.
        </p>
      </Section>

      <Section title="11. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. We will notify
          you of material changes by posting a notice within the app or sending
          an email. Continued use of the Service after changes constitutes
          acceptance of the updated policy.
        </p>
      </Section>

      <Section title="12. Contact Us">
        <p>
          If you have questions or concerns about this Privacy Policy, contact
          us at:
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
