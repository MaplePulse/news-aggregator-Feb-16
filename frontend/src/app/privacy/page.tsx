import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Regional Pulse News",
  description:
    "Privacy policy for Regional Pulse News. Learn how we handle your data, what we collect, and your rights.",
  openGraph: {
    title: "Privacy Policy | Regional Pulse News",
    description:
      "Privacy policy for Regional Pulse News. Learn how we handle your data.",
    url: "https://regionalpulsenews.com/privacy",
  },
  alternates: {
    canonical: "https://regionalpulsenews.com/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← Back to headlines
      </Link>

      <h1 className="text-4xl font-extrabold tracking-tight text-gray-950 dark:text-white sm:text-5xl">
        Privacy Policy
      </h1>

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Last updated: March 25, 2026
      </p>

      <section className="mt-8 space-y-6 text-base leading-relaxed text-gray-700 dark:text-gray-300">
        <p>
          Regional Pulse News (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the website
          at regionalpulsenews.com and the Regional Pulse News mobile application. This privacy
          policy explains what information we collect, how we use it, and your choices.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Information we collect
        </h2>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Information you provide
        </h3>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Subscription information:</strong> If you subscribe, your payment is processed
            by Stripe. We do not store your credit card number. Stripe provides us with your email
            address, subscription status, and billing history. See{" "}
            <a
              href="https://stripe.com/privacy"
              className="text-blue-600 underline dark:text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              Stripe&apos;s privacy policy
            </a>
            .
          </li>
          <li>
            <strong>Feedback:</strong> If you submit the feedback form, we receive whatever
            information you include in your message. Feedback is processed by Formspree. See{" "}
            <a
              href="https://formspree.io/legal/privacy-policy"
              className="text-blue-600 underline dark:text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              Formspree&apos;s privacy policy
            </a>
            .
          </li>
          <li>
            <strong>Contact emails:</strong> If you email us, we receive your email address and
            message content.
          </li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Information collected automatically
        </h3>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Analytics:</strong> We use Google Analytics to understand how visitors use the
            site. This collects anonymized usage data such as pages visited, time on site, device
            type, and approximate location (country/city level). Google Analytics uses cookies. See{" "}
            <a
              href="https://policies.google.com/privacy"
              className="text-blue-600 underline dark:text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google&apos;s privacy policy
            </a>
            .
          </li>
          <li>
            <strong>Local storage:</strong> We store your theme preference (light/dark mode), region
            selection, and filter settings in your browser&apos;s local storage. This data stays on
            your device and is not sent to our servers.
          </li>
          <li>
            <strong>Hosting logs:</strong> Our hosting providers (Vercel and Render) may
            automatically log IP addresses, request timestamps, and browser information as part of
            standard web server operation.
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          How we use your information
        </h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>To provide and maintain the news aggregation service</li>
          <li>To process subscriptions and manage your account</li>
          <li>To respond to feedback and support requests</li>
          <li>To understand usage patterns and improve the service</li>
          <li>To display relevant advertising to non-subscribers</li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Advertising
        </h2>
        <p>
          Free users see advertisements between news articles. Subscribing removes all ads. We do
          not sell your personal data to advertisers.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Third-party services
        </h2>
        <p>We use the following third-party services:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Stripe</strong> for payment processing
          </li>
          <li>
            <strong>Google Analytics</strong> for usage analytics
          </li>
          <li>
            <strong>Formspree</strong> for feedback form processing
          </li>
          <li>
            <strong>Vercel</strong> for website hosting
          </li>
          <li>
            <strong>Render</strong> for backend hosting
          </li>
          <li>
            <strong>Google Translate</strong> for article translation links
          </li>
        </ul>
        <p>
          Each of these services has its own privacy policy governing their handling of data. We
          encourage you to review them.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Data retention
        </h2>
        <p>
          Subscription data is retained as long as your subscription is active and for a reasonable
          period afterward for billing and legal purposes. Analytics data is retained according to
          Google Analytics default settings. You can request deletion of your data by contacting us.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Your rights
        </h2>
        <p>You have the right to:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Request access to the personal data we hold about you</li>
          <li>Request correction or deletion of your personal data</li>
          <li>Cancel your subscription at any time through the customer portal</li>
          <li>
            Opt out of Google Analytics by installing the{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              className="text-blue-600 underline dark:text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Analytics Opt-out Browser Add-on
            </a>
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Children&apos;s privacy
        </h2>
        <p>
          Our service is not directed at children under 13. We do not knowingly collect personal
          information from children. If you believe we have collected data from a child, please
          contact us and we will delete it.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Changes to this policy
        </h2>
        <p>
          We may update this privacy policy from time to time. Changes will be posted on this page
          with an updated date. Continued use of the service after changes constitutes acceptance.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contact</h2>
        <p>
          For privacy-related questions or requests, contact us at{" "}
          <a
            href="mailto:hello@regionalpulsenews.com"
            className="text-blue-600 underline dark:text-blue-400"
          >
            hello@regionalpulsenews.com
          </a>
          .
        </p>
      </section>

      <div className="mt-12 border-t border-gray-200 pt-6 dark:border-gray-800">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-gray-900 bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 dark:border-white dark:bg-white dark:text-black"
        >
          ← Back to headlines
        </Link>
      </div>
    </main>
  );
}
