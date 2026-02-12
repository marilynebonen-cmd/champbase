import { redirect } from "next/navigation";

export default function CreateWorkoutRedirect() {
  redirect("/organizer/workouts/new");
}
