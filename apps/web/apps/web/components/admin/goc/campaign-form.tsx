"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Goc Campaign } from "@prisma/client";

interface GocCampaignFormProps {
  campaign?: GocCampaign & {
    options: Array<{ id: string; productId: string; product: { name: string } }>;
  };
}

export default function GocCampaignForm({ campaign }: GocCampaignFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(campaign?.name || "");
  const [slug, setSlug] = useState(campaign?.slug || "");
  const [description, setDescription] = useState(campaign?.description || "");
  const [heroImage, setHeroImage] = useState(campaign?.heroImage || "");
  const [status, setStatus] = useState(campaign?.status || "draft");
  const [claimLimit, setClaimLimit] = useState(
    campaign?.claimLimit?.toString() || ""
  );
  const [expiresAt, setExpiresAt] = useState(
    campaign?.expiresAt?.toISOString().split("T")[0] || ""
  );
  const [productIds, setProductIds] = useState(
    campaign?.options.map((o) => o.productId) || []
  );
  const [searchProduct, setSearchProduct] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearchProduct = async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/products?search=${query}&limit=10`);
      const data = await res.json();
      setSearchResults(data.products || []);
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const addProduct = (productId: string, name: string) => {
    if (!productIds.includes(productId)) {
      setProductIds([...productIds, productId]);
    }
    setSearchProduct("");
    setSearchResults([]);
  };

  const removeProduct = (productId: string) => {
    setProductIds(productIds.filter((id) => id !== productId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = campaign ? `/api/admin/goc/${campaign.id}` : "/api/admin/goc";
      const method = campaign ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug || undefined,
          description: description || undefined,
          heroImage: heroImage || undefined,
          status,
          claimLimit: claimLimit ? parseInt(claimLimit, 10) : null,
          expiresAt: expiresAt || null,
          productIds,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save campaign");
      }

      toast.success(
        campaign ? "Campaign updated" : "Campaign created"
      );
      router.push("/admin/goc");
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          Campaign Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Diwali 2026 Gifts"
          className="w-full px-4 py-2 border-2 border-bdr rounded-md text-ink focus:border-em focus:outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          Slug
        </label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="Auto-generated from name"
          className="w-full px-4 py-2 border-2 border-bdr rounded-md text-ink focus:border-em focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Campaign description..."
          rows={4}
          className="w-full px-4 py-2 border-2 border-bdr rounded-md text-ink focus:border-em focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          Hero Image URL
        </label>
        <input
          type="text"
          value={heroImage}
          onChange={(e) => setHeroImage(e.target.value)}
          placeholder="https://..."
          className="w-full px-4 py-2 border-2 border-bdr rounded-md text-ink focus:border-em focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-4 py-2 border-2 border-bdr rounded-md text-ink focus:border-em focus:outline-none"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink mb-2">
            Claim Limit
          </label>
          <input
            type="number"
            value={claimLimit}
            onChange={(e) => setClaimLimit(e.target.value)}
            placeholder="Leave empty for unlimited"
            className="w-full px-4 py-2 border-2 border-bdr rounded-md text-ink focus:border-em focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          Expires At
        </label>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="w-full px-4 py-2 border-2 border-bdr rounded-md text-ink focus:border-em focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          Product Options *
        </label>
        <div className="space-y-2 mb-4">
          <input
            type="text"
            value={searchProduct}
            onChange={(e) => {
              setSearchProduct(e.target.value);
              handleSearchProduct(e.target.value);
            }}
            placeholder="Search products..."
            className="w-full px-4 py-2 border-2 border-bdr rounded-md text-ink focus:border-em focus:outline-none"
          />
          {searchResults.length > 0 && (
            <div className="border-2 border-bdr rounded-md max-h-48 overflow-y-auto">
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProduct(product.id, product.name)}
                  className="w-full text-left px-4 py-2 hover:bg-elevated transition border-b border-bdr last:border-0"
                >
                  <p className="font-semibold text-ink">{product.name}</p>
                  <p className="text-sm text-ink-2">{product.brand}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          {productIds.length === 0 ? (
            <p className="text-ink-2 text-sm">No products selected</p>
          ) : (
            productIds.map((productId, idx) => {
              const product = campaign?.options.find(
                (o) => o.productId === productId
              )?.product;
              return (
                <div
                  key={productId}
                  className="flex items-center justify-between bg-elevated px-4 py-2 rounded-md"
                >
                  <span className="text-ink font-semibold">
                    {product?.name || productId}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeProduct(productId)}
                    className="text-err hover:text-err-600 text-sm font-semibold"
                  >
                    Remove
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex gap-4 pt-6">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-em text-white rounded-md font-semibold hover:bg-em-600 disabled:opacity-50 transition"
        >
          {loading ? "Saving..." : campaign ? "Update Campaign" : "Create Campaign"}
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-2 border-2 border-bdr text-ink rounded-md font-semibold hover:bg-elevated transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
