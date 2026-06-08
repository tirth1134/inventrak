import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";

export default function NewSubscriptionPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Add Subscription</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Add a new software subscription</p>
      </div>
      <SubscriptionForm />
    </div>
  );
}
