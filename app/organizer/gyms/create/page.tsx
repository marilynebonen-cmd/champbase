import { redirect } from "next/navigation";

export default function CreateGymRedirect() {
  redirect("/organizer/gyms/new");
}
