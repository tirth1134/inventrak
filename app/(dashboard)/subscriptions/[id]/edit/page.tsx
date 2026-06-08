"use client";

import { use } from "react";
import { useSubscription } from "@/lib/hooks/useSubscriptions";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";
import { PageLoader } from "@/components/shared/PageLoader";

export default function EditSubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { subscription, isLoading } = useSubscription(id);

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Edit Subscription</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{subscription?.name}</p>
      </div>
      {subscription && <SubscriptionForm subscription={subscription} />}
    </div>
  );
}
