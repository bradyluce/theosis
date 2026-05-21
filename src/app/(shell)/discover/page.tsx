import { SearchExperience } from "@/features/search/search-experience";

type DiscoverPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const resolved = await searchParams;
  return <SearchExperience initialQuery={resolved.q ?? ""} />;
}
