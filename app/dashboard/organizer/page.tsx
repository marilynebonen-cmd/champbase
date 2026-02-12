"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/ui/Layout";
import { OrganizerDashboardView } from "@/components/dashboard/OrganizerDashboardView";
import { DashboardSwitchLink } from "@/components/dashboard/DashboardSwitchLink";

export default function DashboardOrganizerPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <DashboardSwitchLink href="/dashboard/athlete" label="Athlète" />
        <OrganizerDashboardView />
      </Layout>
    </ProtectedRoute>
  );
}
