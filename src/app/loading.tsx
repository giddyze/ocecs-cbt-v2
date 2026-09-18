import LoadingScreen from "@/components/LoadingScreen";

// Next.js automatically shows this during route transitions / server
// component data fetches — gives every navigation a branded loading state
// instead of a blank white flash.
export default function Loading() {
  return <LoadingScreen />;
}
