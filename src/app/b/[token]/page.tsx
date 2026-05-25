import { BookingPageClient } from "./booking-page-client";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function BookingPage({ params }: Props) {
  const { token } = await params;
  return <BookingPageClient token={token} />;
}
