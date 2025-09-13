import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="mx-auto max-w-3xl text-center">
        <div className="flex items-center justify-center">
          <Image
            src="/BN-Tortechnik-Logo.svg" // direct din public
            alt="B&N Tortechnik Logo"
            width={220} // sau dimensiunea dorită
            height={120}
          />
        </div>

        <p className="text-muted-foreground mt-3 text-base text-balance sm:text-lg">
          With this application, you can upload technical manuals and use an AI
          assistant that provides targeted answers from the uploaded documents.
          Perfect for quickly obtaining precise information about machines,
          controls, and technical processes—all in one place.
        </p>
        <div className="mx-auto mt-6 flex max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
