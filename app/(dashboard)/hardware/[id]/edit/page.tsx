"use client";

import { use } from "react";
import { useAsset } from "@/lib/hooks/useHardware";
import { AssetForm } from "@/components/hardware/AssetForm";
import { PageLoader } from "@/components/shared/PageLoader";

export default function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { asset, isLoading } = useAsset(id);

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Edit Asset</h1>
        <p className="text-sm text-muted-foreground mt-0.5 font-mono">{asset?.assetId}</p>
      </div>
      {asset && <AssetForm asset={asset} />}
    </div>
  );
}
