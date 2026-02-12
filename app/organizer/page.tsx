"use client";

import { OrganizerRoute } from "@/components/OrganizerRoute";
import { Layout } from "@/components/ui/Layout";
import { OrganizerDashboardView } from "@/components/dashboard/OrganizerDashboardView";

export default function OrganizerPage() {
  return (
    <OrganizerRoute>
      <Layout>
        <OrganizerDashboardView />
      </Layout>
    </OrganizerRoute>
  );
}
