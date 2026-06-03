"use client";

import QRCode from "qrcode";
import { Download, ExternalLink, QrCode } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { buildProfileUrl, getClientAppUrl } from "@/lib/profile-url";

export function QRButton({ username, url }: { username: string; url?: string }) {
  const safeUsername = useMemo(() => username.trim(), [username]);
  const [shareUrl, setShareUrl] = useState(url || "");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrError, setQrError] = useState("");

  useEffect(() => {
    if (!safeUsername) {
      setShareUrl("");
      return;
    }

    if (url) {
      setShareUrl(url);
      return;
    }

    setShareUrl(buildProfileUrl(getClientAppUrl(), safeUsername));
  }, [safeUsername, url]);

  useEffect(() => {
    if (!safeUsername || !shareUrl) {
      setQrDataUrl("");
      setQrError("");
      setIsGenerating(false);
      return;
    }

    let cancelled = false;
    setIsGenerating(true);
    setQrError("");

    QRCode.toDataURL(shareUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 240,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl("");
          setQrError("Could not generate QR code.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [safeUsername, shareUrl]);

  const handleDownload = () => {
    if (!qrDataUrl || !safeUsername) return;

    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `profilehub-${safeUsername}-qr.png`;
    link.click();
  };

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
          <div className="w-48 h-48 flex items-center justify-center">
            {!safeUsername ? (
              <p className="px-4 text-center text-sm text-black">Set username to generate QR</p>
            ) : isGenerating ? (
              <p className="px-4 text-center text-sm text-black">Generating QR...</p>
            ) : qrError ? (
              <p className="px-4 text-center text-sm text-destructive">{qrError}</p>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR code for ${shareUrl}`} className="h-48 w-48" />
            ) : (
              <QrCode className="h-24 w-24 text-black" />
            )}
          </div>
        </div>
        
        <div className="flex w-full flex-wrap items-center gap-2">
          <div className="grid flex-1 gap-2">
            <input
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-center"
              value={shareUrl}
              readOnly
              placeholder="Set username to generate QR"
            />
          </div>
          <Button type="button" disabled={!shareUrl} onClick={() => navigator.clipboard.writeText(shareUrl)}>
            Copy
          </Button>
          <Button type="button" variant="outline" disabled={!qrDataUrl} onClick={handleDownload} aria-label="Download QR PNG">
            <Download className="h-4 w-4" />
          </Button>
          {shareUrl ? (
            <Button type="button" variant="outline" asChild>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" aria-label="Open profile">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : (
            <Button type="button" variant="outline" disabled aria-label="Open profile">
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
