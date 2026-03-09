import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-24">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-4xl font-bold text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500 mb-12">
            Last updated: March 1, 2025
          </p>

          <div className="prose-invert space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                1. Information We Collect
              </h2>
              <p className="text-gray-400 leading-relaxed">
                VitaMind collects information you provide directly, including
                your email address when joining the waitlist, account
                information when you register, and life data you voluntarily
                enter such as tasks, goals, habits, and notes. We also collect
                usage data including how you interact with the platform,
                feature usage patterns, and device information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                2. How We Use Your Information
              </h2>
              <p className="text-gray-400 leading-relaxed">
                We use your information to provide and improve VitaMind
                services, generate personalized AI insights and
                recommendations, send you relevant updates about the platform,
                and analyze aggregate usage patterns to improve the product. We
                never sell your personal data to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                3. AI and Your Data
              </h2>
              <p className="text-gray-400 leading-relaxed">
                VitaMind uses AI to analyze your behavioral patterns and
                provide personalized insights. Your data is processed securely
                and is never used to train general-purpose AI models. AI
                analysis is performed on your individual data only and is not
                shared across users.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                4. Data Security
              </h2>
              <p className="text-gray-400 leading-relaxed">
                We implement industry-standard security measures including
                encryption in transit and at rest, row-level security policies
                in our database, and regular security audits. Your data is
                stored on secure servers provided by Supabase with SOC 2 Type
                II compliance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                5. Your Rights
              </h2>
              <p className="text-gray-400 leading-relaxed">
                You have the right to access, export, correct, or delete your
                personal data at any time. You can request a complete export of
                your data or account deletion by contacting us. We will
                respond to all data requests within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                6. Cookies and Tracking
              </h2>
              <p className="text-gray-400 leading-relaxed">
                VitaMind uses essential cookies for authentication and session
                management. We use privacy-focused analytics to understand
                product usage. We do not use third-party advertising trackers
                or sell data to advertisers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                7. Contact
              </h2>
              <p className="text-gray-400 leading-relaxed">
                For privacy-related questions or data requests, please contact
                us at privacy@vitamind.app. We take your privacy seriously and
                will respond promptly to all inquiries.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
