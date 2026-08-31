import type { Metadata } from "next";
import NotFound from "@/views/not-found";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page does not exist or may have moved. Return to the ProfileHub homepage.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function GlobalNotFound() {
  return <NotFound />;
}
