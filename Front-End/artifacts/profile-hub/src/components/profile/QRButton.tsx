"use client";

import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function QRButton({ url }: { url: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full bg-background/80 backdrop-blur-sm shadow-sm" data-testid="btn-share-qr">
          <QrCode className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md flex flex-col items-center justify-center p-8">
        <DialogHeader>
          <DialogTitle className="text-center font-serif text-2xl">Share Profile</DialogTitle>
        </DialogHeader>
        
        <div className="my-8 p-4 bg-white rounded-xl shadow-sm border">
          {/* Placeholder for actual QR code */}
          <div className="w-48 h-48 bg-muted flex items-center justify-center border-4 border-black border-dashed">
            <QrCode className="w-24 h-24 text-black" />
          </div>
        </div>
        
        <div className="flex w-full items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-center"
              value={url}
              readOnly
            />
          </div>
          <Button type="button" onClick={() => navigator.clipboard.writeText(url)}>
            Copy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
