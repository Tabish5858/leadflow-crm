import { getMeetingTypeBySlug } from "@/lib/firebase/server-admin";
import { BookingPageClient } from "@/app/b/[token]/booking-page-client";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SchedulePage({ params }: Props) {
  const { slug } = await params;

  const meetingType = await getMeetingTypeBySlug(slug);
  if (!meetingType) {
    notFound();
  }

  // Pass the bookingToken to the client — all APIs use token internally
  return <BookingPageClient token={meetingType.bookingToken} />;
}
