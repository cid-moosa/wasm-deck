import {
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Clock3,
  ExternalLink,
  Gamepad2,
  Heart,
  Info,
  LayoutGrid,
  List,
  MonitorPlay,
  Moon,
  Play,
  Search,
  SlidersHorizontal,
  Star,
  Sun,
  Users,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import BrandMark from "@/components/BrandMark";
import Dialog from "@/components/Dialog";
import GameCard from "@/components/GameCard";
import HeroDeck from "@/components/HeroDeck";
import ScrollProgress from "@/components/ScrollProgress";
import SettingsDialog from "@/components/SettingsDialog";
import AsciiBackground from "@/components/AsciiBackground";
import { useTheme } from "@/contexts/ThemeContext";
import { CATEGORIES, categoryLabel, readLocal, safeGameUrl, type GameRecord } from "@/data/catalog";

type Collection = "all" | "popular" | "favorites" | "recent";
type ViewMode = "grid" | "list";
const PAGE_SIZE = 24;
const SUBMIT_URL = "https://github.com/cid-moosa/wasm-deck/issues/new?template=game_proposal.md";
const SOURCE_URL = "https://github.com/cid-moosa/wasm-deck";

function collectionName(collection: Collection, category: string): string {
  if (category !== "all") return categoryLabel(category);
  if (collection === "popular") return "Popular picks";
  if (collection === "favorites") return "Your saved games";
  if (collection === "recent") return "Recently opened";
  return "All catalog entries";
}

function storedSet(key: string): Set<string> {
  const entries = readLocal<unknown>(key, []);
  return new Set(Array.isArray(entries) ? entries.filter((item): item is string => typeof item === "string") : []);
}

function storedRecent(): string[] {
  const entries = readLocal<unknown>("wasmdeck:recent", []);
  return Array.isArray(entries) ? entries.filter((item): item is string => typeof item === "string") : [];
}

function DialogLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="button button--lime" href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <ArrowUpRight size={16} aria-hidden="true" />
    </a>
  );
}

