"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  ToastAction,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Determine icon based on variant
        let IconComponent: React.ComponentType<{ className?: string }> | null = null;
        if (variant === "success") {
          IconComponent = CheckCircle2;
        } else if (variant === "error") {
          IconComponent = XCircle;
        } else if (variant === "info" || props.className?.includes("loading")) {
          IconComponent = Loader2;
        }

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="grid gap-1 flex-1">
              {title && (
                <div className="flex items-center gap-2">
                  {IconComponent && (
                    <IconComponent
                      className={`h-4 w-4 shrink-0 ${
                        variant === "success"
                          ? "text-green-400"
                          : variant === "error"
                            ? "text-red-400"
                            : "text-blue-400"
                      } ${variant === "info" || props.className?.includes("loading") ? "animate-spin" : ""}`}
                    />
                  )}
                  <ToastTitle>{title}</ToastTitle>
                </div>
              )}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action && (
              <div className="flex items-center gap-2">
                {action}
              </div>
            )}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

