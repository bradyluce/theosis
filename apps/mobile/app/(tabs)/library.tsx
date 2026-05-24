import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { type Href, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { SearchResult, SearchResultKind } from "@theosis/core";

import {
  Card,
  Eyebrow,
  GiltRule,
  Wordmark,
} from "@/components/theosis/primitives";
import {
  colors,
  elevation,
  fonts,
  radii,
  spacing,
  text,
} from "@/constants/theosis-theme";
import { getApi } from "@/lib/api";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from "@/lib/preferences";

// Library — the consolidated discover-and-browse tab. Persistent search at
// the top; when the query is empty the page renders the editorial spreads
// (Featured Father, Featured Work, topic grid, Orthodox basics, browse rows).
// When the user types, the editorial content fades and inline search results
// appear directly under the search field.

const FEATURED_FATHER_IDS = [
  "john-chrysostom",
  "augustine-of-hippo",
  "basil-the-great",
  "gregory-of-nazianzus",
  "gregory-of-nyssa",
  "athanasius-of-alexandria",
  "cyril-of-alexandria",
  "maximus-the-confessor",
  "john-of-damascus",
  "irenaeus-of-lyons",
  "gregory-palamas",
  "ignatius-of-antioch",
];

const FEATURED_WORK_SLUGS = new Set([
  "chrysostom-homilies-on-matthew",
  "chrysostom-homilies-on-john",
  "chrysostom-homilies-on-romans",
  "chrysostom-homilies-on-hebrews",
  "chrysostom-homilies-on-acts",
  "chrysostom-homilies-on-first-corinthians",
  "chrysostom-on-the-priesthood",
  "chrysostom-homilies-on-the-statues",
  "augustine-confessions",
  "augustine-city-of-god",
  "augustine-trinity",
  "augustine-tractates-john",
  "augustine-psalms",
  "climacus-ladder",
  "unseen-warfare",
  "macarius-fifty-spiritual-homilies",
  "cassian-conferences",
  "cassian-institutes",
  "way-of-a-pilgrim",
  "brianchaninov-the-arena",
  "ware-the-orthodox-way",
  "lossky-mystical-theology",
  "schmemann-for-the-life-of-the-world",
  "rose-soul-after-death",
  "porphyrios-wounded-by-love",
  "bloom-beginning-to-pray",
  "paisios-spiritual-awakening",
  "gregory-nazianzen-orations",
  "basil-hexaemeron",
  "gregory-of-nyssa-against-eunomius",
  "cyril-jerusalem-catecheses",
  "athanasius-four-discourses-against-the-arians",
  "cyril-alexandria-commentary-john",
  "cabasilas-divine-liturgy-commentary",
  "ephraim-nisibene-hymns",
  "irenaeus-haereses",
  "origen-against-celsus",
  "tertullian-against-marcion",
  "hilary-on-the-trinity",
  "justin-dialogue-trypho",
  "maximus-ambigua-to-thomas",
  "methodius-banquet-ten-virgins",
  "clement-stromata",
  "hippolytus-refutation-heresies",
  "aphrahat-demonstrations",
  "leo-sermons",
  "eusebius-church-history",
  "symeon-ethical-discourses-vol-1",
  "symeon-ethical-discourses-vol-2",
  "desert-fathers-sayings",
]);

function pickFeaturedFatherId(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return FEATURED_FATHER_IDS[dayOfYear % FEATURED_FATHER_IDS.length];
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

const SEARCH_KIND_ORDER: SearchResultKind[] = [
  "verse",
  "person",
  "commentary",
  "work",
  "topic",
  "daily",
];

const SEARCH_KIND_LABELS: Record<SearchResultKind, string> = {
  verse: "Verses",
  commentary: "Commentary",
  person: "Fathers & Saints",
  work: "Works",
  topic: "Topics",
  daily: "Daily",
};

// Map a search result's web href to a mobile route. Returns null when there
// is no corresponding mobile destination.
function resolveMobileTarget(result: SearchResult): string | null {
  const personMatch = result.href.match(/^\/library\/people\/([^/?#]+)/);
  if (personMatch) return `/people/${personMatch[1]}`;

  const workMatch = result.href.match(/^\/library\/works\/([^/?#]+)/);
  if (workMatch) return `/works/${workMatch[1]}`;

  const bibleMatch = result.href.match(
    /^\/bible\/([^/]+)\/([^/]+)\/(\d+)(?:#[^:]+:[^.]+\.\d+\.(\d+))?/,
  );
  if (bibleMatch) {
    const [, translation, book, chapter, verse] = bibleMatch;
    const highlight = verse ? `&highlight=${verse}` : "";
    return `/explore?translation=${translation}&book=${book}&chapter=${chapter}${highlight}`;
  }

  if (result.href === "/daily") return "/";

  // Topic results from the search engine point at the legacy /library#topic-X
  // anchor. We now have first-class topic landing pages — map there directly.
  const topicMatch = result.href.match(/^\/library#topic-([^/?#]+)/);
  if (topicMatch) return `/topics/${topicMatch[1]}`;

  return null;
}

export default function LibraryScreen() {
  const api = getApi();
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const debouncedQuery = useDebounced(query.trim(), 200);
  const searching = debouncedQuery.length >= 2;

  useEffect(() => {
    let canceled = false;
    getRecentSearches().then((items) => {
      if (!canceled) setRecent(items);
    });
    return () => {
      canceled = true;
    };
  }, []);

  const peopleQuery = useQuery({
    queryKey: ["library-people"],
    queryFn: () => api.fetchLibraryPeople(),
    staleTime: 60 * 60 * 1000,
  });

  const libraryCatalogQuery = useQuery({
    queryKey: ["library-catalog"],
    queryFn: () => api.fetchLibraryCatalog(),
    staleTime: 60 * 60 * 1000,
  });

  const topicsQuery = useQuery({
    queryKey: ["topics-index"],
    queryFn: () => api.fetchTopics(),
    staleTime: 60 * 60 * 1000,
  });

  const guidesQuery = useQuery({
    queryKey: ["guides-index"],
    queryFn: () => api.fetchGuides(),
    staleTime: 60 * 60 * 1000,
  });

  const searchQuery = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => api.search(debouncedQuery),
    enabled: searching,
    staleTime: 30 * 1000,
  });

  const recordRecent = useCallback((q: string) => {
    if (q.trim().length < 2) return;
    addRecentSearch(q).then(setRecent);
  }, []);

  useEffect(() => {
    if (
      debouncedQuery.length >= 2 &&
      searchQuery.data &&
      searchQuery.data.results.length > 0
    ) {
      recordRecent(debouncedQuery);
    }
  }, [debouncedQuery, searchQuery.data, recordRecent]);

  const onClearRecent = () => {
    clearRecentSearches().then(() => setRecent([]));
  };

  const featuredFatherId = useMemo(() => pickFeaturedFatherId(), []);
  const featuredFather = useMemo(() => {
    const people = peopleQuery.data?.people ?? [];
    return (
      people.find((p) => p.id === featuredFatherId) ??
      people.find((p) => p.kind === "father")
    );
  }, [peopleQuery.data, featuredFatherId]);

  const worksWithChapters = useMemo(() => {
    const byWork = libraryCatalogQuery.data?.index?.byWork;
    if (!byWork) return [];
    return (libraryCatalogQuery.data?.works ?? []).filter(
      (w) => byWork[w.id] != null,
    );
  }, [libraryCatalogQuery.data]);

  const featuredWork = useMemo(() => {
    const pool = worksWithChapters.filter((w) =>
      FEATURED_WORK_SLUGS.has(w.slug),
    );
    const source = pool.length > 0 ? pool : worksWithChapters;
    if (source.length === 0) return null;
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor(
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const seed = dayOfYear + now.getFullYear() * 17;
    return source[seed % source.length];
  }, [worksWithChapters]);

  const featuredWorkAuthor = useMemo(() => {
    if (!featuredWork) return undefined;
    const people = peopleQuery.data?.people ?? [];
    return people.find((p) => p.id === featuredWork.personId);
  }, [featuredWork, peopleQuery.data]);

  const groupedSearch = useMemo(() => {
    const map = new Map<SearchResultKind, SearchResult[]>();
    for (const result of searchQuery.data?.results ?? []) {
      const list = map.get(result.kind) ?? [];
      list.push(result);
      map.set(result.kind, list);
    }
    return SEARCH_KIND_ORDER.filter((kind) => map.has(kind)).map((kind) => ({
      kind,
      label: SEARCH_KIND_LABELS[kind],
      results: map.get(kind) ?? [],
    }));
  }, [searchQuery.data]);

  const onResultPress = (result: SearchResult) => {
    const href = resolveMobileTarget(result);
    if (!href) return;
    // resolveMobileTarget returns one of a small set of well-formed in-app
    // paths (people/works/topics/bible reader); cast to Href because TS
    // can't narrow a runtime-built string template.
    router.push(href as Href);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <LinearGradient
        colors={["rgba(212, 168, 87, 0.10)", "transparent", colors.background]}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.masthead}>
        <Wordmark size={18} subline="Library" />
      </View>
      <GiltRule full style={{ marginHorizontal: spacing.xl }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={peopleQuery.isFetching && !peopleQuery.isLoading}
            onRefresh={() => {
              peopleQuery.refetch();
              libraryCatalogQuery.refetch();
              topicsQuery.refetch();
              guidesQuery.refetch();
            }}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Persistent search field — sits below the masthead. The search blade
            stays visible whether the user is browsing the editorial spread or
            actively searching; this is the one input that connects everything. */}
        <View style={styles.searchRow}>
          <Feather name="search" size={16} color={colors.inkSoft} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search Scripture, Fathers, topics"
            placeholderTextColor={colors.inkSoft}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query ? (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Feather name="x" size={16} color={colors.inkSoft} />
            </Pressable>
          ) : null}
        </View>

        {searching ? (
          <SearchResults
            loading={searchQuery.isLoading}
            error={searchQuery.error}
            grouped={groupedSearch}
            empty={
              !!searchQuery.data && searchQuery.data.results.length === 0
            }
            onResultPress={onResultPress}
          />
        ) : (
          <EditorialContent
            featuredFather={featuredFather}
            featuredWork={featuredWork}
            featuredWorkAuthor={featuredWorkAuthor}
            topics={topicsQuery.data?.topics ?? []}
            topicsLoading={topicsQuery.isLoading}
            guides={guidesQuery.data?.guides ?? []}
            guidesLoading={guidesQuery.isLoading}
            recent={recent}
            onPickRecent={(q) => setQuery(q)}
            onClearRecent={onClearRecent}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ----- Search-results block ------------------------------------------------

function SearchResults({
  loading,
  error,
  grouped,
  empty,
  onResultPress,
}: {
  loading: boolean;
  error: unknown;
  grouped: { kind: SearchResultKind; label: string; results: SearchResult[] }[];
  empty: boolean;
  onResultPress: (result: SearchResult) => void;
}) {
  return (
    <View style={styles.resultsWrap}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <Eyebrow tone="oxblood">Search failed</Eyebrow>
          <Text style={[text.body, { color: colors.error, marginTop: spacing.sm }]}>
            {error instanceof Error ? error.message : String(error)}
          </Text>
        </View>
      ) : null}

      {empty && !loading ? (
        <View style={styles.emptyState}>
          <Eyebrow tone="accent">No matches</Eyebrow>
          <Text style={styles.emptyHint}>
            Try a Father&apos;s name (&quot;Chrysostom&quot;), a verse
            (&quot;John 1:1&quot;), or a topic.
          </Text>
        </View>
      ) : null}

      {grouped.map((group) => (
        <View key={group.kind} style={styles.section}>
          <Eyebrow tone="accent">{group.label}</Eyebrow>
          <GiltRule style={{ marginBottom: spacing.sm }} />
          {group.results.map((result) => {
            const tappable = resolveMobileTarget(result) !== null;
            return (
              <Pressable
                key={result.id}
                onPress={tappable ? () => onResultPress(result) : undefined}
                style={({ pressed }) => [
                  styles.resultRow,
                  pressed && tappable && { opacity: 0.7 },
                  !tappable && { opacity: 0.55 },
                ]}
                accessibilityRole={tappable ? "button" : "text"}
                accessibilityLabel={result.title}
              >
                <View style={styles.resultText}>
                  <Text style={styles.resultKicker}>
                    {result.kicker || result.kind}
                  </Text>
                  <Text style={styles.resultTitle}>{result.title}</Text>
                  {result.snippet ? (
                    <Text style={styles.resultSnippet} numberOfLines={2}>
                      {result.snippet}
                    </Text>
                  ) : null}
                </View>
                {tappable ? (
                  <Feather name="chevron-right" size={14} color={colors.inkSoft} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ----- Editorial content (the no-search default) ---------------------------

type FeaturedPerson = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getApi>["fetchLibraryPeople"]>>
>["people"][number];

type FeaturedWork = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getApi>["fetchLibraryCatalog"]>>
>["works"][number];

type TopicTile = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getApi>["fetchTopics"]>>
>["topics"][number];

type GuideTile = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getApi>["fetchGuides"]>>
>["guides"][number];

function EditorialContent({
  featuredFather,
  featuredWork,
  featuredWorkAuthor,
  topics,
  topicsLoading,
  guides,
  guidesLoading,
  recent,
  onPickRecent,
  onClearRecent,
}: {
  featuredFather: FeaturedPerson | undefined;
  featuredWork: FeaturedWork | null;
  featuredWorkAuthor: FeaturedPerson | undefined;
  topics: TopicTile[];
  topicsLoading: boolean;
  guides: GuideTile[];
  guidesLoading: boolean;
  recent: string[];
  onPickRecent: (q: string) => void;
  onClearRecent: () => void;
}) {
  return (
    <>
      {/* Featured Father — editorial spread */}
      {featuredFather ? (
        <Pressable
          onPress={() => router.push(`/people/${featuredFather.slug}`)}
          style={({ pressed }) => [
            styles.featuredFather,
            pressed && { opacity: 0.92 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Featured Father: ${featuredFather.name}`}
        >
          <View style={[styles.fatherPortraitWrap, elevation.giltGlow]}>
            {featuredFather.icon ? (
              <Image
                source={{ uri: featuredFather.icon.src }}
                style={styles.fatherPortrait}
                contentFit="cover"
                transition={240}
                accessibilityLabel={featuredFather.icon.alt}
              />
            ) : (
              <View
                style={[styles.fatherPortrait, styles.fatherPortraitPlaceholder]}
              >
                <Text style={styles.fatherPortraitLetter}>
                  {featuredFather.name.charAt(0)}
                </Text>
              </View>
            )}
            <LinearGradient
              colors={["transparent", "rgba(10, 9, 8, 0.85)"]}
              locations={[0.45, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.fatherPortraitOverlay}>
              <Eyebrow tone="oxblood">
                Featured · {featuredFather.kind}
              </Eyebrow>
              <Text style={styles.fatherName}>
                {featuredFather.honorific
                  ? `${featuredFather.honorific} ${featuredFather.name.split(",")[0]}`
                  : featuredFather.name.split(",")[0]}
              </Text>
              <Text style={styles.fatherEra}>{featuredFather.eraLabel}</Text>
            </View>
          </View>
          {featuredFather.summary ? (
            <Text style={styles.fatherSummary} numberOfLines={3}>
              {featuredFather.summary}
            </Text>
          ) : null}
          <View style={styles.cta}>
            <Text style={styles.ctaLabel}>Read the life</Text>
            <Feather name="arrow-right" size={13} color={colors.accent} />
          </View>
        </Pressable>
      ) : null}

      {/* Featured Work */}
      {featuredWork ? (
        <Pressable
          onPress={() => router.push(`/works/${featuredWork.slug}`)}
          style={({ pressed }) => [pressed && { opacity: 0.92 }]}
          accessibilityRole="button"
          accessibilityLabel={`Featured work: ${featuredWork.title}`}
        >
          <Card intent="raised">
            <View style={styles.workTopRow}>
              <Eyebrow tone="accent">
                Featured Work · {featuredWork.workType}
              </Eyebrow>
              <Feather name="book" size={16} color={colors.accent} />
            </View>
            <Text style={styles.workTitle}>{featuredWork.title}</Text>
            {featuredWorkAuthor ? (
              <Text style={styles.workByline}>
                by{" "}
                {featuredWorkAuthor.honorific
                  ? `${featuredWorkAuthor.honorific} ${featuredWorkAuthor.name.split(",")[0]}`
                  : featuredWorkAuthor.name.split(",")[0]}
                {" — "}
                {featuredWork.eraLabel}
              </Text>
            ) : (
              <Text style={styles.workByline}>
                {featuredWork.eraLabel} · {featuredWork.lengthLabel}
              </Text>
            )}
            {featuredWork.summary ? (
              <Text style={styles.workSummary} numberOfLines={3}>
                {featuredWork.summary}
              </Text>
            ) : null}
            <GiltRule style={{ marginTop: spacing.md }} />
            <View style={[styles.cta, { marginTop: spacing.md }]}>
              <Text style={styles.ctaLabel}>Open the work</Text>
              <Feather name="arrow-right" size={13} color={colors.accent} />
            </View>
          </Card>
        </Pressable>
      ) : null}

      {/* Browse by topic — grid */}
      <View style={styles.section}>
        <SectionAccessoryHeader
          eyebrow="Themes"
          title="Browse by topic"
          accessoryLabel="See all"
          onAccessoryPress={() => router.push("/library/topics")}
        />
        {topicsLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.lg }} />
        ) : (
          <View style={styles.topicGrid}>
            {topics.slice(0, 8).map((tile, idx) => (
              <Pressable
                key={tile.slug}
                onPress={() => router.push(`/topics/${tile.slug}`)}
                style={({ pressed }) => [
                  styles.topicTile,
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open ${tile.label}`}
              >
                <Text style={styles.topicIndex}>
                  {String(idx + 1).padStart(2, "0")}
                </Text>
                <Text style={styles.topicLabel} numberOfLines={2}>
                  {tile.label}
                </Text>
                <Text style={styles.topicKicker} numberOfLines={1}>
                  {tile.subtitle ?? "Topic"}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Orthodox basics — guide list */}
      <View style={styles.section}>
        <SectionAccessoryHeader
          eyebrow="First steps"
          title="Orthodox basics"
          accessoryLabel="All guides"
          onAccessoryPress={() => router.push("/library/guides")}
        />
        {guidesLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.lg }} />
        ) : (
          <View style={styles.guideList}>
            {guides.slice(0, 6).map((guide) => (
              <Pressable
                key={guide.slug}
                onPress={() => router.push(`/guides/${guide.slug}`)}
                style={({ pressed }) => [
                  styles.guideRow,
                  pressed && styles.guideRowPressed,
                ]}
                accessibilityRole="button"
              >
                <View style={styles.guideIconWrap}>
                  <Feather
                    name={guideGlyph(guide.category)}
                    size={18}
                    color={colors.accent}
                  />
                </View>
                <View style={styles.guideText}>
                  <Eyebrow tone="accent">{guideCategoryLabel(guide.category)}</Eyebrow>
                  <Text style={styles.guideTitle} numberOfLines={2}>
                    {guide.title}
                  </Text>
                  <Text style={styles.guideMeta} numberOfLines={1}>
                    ~{guide.readMinutes} min read
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.inkSoft} />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Browse all — gateway rows */}
      <View style={styles.section}>
        <Eyebrow tone="accent">Browse all</Eyebrow>
        <GiltRule style={{ marginBottom: spacing.sm }} />
        <BrowseRow
          glyph="users"
          label="Fathers & Saints"
          sub="Search the library of holy people"
          onPress={() => router.push("/library/people")}
        />
        <BrowseRow
          glyph="book"
          label="Works"
          sub="Long-form patristic and modern Orthodox writings"
          onPress={() => router.push("/library/works")}
        />
        <BrowseRow
          glyph="calendar"
          label="Saints by date"
          sub="Browse the synaxarion month by month"
          onPress={() => router.push("/library/saints-calendar")}
        />
        <BrowseRow
          glyph="layers"
          label="Topics"
          sub="Doctrines, practices, and virtues"
          onPress={() => router.push("/library/topics")}
        />
        <BrowseRow
          glyph="book-open"
          label="Orthodox basics"
          sub="First-steps and practical guides"
          onPress={() => router.push("/library/guides")}
        />
      </View>

      {recent.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.recentHeader}>
            <Eyebrow tone="accent">Recent searches</Eyebrow>
            <Pressable
              onPress={onClearRecent}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.clearLink}>Clear</Text>
            </Pressable>
          </View>
          <View style={styles.recentChipRow}>
            {recent.map((item) => (
              <Pressable
                key={item}
                onPress={() => onPickRecent(item)}
                style={({ pressed }) => [
                  styles.recentChip,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
              >
                <Feather name="clock" size={11} color={colors.inkSoft} />
                <Text style={styles.recentChipLabel}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </>
  );
}

function SectionAccessoryHeader({
  eyebrow,
  title,
  accessoryLabel,
  onAccessoryPress,
}: {
  eyebrow: string;
  title: string;
  accessoryLabel: string;
  onAccessoryPress: () => void;
}) {
  return (
    <View style={styles.sectionAccessoryHeader}>
      <View style={{ flex: 1 }}>
        <Eyebrow tone="accent">{eyebrow}</Eyebrow>
        <Text style={styles.sectionTitle}>{title}</Text>
        <GiltRule style={{ marginTop: spacing.sm }} />
      </View>
      <Pressable
        onPress={onAccessoryPress}
        hitSlop={6}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.accessoryButton,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={styles.accessoryLabel}>{accessoryLabel}</Text>
        <Feather name="arrow-up-right" size={11} color={colors.accent} />
      </Pressable>
    </View>
  );
}

function BrowseRow({
  glyph,
  label,
  sub,
  onPress,
}: {
  glyph: React.ComponentProps<typeof Feather>["name"];
  label: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.browseRow,
        pressed && styles.browseRowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.browseIconWrap}>
        <Feather name={glyph} size={18} color={colors.accent} />
      </View>
      <View style={styles.browseText}>
        <Text style={styles.browseLabel}>{label}</Text>
        <Text style={styles.browseSub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.inkSoft} />
    </Pressable>
  );
}

function guideGlyph(
  category: GuideTile["category"],
): React.ComponentProps<typeof Feather>["name"] {
  switch (category) {
    case "first-steps":
      return "map";
    case "worship":
      return "book-open";
    case "sacrament":
      return "feather";
    case "practice":
      return "compass";
    case "season":
      return "sun";
    case "life":
      return "heart";
    default:
      return "book";
  }
}

function guideCategoryLabel(category: GuideTile["category"]): string {
  switch (category) {
    case "first-steps":
      return "First steps";
    case "worship":
      return "Worship";
    case "sacrament":
      return "Mystery";
    case "practice":
      return "Practice";
    case "season":
      return "Season";
    case "life":
      return "Life";
    default:
      return "Guide";
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  masthead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing["6xl"] + spacing.lg,
    gap: spacing["2xl"],
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 15,
    fontFamily: fonts.sans,
  },

  loading: { paddingVertical: spacing["3xl"], alignItems: "center" },
  errorCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyState: {
    paddingVertical: spacing["2xl"],
    gap: spacing.sm,
  },
  emptyHint: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkMuted,
  },

  resultsWrap: { gap: spacing["2xl"] },

  section: { gap: spacing.xs },
  sectionAccessoryHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 30,
    marginTop: 2,
  },
  accessoryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingBottom: spacing.sm,
  },
  accessoryLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },

  // Featured Father
  featuredFather: { gap: spacing.md },
  fatherPortraitWrap: {
    height: 320,
    borderRadius: radii.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.lineGilt,
  },
  fatherPortrait: { width: "100%", height: "100%" },
  fatherPortraitPlaceholder: {
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  fatherPortraitLetter: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 96,
    color: colors.accent,
  },
  fatherPortraitOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  fatherName: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  fatherEra: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkMuted,
  },
  fatherSummary: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 24,
    color: colors.inkMuted,
    paddingHorizontal: spacing.xs,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  ctaLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // Featured Work
  workTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  workTitle: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  workByline: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  workSummary: {
    fontFamily: fonts.serif,
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },

  // Topic tiles
  topicGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  topicTile: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 124,
    borderRadius: radii.large,
    borderWidth: 1,
    borderColor: colors.lineGilt,
    backgroundColor: "rgba(212, 168, 87, 0.04)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: "space-between",
  },
  topicIndex: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 22,
    color: colors.accent,
    letterSpacing: -0.5,
    opacity: 0.7,
  },
  topicLabel: {
    fontFamily: fonts.serifBoldItalic,
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  topicKicker: {
    fontFamily: fonts.sans,
    fontSize: 9,
    color: colors.accent,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    fontWeight: "700",
    marginTop: 4,
  },

  // Guide rows
  guideList: { gap: spacing.sm, marginTop: spacing.sm },
  guideRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  guideRowPressed: {
    backgroundColor: "rgba(212, 168, 87, 0.05)",
    borderRadius: radii.card,
  },
  guideIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.card,
    backgroundColor: "rgba(212, 168, 87, 0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  guideText: { flex: 1, gap: 4 },
  guideTitle: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  guideMeta: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.inkSoft,
  },

  // Browse rows
  browseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  browseRowPressed: {
    backgroundColor: "rgba(212, 168, 87, 0.05)",
    borderRadius: radii.card,
  },
  browseIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.card,
    backgroundColor: "rgba(212, 168, 87, 0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineGilt,
    alignItems: "center",
    justifyContent: "center",
  },
  browseText: { flex: 1, gap: 2 },
  browseLabel: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  browseSub: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.inkSoft,
  },

  // Recent
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recentChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  recentChipLabel: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkMuted,
  },
  clearLink: {
    fontSize: 12,
    color: colors.inkSoft,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "500",
  },

  // Search result rows
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  resultText: { flex: 1, gap: 4 },
  resultKicker: {
    fontFamily: fonts.sans,
    fontSize: 9.5,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  resultTitle: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  resultSnippet: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkSoft,
  },
});
