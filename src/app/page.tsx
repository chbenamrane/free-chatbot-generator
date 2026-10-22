import { redirect } from "next/navigation";
import { ADMIN_PATH } from "@/lib/auth/constants";

export default function Home() {
  redirect(ADMIN_PATH);
}
