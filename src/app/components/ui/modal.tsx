"use client";

import React from "react";
import { useIsMobile } from "./use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

interface ModalProps {
  title: string;
  description?: string;
  trigger?: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // desktop default is centered dialog, can be set to 'side' for a drawer/sheet on right
  desktopVariant?: "center" | "side";
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Modal({
  title,
  description,
  trigger,
  children,
  open,
  onOpenChange,
  desktopVariant = "center",
  side = "right",
  className = "",
}: ModalProps) {
  // Assuming useIsMobile()
  const isMobile = useIsMobile();

  // If mobile, we usually prefer a bottom sheet. But let's use standard Sheet for mobile slide-over/bottom if needed.
  // For simplicity, we'll map mobile to a bottom/side sheet, or full screen sheet depending on size.
  const isSheet = isMobile || desktopVariant === "side";

  if (isSheet) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
        <SheetContent 
          side={isMobile ? "bottom" : side} 
          className={`bg-[#161616] border-white/10 text-white ${isMobile ? 'h-[90vh] rounded-t-xl' : ''} ${className}`}
        >
          <SheetHeader className="text-left mb-4">
            <SheetTitle className="text-white">{title}</SheetTitle>
            {description && <SheetDescription className="text-gray-400">{description}</SheetDescription>}
          </SheetHeader>
          <div className="h-full overflow-y-auto pb-8">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop Centered Modal
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={`bg-[#161616] border-white/10 text-white sm:max-w-[425px] ${className}`}>
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          {description && <DialogDescription className="text-gray-400">{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
