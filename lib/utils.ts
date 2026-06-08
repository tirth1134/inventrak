import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number, currency = "INR"): string =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

export const formatRelativeTime = (date: string | Date): string => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const getDaysUntil = (date: string | Date): number =>
  Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

export const getUrgencyColor = (daysUntil: number): string => {
  if (daysUntil < 0) return "text-red-600";
  if (daysUntil < 7) return "text-red-500";
  if (daysUntil < 15) return "text-yellow-500";
  return "text-green-600";
};

export const getStatusBadgeClass = (status: string): string => {
  const map: Record<string, string> = {
    ACTIVE: "text-green-600 border-green-200 bg-green-50",
    CANCELLED: "text-red-600 border-red-200 bg-red-50",
    EXPIRED: "text-gray-500 border-gray-200 bg-gray-50",
    IN_USE: "text-blue-600 border-blue-200 bg-blue-50",
    IN_STOCK: "text-green-600 border-green-200 bg-green-50",
    IN_REPAIR: "text-yellow-600 border-yellow-200 bg-yellow-50",
    SCRAPPED: "text-gray-500 border-gray-200 bg-gray-50",
    INACTIVE: "text-gray-500 border-gray-200 bg-gray-50",
  };
  return map[status] ?? "text-gray-600 border-gray-200 bg-gray-50";
};

export const getProcessorGradeBadge = (grade: "LOW" | "MID" | "HIGH") => {
  const map = {
    LOW: { label: "Low", class: "text-red-600 bg-red-50 border-red-200" },
    MID: { label: "Mid", class: "text-yellow-600 bg-yellow-50 border-yellow-200" },
    HIGH: { label: "High", class: "text-green-600 bg-green-50 border-green-200" },
  };
  return map[grade];
};

export const getAssetAge = (purchaseDate: string | Date | null | undefined): string => {
  if (!purchaseDate) return "—";
  const now = new Date();
  const purchase = new Date(purchaseDate);
  const diffMs = now.getTime() - purchase.getTime();
  const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
  const months = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
  if (years === 0) return `${months} month${months !== 1 ? "s" : ""}`;
  if (months === 0) return `${years} year${years !== 1 ? "s" : ""}`;
  return `${years} year${years !== 1 ? "s" : ""}, ${months} month${months !== 1 ? "s" : ""}`;
};

export const generateInitials = (name: string): string =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const formatBillingCycle = (cycle: string): string => {
  const map: Record<string, string> = {
    MONTHLY: "Monthly",
    YEARLY: "Yearly",
    ONE_TIME: "One-time",
  };
  return map[cycle] ?? cycle;
};

export const formatAssetType = (type: string): string => {
  const map: Record<string, string> = {
    DESKTOP: "Desktop",
    LAPTOP: "Laptop",
    MONITOR: "Monitor",
    SERVER: "Server",
    PERIPHERAL: "Peripheral",
    OTHER: "Other",
  };
  return map[type] ?? type;
};
