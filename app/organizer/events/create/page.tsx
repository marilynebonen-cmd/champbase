import { redirect } from "next/navigation";

export default function CreateEventRedirect() {
  redirect("/organizer/events/new");
}
