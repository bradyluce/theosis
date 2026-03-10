import { SearchExperience } from "@/features/search/search-experience";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;

  return <SearchExperience initialQuery={resolvedSearchParams.q ?? ""} />;
}
