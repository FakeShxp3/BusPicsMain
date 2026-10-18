"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      offset={72}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast !border-border !bg-popover !text-popover-foreground !shadow-lg !rounded-lg",
          title: "!text-sm !font-medium",
          description: "!text-[13px] !text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground !text-xs !rounded-md",
          cancelButton: "!bg-muted !text-muted-foreground !text-xs !rounded-md",
          closeButton: "!border-border !bg-popover !text-muted-foreground",
          success: "[&_[data-icon]]:!text-success",
          error: "[&_[data-icon]]:!text-destructive",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
