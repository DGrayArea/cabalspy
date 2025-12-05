"use client";

import { useState } from "react";
import { useTurnkey, AuthState, ClientState } from "@turnkey/react-wallet-kit";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, Download, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const { turnkeyUser } = useAuth();
  const { toast } = useToast();
  const {
    wallets,
    createWallet,
    handleExportWallet,
    refreshWallets,
    authState,
    clientState,
  } = useTurnkey();

  const [step, setStep] = useState<"create" | "export">("create");
  const [isCreating, setIsCreating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [createdWalletId, setCreatedWalletId] = useState<string | null>(null);

  // Check if user has an embedded Solana wallet
  const hasEmbeddedSolanaWallet = wallets?.some(
    (wallet) =>
      (wallet.source === "embedded" || !wallet.source) &&
      wallet.accounts?.some(
        (acc) => acc.addressFormat === "ADDRESS_FORMAT_SOLANA"
      )
  );

  // Show create prompt if authenticated but no wallet
  const shouldShowCreatePrompt =
    authState === AuthState.Authenticated &&
    clientState === ClientState.Ready &&
    turnkeyUser &&
    !hasEmbeddedSolanaWallet &&
    step === "create";

  // Show export prompt after wallet creation
  const shouldShowExportPrompt = step === "export" && createdWalletId;

  const handleCreateWallet = async () => {
    if (!createWallet || !turnkeyUser) {
      return;
    }

    setIsCreating(true);
    try {
      console.log("🔄 Creating wallet for new user...");

      const wallet = await createWallet({
        walletName: `${turnkeyUser.userName}'s Solana Wallet`,
        accounts: ["ADDRESS_FORMAT_SOLANA"],
      });

      console.log("✅ Wallet created:", wallet);
      // createWallet returns walletId as string or object with walletId
      const walletId =
        typeof wallet === "string"
          ? wallet
          : (wallet as { walletId?: string })?.walletId || null;
      setCreatedWalletId(walletId);

      // Refresh wallets to pick up the new wallet
      await refreshWallets();

      // Move to export step
      setStep("export");
    } catch (error: unknown) {
      const errorMessage =
        (error as { message?: string })?.message || String(error);
      console.error("❌ Error creating wallet:", error);
      toast({
        variant: "error",
        title: "Failed to create wallet",
        description:
          errorMessage ||
          "Please try again or contact support if the issue persists.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleExportClick = () => {
    if (!createdWalletId) return;
    setShowExportDialog(true);
  };

  const confirmExport = async () => {
    if (!handleExportWallet || !createdWalletId) {
      return;
    }

    setIsExporting(true);
    setShowExportDialog(false);

    // Small delay to ensure dialog closes before opening export window
    setTimeout(async () => {
      const maxRetries = 2;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(
            `🔄 Exporting wallet (attempt ${attempt}/${maxRetries})...`,
            {
              walletId: createdWalletId,
            }
          );

          await handleExportWallet({
            walletId: createdWalletId,
          });

          console.log("✅ Wallet export initiated");
          // Mark onboarding as complete
          onComplete();
          return;
        } catch (error: unknown) {
          const errorMessage =
            (error as { message?: string })?.message || String(error);
          console.error(
            `❌ Error exporting wallet (attempt ${attempt}):`,
            error
          );

          if (
            errorMessage.includes("origin") ||
            errorMessage.includes("CORS")
          ) {
            console.log("CORS error detected, not retrying");
            // Still mark as complete since export window opened
            onComplete();
            return;
          }

          if (attempt === maxRetries) {
            toast({
              variant: "error",
              title: "Failed to export wallet",
              description: `After ${maxRetries} attempts: ${errorMessage}. You can export it later from the wallet settings.`,
            });
            // Mark as complete anyway so user can continue
            onComplete();
          } else {
            const delay = 500 * attempt;
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
    }, 300);
  };

  const handleSkipExport = () => {
    // User can export later from wallet settings
    onComplete();
  };

  // Create wallet prompt
  if (shouldShowCreatePrompt) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogPortal>
          <DialogOverlay className="!z-[300]" />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-[301] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 bg-panel border border-gray-800/50 rounded-lg p-6 text-white shadow-lg duration-200"
            )}
          >
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Create Your Wallet
              </DialogTitle>
              <DialogDescription className="sr-only">
                Create a new Solana wallet to get started
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-gray-300">
                Welcome! To get started, you&apos;ll need to create a Solana
                wallet. This wallet will be securely managed by Turnkey.
              </p>

              <div className="bg-panel-elev/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-200">
                  Your wallet will allow you to:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-2">
                  <li>Store SOL and SPL tokens</li>
                  <li>Trade tokens on Solana</li>
                  <li>Manage your portfolio</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleCreateWallet}
                disabled={isCreating}
                className="w-full bg-primary-dark hover:bg-primary-darker"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Create Wallet
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    );
  }

  // Export wallet prompt (after creation)
  if (shouldShowExportPrompt) {
    return (
      <>
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogPortal>
            <DialogOverlay className="!z-[300]" />
            <DialogPrimitive.Content
              className={cn(
                "fixed left-[50%] top-[50%] z-[301] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 bg-panel border border-gray-800/50 rounded-lg p-6 text-white shadow-lg duration-200"
              )}
            >
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Download className="w-5 h-5 text-yellow-400" />
                  Save Your Recovery Phrase
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Export and save your wallet recovery phrase
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-yellow-400">
                      Important: Save your recovery phrase now
                    </p>
                    <p className="text-sm text-gray-300">
                      Your wallet has been created successfully! To ensure you
                      can recover your wallet in the future, please export and
                      securely save your recovery phrase or private key.
                    </p>
                  </div>
                </div>

                <div className="bg-panel-elev/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-gray-200">
                    Why save your recovery phrase?
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-2">
                    <li>Recover your wallet if you lose access</li>
                    <li>Restore your wallet on a new device</li>
                    <li>Access your funds from anywhere</li>
                  </ul>
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  onClick={handleSkipExport}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  I&apos;ll Do It Later
                </Button>
                <Button
                  onClick={handleExportClick}
                  disabled={isExporting}
                  className="w-full sm:w-auto bg-primary-dark hover:bg-primary-darker"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export & Save Now
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogPrimitive.Content>
          </DialogPortal>
        </Dialog>

        {/* Export Confirmation Dialog */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogPortal>
            <DialogOverlay className="!z-[400]" />
            <DialogPrimitive.Content
              className={cn(
                "fixed left-[50%] top-[50%] z-[401] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 bg-panel border border-gray-800/50 rounded-lg p-6 text-white shadow-lg duration-200"
              )}
            >
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-red-400">
                  ⚠️ Security Warning
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Exporting your wallet will reveal your private key or seed
                  phrase. This allows anyone with access to control your wallet
                  and funds.
                </DialogDescription>
                <div className="text-gray-300 pt-2 space-y-3">
                  <p className="font-semibold">
                    Exporting your wallet will reveal your private key or seed
                    phrase.
                  </p>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-200">
                      Anyone with access to your exported credentials can:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-2">
                      <li>Control your wallet and funds</li>
                      <li>Transfer all assets</li>
                      <li>Access your transaction history</li>
                    </ul>
                  </div>

                  <div className="space-y-2 pt-2">
                    <p className="text-sm font-medium text-gray-200">
                      Only export if you:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-2">
                      <li>Understand the security risks</li>
                      <li>Will store it securely</li>
                      <li>Trust the device you&apos;re using</li>
                    </ul>
                  </div>

                  <p className="text-xs text-yellow-400 pt-2 border-t border-gray-700">
                    Note: The export will open in a new window. CORS warnings in
                    the console are expected and can be ignored.
                  </p>
                </div>
              </DialogHeader>

              <DialogFooter>
                <Button
                  onClick={() => setShowExportDialog(false)}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmExport}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                >
                  I Understand, Export Wallet
                </Button>
              </DialogFooter>
            </DialogPrimitive.Content>
          </DialogPortal>
        </Dialog>
      </>
    );
  }

  return null;
}
