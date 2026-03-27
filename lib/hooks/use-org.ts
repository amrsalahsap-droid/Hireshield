"use client";

import { useState, useEffect } from "react";

interface OrgData {
  orgId: string;
  email: string;
  name: string;
  clerkUserId: string;
}

export function useOrg() {
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/me");
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Unauthorized - Please sign in");
          }
          throw new Error("Failed to fetch organization data");
        }
        
        const data = await response.json();
        setOrgData(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching org data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchOrg();
  }, []);

  return {
    orgId: orgData?.orgId || null,
    email: orgData?.email || null,
    name: orgData?.name || null,
    clerkUserId: orgData?.clerkUserId || null,
    loading,
    error,
  };
}
