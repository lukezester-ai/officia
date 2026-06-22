"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function StripeCheckoutButton({ invoiceId, amount }: { invoiceId: number, amount: string | number }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/checkout`, {
        method: "POST",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Checkout failed");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url; // Redirect to Stripe Checkout
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to initiate payment");
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleCheckout} 
      disabled={isLoading}
      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 shadow-md transition-all hover:shadow-lg"
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : (
        <CreditCard className="mr-2 h-5 w-5" />
      )}
      {isLoading ? "Processing..." : `Pay €${amount} Securely`}
    </Button>
  );
}
