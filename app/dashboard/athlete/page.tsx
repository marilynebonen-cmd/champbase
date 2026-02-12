"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/ui/Layout";
import { AthleteDashboardView } from "@/components/dashboard/AthleteDashboardView";

export default function DashboardAthletePage() {
  return (
    <ProtectedRoute>
      <Layout>
        <AthleteDashboardView />
      </Layout>
    </ProtectedRoute>
  );
}
