import { AssetForm } from "@/components/hardware/AssetForm";

export default function NewAssetPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Add Asset</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Add a new hardware asset to inventory</p>
      </div>
      <AssetForm />
    </div>
  );
}
