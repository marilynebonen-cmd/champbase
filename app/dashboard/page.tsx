import { redirect } from "next/navigation";

/**
 * Legacy /dashboard redirects to athlete dashboard.
 */
export default function DashboardPage() {
  redirect("/dashboard/athlete");
}
