import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = "" }: SkeletonCardProps) {
  return (
    <div className={cn("rounded-card border border-border p-card animate-pulse", className)}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-muted rounded-full"></div>
          <div className="h-4 bg-muted rounded w-20"></div>
        </div>
        <div className="h-3 bg-muted rounded w-12"></div>
      </div>
      
      {/* Main value skeleton */}
      <div className="flex items-baseline gap-2 my-2">
        <div className="h-8 bg-muted rounded w-12"></div>
        <div className="h-3 bg-muted rounded w-16"></div>
      </div>
      
      {/* Context text skeletons */}
      <div className="space-y-1">
        <div className="h-3 bg-muted rounded w-full"></div>
        <div className="h-3 bg-muted rounded w-3/4"></div>
      </div>
    </div>
  );
}

interface SkeletonGridProps {
  count?: number;
  className?: string;
}

export function SkeletonGrid({ count = 5, className = "" }: SkeletonGridProps) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 grid-stretch", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, className = "" }: SkeletonTableProps) {
  return (
    <div className={cn("bg-card shadow-card border border-border rounded-card overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                <div className="h-3 bg-muted rounded w-20"></div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                <div className="h-3 bg-muted rounded w-16"></div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                <div className="h-3 bg-muted rounded w-24"></div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                <div className="h-3 bg-muted rounded w-20"></div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider font-body">
                <div className="h-3 bg-muted rounded w-16"></div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {Array.from({ length: rows }).map((_, index) => (
              <tr key={index} className="animate-pulse">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-muted rounded w-32"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-muted rounded w-16"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-muted rounded w-20"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-muted rounded w-24"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-muted rounded w-16"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  className?: string;
}

export function SkeletonList({ count = 3, className = "" }: SkeletonListProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex gap-4 animate-pulse">
          {/* Timeline dot */}
          <div className="w-8 h-8 rounded-full bg-muted border-2 border-border flex-shrink-0"></div>
          
          {/* Content */}
          <div className="flex-1 min-w-0 pb-6">
            <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
