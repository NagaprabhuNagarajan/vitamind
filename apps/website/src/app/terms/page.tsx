import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-24">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-4xl font-bold text-white mb-2">
            Terms of Service
          </h1>
          <p className="text-sm text-gray-500 mb-12">
            Last updated: March 1, 2025
          </p>

          <div className="prose-invert space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-400 leading-relaxed">
                By accessing or using VitaMind, you agree to be bound by these
                Terms of Service. If you do not agree to these terms, you may
                not use the service. VitaMind reserves the right to update
                these terms at any time, and continued use constitutes
                acceptance of any changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                2. Description of Service
              </h2>
              <p className="text-gray-400 leading-relaxed">
                VitaMind is an AI-powered personal life management platform
                that helps users track tasks, goals, and habits, and provides
                AI-generated insights and recommendations. The service is
                provided on an &ldquo;as is&rdquo; basis and may be modified
                or updated at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                3. User Accounts
              </h2>
              <p className="text-gray-400 leading-relaxed">
                You are responsible for maintaining the confidentiality of
                your account credentials and for all activities that occur
                under your account. You must provide accurate information when
                creating an account and promptly update any changes. You must
                be at least 16 years old to use VitaMind.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                4. User Content
              </h2>
              <p className="text-gray-400 leading-relaxed">
                You retain ownership of all content you create within
                VitaMind, including tasks, goals, habits, and notes. By using
                the service, you grant VitaMind a limited license to process
                your content for the purpose of providing AI-powered features
                and insights. You may export or delete your content at any
                time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                5. AI-Generated Content
              </h2>
              <p className="text-gray-400 leading-relaxed">
                VitaMind provides AI-generated insights, recommendations, and
                coaching as a tool for personal improvement. These should not
                be considered professional medical, financial, or
                psychological advice. Always consult qualified professionals
                for important life decisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                6. Subscription and Billing
              </h2>
              <p className="text-gray-400 leading-relaxed">
                VitaMind offers both free and paid subscription plans. Paid
                subscriptions are billed in advance on a monthly or annual
                basis. You may cancel your subscription at any time, and
                access will continue until the end of the current billing
                period. Refunds are handled on a case-by-case basis.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                7. Limitation of Liability
              </h2>
              <p className="text-gray-400 leading-relaxed">
                VitaMind shall not be liable for any indirect, incidental, or
                consequential damages arising from your use of the service.
                Our total liability shall not exceed the amount you have paid
                for the service in the twelve months preceding any claim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                8. Contact
              </h2>
              <p className="text-gray-400 leading-relaxed">
                For questions about these terms, please contact us at
                legal@vitamind.app. We are committed to resolving any concerns
                promptly and transparently.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
