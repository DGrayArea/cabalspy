import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Cabalspy Privacy Policy — how we handle your data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
        Privacy Policy
      </h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: June 2025</p>

      <section className="space-y-8 text-gray-300 leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">1. Information We Collect</h2>
          <p>
            We collect information you provide directly, such as your name and email address
            when signing in via Google, Telegram, or Discord. We also collect wallet addresses
            generated or linked through the platform, and usage data such as tokens viewed and
            trades executed.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">2. How We Use Your Information</h2>
          <p>
            Your information is used to authenticate your account, provide personalized features
            (watchlists, trade history, portfolio tracking), and improve the Service. We do not
            sell your personal data to third parties.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">3. Data Storage</h2>
          <p>
            Account and session data is stored securely in encrypted databases hosted on
            Supabase (PostgreSQL). Wallet key management is handled by Turnkey, a non-custodial
            infrastructure provider — we never have access to your private keys.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">4. Cookies &amp; Sessions</h2>
          <p>
            We use HTTP-only session cookies to maintain your authenticated state. These cookies
            expire after 3 days and are never accessible to client-side JavaScript.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">5. Third-Party Services</h2>
          <p>
            We integrate with third-party services including Google (OAuth), Telegram, Discord,
            Helius (Solana RPC), Mobula (market data), and Jupiter (swap routing). Each of these
            services has their own privacy policies.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">6. Data Deletion</h2>
          <p>
            You may request deletion of your account and associated data at any time by
            contacting us through our Discord community or the platform&apos;s support channels.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">7. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify users of
            significant changes via the platform.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">8. Contact</h2>
          <p>
            If you have questions about this privacy policy or your data, please contact us
            through our Discord server or the support channels listed on the platform.
          </p>
        </div>
      </section>
    </main>
  );
}