function HomeContent() {
  const { theme, toggleTheme } = useTheme();
  const [games, setGames] = useState<GameRecord[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "error">("loading");
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<Collection>("all");
  const [category, setCategory] = useState("all");
  const [deckOnly, setDeckOnly] = useState(false);
  const [multiplayerOnly, setMultiplayerOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState("featured");
  const [favorites, setFavorites] = useState<Set<string>>(() => storedSet("wasmdeck:favorites"));
  const [recent, setRecent] = useState<string[]>(storedRecent);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeGame, setActiveGame] = useState<GameRecord | null>(null);
  const [launcherArtFailed, setLauncherArtFailed] = useState(false);
  const [fps, setFps] = useState(120);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const measure = (now: number) => {
      frameCount++;
      const elapsed = now - lastTime;
      if (elapsed >= 800) {
        const currentFps = Math.round((frameCount * 1000) / elapsed);
        setFps(Math.min(240, Math.max(10, currentFps)));
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(measure);
    };

    animId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogStatus("loading");
    const catalogUrl = `${import.meta.env.BASE_URL || "./"}catalog.json`;
    fetch(catalogUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
        return response.json() as Promise<GameRecord[]>;
      })
      .then((records) => {
        if (!Array.isArray(records)) throw new Error("Catalog data is not an array");
        setGames(records);
        setCatalogStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setCatalogStatus("error");
      });
    return () => controller.abort();
  }, [catalogRetry]);

  useEffect(() => {
    setLauncherArtFailed(false);
  }, [activeGame?.id, activeGame?.thumbnailUrl]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    games.forEach((game) => counts.set(game.category, (counts.get(game.category) ?? 0) + 1));
    return counts;
  }, [games]);

  const filteredGames = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const result = games.filter((game) => {
      if (collection === "popular" && !game.popular) return false;
      if (collection === "favorites" && !favorites.has(game.id)) return false;
      if (collection === "recent" && !recent.includes(game.id)) return false;
      if (category !== "all" && game.category !== category) return false;
      if (deckOnly && !game.iframeCompatible) return false;
      if (multiplayerOnly && !game.multiplayer) return false;
      if (!normalizedQuery) return true;
      const searchable = [game.title, game.category, game.engine, game.memoryEst, game.notes, game.id]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      return searchable.includes(normalizedQuery);
    });

    if (collection === "recent") {
      result.sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id));
    } else if (sortBy === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "engine") {
      result.sort((a, b) => (a.engine ?? "").localeCompare(b.engine ?? ""));
    }
    return result;
  }, [games, query, collection, category, deckOnly, multiplayerOnly, favorites, recent, sortBy]);

  useEffect(() => {
    try {
      window.localStorage.setItem("wasmdeck:favorites", JSON.stringify([...favorites]));
    } catch {
      // Storage may be unavailable in private browsing; the in-memory state still works.
    }
  }, [favorites]);

  useEffect(() => {
    try {
      window.localStorage.setItem("wasmdeck:recent", JSON.stringify(recent));
    } catch {
      // Ignore storage failures without blocking discovery.
    }
  }, [recent]);


  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, collection, category, deckOnly, multiplayerOnly, sortBy, viewMode]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === searchRef.current && query) {
        setQuery("");
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [query]);

  const recordRecent = (game: GameRecord) => {
    setRecent((previous) => [game.id, ...previous.filter((id) => id !== game.id)].slice(0, 20));
  };

  const toggleFavorite = (id: string) => {
    setFavorites((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const launchGame = (game: GameRecord) => {
    recordRecent(game);
    setActiveGame(game);
  };

  const launchRandom = () => {
    if (filteredGames.length === 0) return;
    const game = filteredGames[Math.floor(Math.random() * filteredGames.length)];
    launchGame(game);
  };

  const chooseCollection = (value: Collection) => {
    setCollection(value);
    setCategory("all");
  };

  const chooseCategory = (value: string) => {
    setCollection("all");
    setCategory(value);
  };

  const focusSearch = () => {
    searchRef.current?.focus();
    searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const clearFilters = () => {
    setQuery("");
    setCollection("all");
    setCategory("all");
    setDeckOnly(false);
    setMultiplayerOnly(false);
    setSortBy("featured");
  };

  const activeFilterCount =
    Number(Boolean(query.trim())) +
    Number(category !== "all") +
    Number(collection !== "all") +
    Number(deckOnly) +
    Number(multiplayerOnly);
  const shownGames = filteredGames;
  const inDeckCount = games.filter((game) => game.iframeCompatible).length;
  const multiplayerCount = games.filter((game) => game.multiplayer).length;
  const catalogCount = catalogStatus === "ready" ? games.length : null;
  const activePrimaryUrl = activeGame ? safeGameUrl(activeGame.primaryUrl) : null;
  const activeMirrors = activeGame
    ? (activeGame.mirrors ?? [])
        .map((mirror) => ({ label: mirror.label, url: safeGameUrl(mirror.url) }))
        .filter((mirror): mirror is { label: string; url: string } => Boolean(mirror.url))
    : [];

  return (
    <div className="site-shell" data-theme={theme}>
      <ScrollProgress />
      <a className="skip-link" href="#archive">
        Skip to the catalog
      </a>
      {/* Floating Cyber HUD Dock */}
      <header className="topbar-wrap">
        <div className="hud-dock" role="navigation" aria-label="Deck HUD navigation">
          <a className="brand-home" href="#top" aria-label="WASM//DECK home">
            <BrandMark compact />
            <div className="brand-meta">
              <span className="brand-wordmark">
                WASM<b>//</b>DECK
              </span>
              <button
                type="button"
                className="brand-badge brand-badge--interactive"
                title="Secret Easter Egg: Feed the Koi fish! (or press 'F')"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  window.dispatchEvent(
                    new CustomEvent("wasmdeck:feed-koi", {
                      detail: { x: rect.left + rect.width / 2, y: rect.bottom + 45, count: 6 },
                    })
                  );
                }}
              >
                <span className="status-dot animate-pulse" /> 563 PORTS
              </button>
            </div>
          </a>

          <div className="dock-divider" />

          <div className="dock-fps-pill" title="Hardware Refresh Telemetry">
            <span className="fps-indicator-dot animate-pulse" />
            <span className="fps-val">{fps}</span>
            <span className="fps-unit">FPS</span>
          </div>

          <div className="dock-divider" />

          <nav className="top-nav" aria-label="Main navigation">
            <a href="#archive" className="dock-nav-link">
              <span>Archive</span>
            </a>
            <button type="button" onClick={() => setAboutOpen(true)} className="dock-nav-link">
              <span>About</span>
            </button>
          </nav>

          <div className="dock-divider" />

          <div className="top-actions">
            <button className="dock-search-btn" type="button" onClick={focusSearch} aria-label="Search catalog">
              <Search size={14} aria-hidden="true" />
              <span>Search</span>
              <kbd>⌘ K</kbd>
            </button>

            <button
              type="button"
              className="dock-settings-btn settings-trigger"
              data-testid="open-settings-button"
              aria-label="Open theme and display settings"
              onClick={() => setSettingsOpen(true)}
            >
              <SlidersHorizontal size={14} aria-hidden="true" />
              <span>Settings</span>
            </button>

            <button
              className="dock-submit-btn submit-header"
              type="button"
              onClick={() => setSubmitOpen(true)}
            >
              <span>Submit</span>
              <ArrowUpRight size={13} aria-hidden="true" />
            </button>

            <button
              className="dock-theme-btn theme-toggle"
              type="button"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <HeroDeck
          featuredGames={games.slice(0, 3)}
          catalogCount={catalogCount}
          categoryCount={CATEGORIES.length}
          multiplayerCount={catalogStatus === "ready" ? multiplayerCount : null}
          randomDisabled={catalogStatus !== "ready" || filteredGames.length === 0}
          onRandom={launchRandom}
        />

        <div className="signal-marquee" aria-hidden="true">
          <div className="signal-marquee-track">
            <span>FOLLOW THE SOURCE</span>
            <i>✳</i>
            <span>OPEN-WEB PORTS</span>
            <i>✳</i>
            <span>PLAYABLE HISTORY</span>
            <i>✳</i>
            <span>EMULATORS & PRESERVATION</span>
            <i>✳</i>
            <span>FOLLOW THE SOURCE</span>
            <i>✳</i>
            <span>OPEN-WEB PORTS</span>
            <i>✳</i>
            <span>PLAYABLE HISTORY</span>
            <i>✳</i>
            <span>EMULATORS & PRESERVATION</span>
            <i>✳</i>
          </div>
        </div>

        <section className="archive-workspace" id="archive" aria-label="Browse the game catalog">
          <aside className="catalog-sidebar">
            <div className="sidebar-group">
              <h2>Discover</h2>
              <button
                className={`sidebar-link${collection === "all" && category === "all" ? " is-selected" : ""}`}
                type="button"
                onClick={() => {
                  chooseCollection("all");
                  setDeckOnly(false);
                  setMultiplayerOnly(false);
                }}
              >
                <Blocks size={16} aria-hidden="true" />
                <span>All entries</span>
                <b>{catalogStatus === "ready" ? games.length : "—"}</b>
              </button>
              <button
                className={`sidebar-link${collection === "popular" ? " is-selected" : ""}`}
                type="button"
                onClick={() => chooseCollection("popular")}
              >
                <Star size={16} aria-hidden="true" />
                <span>Popular picks</span>
                <b>{catalogStatus === "ready" ? games.filter((game) => game.popular).length : "—"}</b>
              </button>
            </div>
            <div className="sidebar-group">
              <h2>Collections</h2>
              {CATEGORIES.map((item) => (
                <button
                  className={`sidebar-link${category === item.id ? " is-selected" : ""}`}
                  type="button"
                  key={item.id}
                  onClick={() => chooseCategory(item.id)}
                >
                  <span className="category-marker" aria-hidden="true" />
                  <span>{item.label}</span>
                  <b>{catalogStatus === "ready" ? categoryCounts.get(item.id) ?? 0 : "—"}</b>
                </button>
              ))}
            </div>
            <div className="sidebar-group">
              <h2>Your shelf</h2>
              <button
                className={`sidebar-link${collection === "favorites" ? " is-selected" : ""}`}
                type="button"
                onClick={() => chooseCollection("favorites")}
              >
                <Heart size={16} aria-hidden="true" />
                <span>Favorites</span>
                <b>{favorites.size}</b>
              </button>
              <button
                className={`sidebar-link${collection === "recent" ? " is-selected" : ""}`}
                type="button"
                onClick={() => chooseCollection("recent")}
              >
                <Clock3 size={16} aria-hidden="true" />
                <span>Recently opened</span>
                <b>{recent.length}</b>
              </button>
            </div>
            <div className="sidebar-note">
              <span className="note-icon">
                <Info size={15} aria-hidden="true" />
              </span>
              <p>Catalog links are not live-checked. Follow the source and use your own judgment.</p>
              <button type="button" onClick={() => setAboutOpen(true)}>
                How this works <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
          </aside>

          <div className="catalog-main">
            <div className="catalog-heading">
              <div>
                <span className="eyebrow eyebrow--muted">
                  THE INDEX <span className="eyebrow-rule" />
                </span>
                <h2>{collectionName(collection, category)}</h2>
                <p>Browse the source catalog, inspect port metadata, and launch directly or in-deck.</p>
              </div>
              <button
                className="button button--outline submit-inline"
                type="button"
                onClick={() => setSubmitOpen(true)}
              >
                <span>Propose a port</span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            </div>

            <div className="catalog-controls">
              <label className="search-box">
                <Search size={17} aria-hidden="true" />
                <span className="sr-only">Search games, engines, and notes</span>
                <input
                  ref={searchRef}
                  type="search"
                  placeholder="Search titles, engines, notes…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query ? (
                  <button
                    className="clear-search"
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                ) : (
                  <kbd>⌘ K</kbd>
                )}
              </label>
              <div className="filter-buttons" aria-label="Catalog filters">
                <button
                  className={`filter-pill${deckOnly ? " is-active" : ""}`}
                  type="button"
                  aria-pressed={deckOnly}
                  onClick={() => setDeckOnly((value) => !value)}
                >
                  <MonitorPlay size={14} aria-hidden="true" /> In-deck compatible{" "}
                  <span>{catalogStatus === "ready" ? inDeckCount : "—"}</span>
                </button>
                <button
                  className={`filter-pill${multiplayerOnly ? " is-active" : ""}`}
                  type="button"
                  aria-pressed={multiplayerOnly}
                  onClick={() => setMultiplayerOnly((value) => !value)}
                >
                  <Users size={14} aria-hidden="true" /> Multiplayer{" "}
                  <span>{catalogStatus === "ready" ? multiplayerCount : "—"}</span>
                </button>
              </div>
            </div>

            <div className="results-toolbar">
              <p aria-live="polite">
                <strong>{catalogStatus === "ready" ? filteredGames.length : "—"}</strong>{" "}
                {filteredGames.length === 1 ? "entry" : "entries"}
                {activeFilterCount > 0 && (
                  <span>
                    {" "}
                    · {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active
                  </span>
                )}
              </p>
              <div className="results-actions">
                {activeFilterCount > 0 && (
                  <button className="text-button" type="button" onClick={clearFilters}>
                    Clear filters
                  </button>
                )}
                <label className="sort-control">
                  <span className="sr-only">Sort catalog</span>
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    <option value="featured">Featured</option>
                    <option value="title">Title A–Z</option>
                    <option value="engine">Engine</option>
                  </select>
                </label>
                <div className="view-switch" role="group" aria-label="Catalog display">
                  <button
                    className={viewMode === "grid" ? "is-active" : ""}
                    type="button"
                    aria-label="Grid view"
                    aria-pressed={viewMode === "grid"}
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid size={16} aria-hidden="true" />
                  </button>
                  <button
                    className={viewMode === "list" ? "is-active" : ""}
                    type="button"
                    aria-label="List view"
                    aria-pressed={viewMode === "list"}
                    onClick={() => setViewMode("list")}
                  >
                    <List size={17} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            {catalogStatus === "loading" ? (
              <div className="loading-state" role="status" aria-live="polite">
                <span className="loading-spinner" />
                Loading the catalog…
              </div>
            ) : catalogStatus === "error" ? (
              <div className="empty-state">
                <span className="empty-icon">
                  <Search size={22} aria-hidden="true" />
                </span>
                <h3>The catalog didn&apos;t load.</h3>
                <p>Check your connection, then try again. Your saved favorites stay on this device.</p>
                <button
                  className="button button--quiet"
                  type="button"
                  onClick={() => setCatalogRetry((value) => value + 1)}
                >
                  Retry catalog
                </button>
              </div>
            ) : shownGames.length > 0 ? (
              <>
                <div className={`game-grid${viewMode === "list" ? " game-grid--list" : ""}`}>
                  {shownGames.map((game, index) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      isFavorite={favorites.has(game.id)}
                      viewMode={viewMode}
                      animationIndex={index}
                      onToggleFavorite={toggleFavorite}
                      onOpenSource={recordRecent}
                      onPlayInDeck={launchGame}
                    />
                  ))}
                </div>
                <div className="catalog-status-bar">
                  <div className="catalog-status-info">
                    <span className="status-dot animate-pulse" />
                    <span>Showing all {shownGames.length} verified games in this window</span>
                  </div>
                  <a className="back-to-top" href="#top">
                    Back to top <ArrowRight size={13} className="-rotate-90" aria-hidden="true" />
                  </a>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">
                  <Search size={22} aria-hidden="true" />
                </span>
                <h3>
                  {collection === "favorites"
                    ? "Your shelf is waiting."
                    : collection === "recent"
                      ? "Nothing opened yet."
                      : "No entries match those filters."}
                </h3>
                <p>
                  {collection === "favorites"
                    ? "Tap the star on any catalog card to save it here."
                    : collection === "recent"
                      ? "Open a source link and it will show up here for next time."
                      : "Try another title, or clear a filter to widen the search."}
                </p>
                <button className="button button--quiet" type="button" onClick={clearFilters}>
                  Show all entries
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a className="footer-brand" href="#top">
          <BrandMark />
          <span>WASM//DECK</span>
        </a>
        <p>Source links from the public catalog. Availability is not checked in real time.</p>
        <div className="footer-links">
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
            Catalog source <ExternalLink size={13} aria-hidden="true" />
          </a>
          <button type="button" onClick={() => setAboutOpen(true)}>
            About this index
          </button>
        </div>
      </footer>

      <Dialog
        open={aboutOpen}
        title="An index, not a game host."
        description="Overview of how the WASM//DECK catalog indexes browser ports and emulators."
        onClose={() => setAboutOpen(false)}
      >
        <div className="modal-copy">
          <p>
            WASM//DECK is a browser-first index of WebAssembly game ports, emulation projects, and
            related archives. Game files and player runtimes are hosted by the linked projects—not
            by this catalog.
          </p>
          <div className="about-callout">
            <MonitorPlay size={18} aria-hidden="true" />
            <p>
              “In-deck compatible” reflects a flag in the catalog source. Other records open their
              listed external destination. Neither label is a live availability check.
            </p>
          </div>
          <h3>What the catalog shows</h3>
          <p>
            Each card includes the source title, category, runtime or engine when supplied, and a
            listed memory or file-size estimate when available. Favorites and recently opened links
            stay in this browser.
          </p>
          <div className="modal-actions">
            <DialogLink href={SOURCE_URL}>View the source catalog</DialogLink>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={submitOpen}
        title="Suggest a game or port"
        description="Instructions for proposing a new WebAssembly port or browser game link."
        onClose={() => setSubmitOpen(false)}
      >
        <div className="modal-copy">
          <p>
            Send a suggestion to the WASM//DECK catalog maintainers so it can be reviewed with its
            source, runtime, and launch details. This index does not submit suggestions to a private
            backend.
          </p>
          <div className="submission-steps">
            <span>01</span>
            <p>Include the project or game name.</p>
            <span>02</span>
            <p>Share the source URL and runtime details.</p>
            <span>03</span>
            <p>Note whether it runs in a browser and what remains untested.</p>
          </div>
          <div className="modal-actions">
            <DialogLink href={SUBMIT_URL}>Open the GitHub proposal form</DialogLink>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(activeGame)}
        title={activeGame?.title ?? "Game Launcher"}
        description={
          activeGame
            ? `${categoryLabel(activeGame.category)} — ${activeGame.engine || "Browser port"}`
            : undefined
        }
        onClose={() => setActiveGame(null)}
        size="wide"
      >
        {activeGame && (
          <div className="player-shell" data-testid="launcher-dialog">
            <div className="player-cover-transition">
              {activeGame.thumbnailUrl && !launcherArtFailed ? (
                <img
                  src={activeGame.thumbnailUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setLauncherArtFailed(true)}
                />
              ) : (
                <div className={`cover-fallback cover-fallback--${activeGame.category}`} aria-hidden="true">
                  <Gamepad2 size={24} strokeWidth={1.5} />
                </div>
              )}
              <div className="player-cover-overlay">
                <span className="player-cover-category">{categoryLabel(activeGame.category)}</span>
                <strong>{activeGame.title}</strong>
              </div>
            </div>

            {activePrimaryUrl && (
              <>
                <div className="player-caption">
                  <span>
                    <span className="status-dot animate-pulse" /> Running inside sandbox iframe
                  </span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      const iframe = document.querySelector(".player-shell iframe") as HTMLIFrameElement | null;
                      if (iframe?.requestFullscreen) {
                        iframe.requestFullscreen();
                      }
                    }}
                  >
                    Fullscreen mode
                  </button>
                </div>
                <iframe
                  title={`${activeGame.title} source`}
                  src={activePrimaryUrl}
                  loading="eager"
                  referrerPolicy="no-referrer"
                  allow="autoplay; fullscreen; gamepad; picture-in-picture"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups"
                />
              </>
            )}

            <div className="launcher-specs">
              <div className="launcher-spec-item">
                <span>Runtime / Engine</span>
                <strong>{activeGame.engine || "Runtime not supplied"}</strong>
              </div>
              <div className="launcher-spec-item">
                <span>Delivery</span>
                <strong>{activeGame.delivery || "Browser port"}</strong>
              </div>
              <div className="launcher-spec-item">
                <span>Memory / Size</span>
                <strong>{activeGame.memoryEst || "Not specified"}</strong>
              </div>
              <div className="launcher-spec-item">
                <span>Mode</span>
                <strong>{activeGame.multiplayer ? "Multiplayer listed" : "Single-player / Standard"}</strong>
              </div>
            </div>

            {activeGame.notes && <p className="launcher-notes">{activeGame.notes}</p>}

            <div className="launcher-actions">
              {activePrimaryUrl && (
                <button
                  type="button"
                  className="button button--lime"
                  onClick={() => {
                    const iframe = document.querySelector(".player-shell iframe") as HTMLIFrameElement | null;
                    if (iframe?.requestFullscreen) {
                      iframe.requestFullscreen();
                    }
                  }}
                  data-testid="launcher-primary-link"
                >
                  <Play size={15} aria-hidden="true" />
                  Play Fullscreen
                </button>
              )}
              {activeMirrors.map((mirror) => (
                <a
                  key={mirror.url}
                  className="button button--outline"
                  href={mirror.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mirror ({mirror.label}) <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              ))}
              <button
                type="button"
                className="button button--outline"
                onClick={() => toggleFavorite(activeGame.id)}
              >
                <Star
                  size={15}
                  fill={favorites.has(activeGame.id) ? "currentColor" : "none"}
                  aria-hidden="true"
                />
                {favorites.has(activeGame.id) ? "Saved to favorites" : "Add to favorites"}
              </button>
            </div>

            {activeMirrors.length > 0 && (
              <div className="launcher-mirrors" aria-label="Available mirrors">
                <span className="launcher-mirrors-label">Verified catalog mirrors ({activeMirrors.length})</span>
                <div className="launcher-mirrors-list">
                  {activeMirrors.map((mirror) => (
                    <a
                      key={mirror.url}
                      className="launcher-mirror-link"
                      href={mirror.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>{mirror.label}</span>
                      <ExternalLink size={13} aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <p className="player-note">
              {activeGame.iframeCompatible
                ? "This source is embedded because the catalog marks it in-deck compatible. If it refuses framing, use the external launch button above."
                : "This entry runs in an external browser runtime or archive tab. Launch the primary source or choose a mirror above."}
            </p>
          </div>
        )}
      </Dialog>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

export default function Home() {
  return (
    <>
      <AsciiBackground />
      <HomeContent />
    </>
  );
}
