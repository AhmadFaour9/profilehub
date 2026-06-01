"use client";

import { ExternalLink, QrCode } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function QRButton({ username, url }: { username: string; url?: string }) {
  const fallbackUrl = useMemo(() => `/${username}`, [username]);
  const [shareUrl, setShareUrl] = useState(url || fallbackUrl);

  useEffect(() => {
    if (url) {
      setShareUrl(url);
      return;
    }

    setShareUrl(new URL(`/${username}`, window.location.origin).toString());
  }, [url, username]);

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
              value={shareUrl}
              readOnly
            />
          </div>
          <Button type="button" onClick={() => navigator.clipboard.writeText(shareUrl)}>
            Copy
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer" aria-label="Open profile">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
