import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Cabalspy Terms of Service — read our terms before using the platform.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
        Terms of Service
      </h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: June 2025</p>

      <section className="space-y-8 text-gray-300 leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Cabalspy (&ldquo;the Service&rdquo;), you agree to be bound by
            these Terms of Service. If you do not agree, do not use the Service.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">2. Description of Service</h2>
          <p>
            Cabalspy is a real-time token tracking and trading terminal for Solana and BSC
            networks. The Service provides market data, wallet connectivity, and trade execution
            capabilities. All data is provided for informational purposes only.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">3. No Financial Advice</h2>
          <p>
            Nothing on Cabalspy constitutes financial, investment, legal, or tax advice.
            Cryptocurrency trading involves substantial risk of loss. You are solely responsible
            for your trading decisions.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">4. User Responsibilities</h2>
          <p>
            You are responsible for maintaining the security of your wallet credentials and
            session tokens. You agree not to use the Service for any unlawful purpose or in
            violation of any applicable regulations.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">5. Limitation of Liability</h2>
          <p>
            Cabalspy is provided &ldquo;as is&rdquo; without warranties of any kind. We are not
            liable for any losses, damages, or interruptions arising from your use of the Service,
            including losses from trading activity.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">6. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the Service
            after changes constitutes acceptance of the new terms.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">7. Contact</h2>
          <p>
            For questions about these terms, please reach out via our Discord community or the
            contact information provided on the platform.
          </p>
        </div>
      </section>
    </main>
  );
}
