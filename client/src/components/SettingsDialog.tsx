import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Activity,
  Check,
  Fish,
  Moon,
  Palette,
  RotateCcw,
  Sparkles,
  Sun,
  Terminal,
  Waves,
  X,
} from "lucide-react";
import {
  ACCENT_PRESETS,
  ASCII_ANIMATION_PRESETS,
  BG_MOOD_PRESETS,
  useTheme,
  type AnimationMode,
  type AsciiAnimationId,
  type FishDensity,
} from "@/contexts/ThemeContext";

export interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const {
    theme,
    setTheme,
    accent,
    setAccentId,
    bgMood,
    setBgMoodId,
    asciiAnimation,
    setAsciiAnimation,
    animationMode,
    setAnimationMode,
    fishDensity,
    setFishDensity,
    resetThemeSettings,
  } = useTheme();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          data-testid="settings-dialog-content"
          className="fixed top-[50%] left-[50%] z-50 w-full max-w-xl translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-[var(--border-strong)] bg-[var(--panel)] p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-h-[90vh] overflow-y-auto"
          style={{
            boxShadow: `0 24px 64px rgba(0, 0, 0, 0.48), 0 0 32px ${accent.glow}`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-strong)]"
                style={{ backgroundColor: accent.glow }}
              >
                <Palette size={18} style={{ color: accent.hex }} />
              </div>
              <div>
                <DialogPrimitive.Title className="text-base font-bold tracking-tight text-[var(--text)]">
                  Theme & Display Settings
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-[var(--faint)]">
                  Personalize accent colors, atmosphere, and ASCII koi animation
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close
              className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--panel-raised)] hover:text-[var(--text)] transition-colors"
              aria-label="Close settings"
            >
              <X size={18} />
            </DialogPrimitive.Close>
          </div>

          <div className="mt-5 space-y-6">
            {/* Section 1: Accent Colors */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-ink)]">
                  Theme Accent Color
                </span>
                <span className="text-xs font-mono text-[var(--faint)]">{accent.name}</span>
              </div>
              <p className="text-xs text-[var(--muted)] mb-3">
                Signature color applied to buttons, badges, highlights, and ASCII koi markings.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {ACCENT_PRESETS.map((item) => {
                  const isSelected = item.id === accent.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAccentId(item.id)}
                      data-testid={`accent-btn-${item.id}`}
                      className={`relative flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                        isSelected
                          ? "border-[var(--lime)] bg-[var(--panel-raised)] shadow-md"
                          : "border-[var(--border)] bg-[var(--panel-soft)] hover:border-[var(--border-strong)] hover:bg-[var(--panel-raised)]"
                      }`}
                      style={{
                        boxShadow: isSelected ? `0 0 16px ${item.glow}` : "none",
                      }}
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full shadow-inner"
                        style={{ backgroundColor: item.hex }}
                      >
                        {isSelected && <Check size={11} className="text-black font-bold stroke-[3]" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-[var(--text)]">
                          {item.name}
                        </div>
                        <div className="text-[10px] font-mono text-[var(--faint)]">{item.hex}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Background Atmosphere / Mood */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-ink)]">
                  Background Atmosphere
                </span>
                <span className="text-xs font-mono text-[var(--faint)]">{bgMood.name}</span>
              </div>
              <p className="text-xs text-[var(--muted)] mb-3">
                Sets the dark palette depth and pond water tone.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BG_MOOD_PRESETS.map((mood) => {
                  const isSelected = mood.id === bgMood.id;
                  return (
                    <button
                      key={mood.id}
                      type="button"
                      onClick={() => setBgMoodId(mood.id)}
                      data-testid={`mood-btn-${mood.id}`}
                      className={`flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all ${
                        isSelected
                          ? "border-[var(--lime)] bg-[var(--panel-raised)]"
                          : "border-[var(--border)] bg-[var(--panel-soft)] hover:border-[var(--border-strong)]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="h-3 w-3 rounded-full border border-[var(--border-strong)]"
                          style={{ backgroundColor: mood.waterHex }}
                        />
                        {isSelected && <Check size={13} style={{ color: accent.hex }} />}
                      </div>
                      <span className="text-xs font-medium text-[var(--text)]">{mood.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Appearance Mode (Dark / Light) */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-ink)] block mb-2">
                Appearance Mode
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-4 text-xs font-semibold transition-all ${
                    theme === "dark"
                      ? "border-[var(--lime)] bg-[var(--panel-raised)] text-[var(--text)]"
                      : "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <Moon size={15} style={{ color: theme === "dark" ? accent.hex : undefined }} />
                  <span>Dark Mode (Recommended)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-4 text-xs font-semibold transition-all ${
                    theme === "light"
                      ? "border-[var(--lime)] bg-[var(--panel-raised)] text-[var(--text)]"
                      : "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <Sun size={15} style={{ color: theme === "light" ? accent.hex : undefined }} />
                  <span>Light Mode</span>
                </button>
              </div>
            </div>

            {/* Section 4: ASCII Animation Engine */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} style={{ color: accent.hex }} />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-ink)]">
                    ASCII Background Animation
                  </span>
                </div>
                <span className="text-xs font-mono text-[var(--faint)]">
                  {ASCII_ANIMATION_PRESETS.find((a) => a.id === asciiAnimation)?.name}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mb-3">
                Choose a procedural character simulation rendered at 60–120 FPS with zero GPU/CPU lag.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {ASCII_ANIMATION_PRESETS.map((item) => {
                  const isSelected = item.id === asciiAnimation;
                  const Icon =
                    item.iconName === "Fish"
                      ? Fish
                      : item.iconName === "Terminal"
                      ? Terminal
                      : item.iconName === "Waves"
                      ? Waves
                      : item.iconName === "Activity"
                      ? Activity
                      : Sparkles;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAsciiAnimation(item.id)}
                      data-testid={`ascii-anim-${item.id}`}
                      className={`flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all ${
                        isSelected
                          ? "border-[var(--lime)] bg-[var(--panel-raised)] shadow-md"
                          : "border-[var(--border)] bg-[var(--panel-soft)] hover:border-[var(--border-strong)] hover:bg-[var(--panel-raised)]"
                      }`}
                      style={{
                        boxShadow: isSelected ? `0 0 16px ${accent.glow}` : "none",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon size={15} style={{ color: isSelected ? accent.hex : "var(--muted)" }} />
                          <span className="text-xs font-semibold text-[var(--text)]">
                            {item.name}
                          </span>
                        </div>
                        {isSelected && <Check size={13} style={{ color: accent.hex }} />}
                      </div>
                      <span className="text-[10px] font-mono text-[var(--accent-ink)]">
                        {item.tagline}
                      </span>
                      <p className="text-[11px] text-[var(--muted)] line-clamp-2">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 5: Animation Performance & Tuning */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Waves size={14} style={{ color: accent.hex }} />
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-ink)]">
                  Performance & Tuning
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Framerate mode */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3">
                  <div className="text-[11px] font-semibold text-[var(--text)] mb-2">
                    Frame Rate Mode
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["smooth", "eco"] as AnimationMode[]).map((mode) => {
                      const isActive = animationMode === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setAnimationMode(mode)}
                          data-testid={`framerate-${mode}`}
                          style={
                            isActive
                              ? { backgroundColor: accent.hex, color: "#0b0d09" }
                              : undefined
                          }
                          className={`rounded-lg py-1.5 px-2 text-center text-xs font-semibold transition-all ${
                            isActive
                              ? "!text-black font-bold shadow-md ring-1 ring-black/20"
                              : "bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--text)]"
                          }`}
                        >
                          {mode === "smooth" ? "Smooth (120Hz)" : "Eco (30Hz)"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Animation Specific Tuning (Koi Pond Density) */}
                {asciiAnimation === "koi" ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3">
                    <div className="text-[11px] font-semibold text-[var(--text)] mb-2">
                      Koi Pond Density
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["zen", "normal", "dense"] as FishDensity[]).map((d) => {
                        const isActive = fishDensity === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setFishDensity(d)}
                            data-testid={`density-${d}`}
                            style={
                              isActive
                                ? { backgroundColor: accent.hex, color: "#0b0d09" }
                                : undefined
                            }
                            className={`rounded-lg py-1.5 px-1 text-center text-xs font-semibold capitalize transition-all ${
                              isActive
                                ? "!text-black font-bold shadow-md ring-1 ring-black/20"
                                : "bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--text)]"
                            }`}
                          >
                            {d === "zen" ? "Zen (3)" : d === "normal" ? "Normal (7)" : "Dense (14)"}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className="text-button feed-koi-hint mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[var(--accent-ink)] hover:underline cursor-pointer"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("wasmdeck:feed-koi", {
                            detail: { x: window.innerWidth / 2, y: window.innerHeight / 2, count: 6 },
                          })
                        );
                      }}
                    >
                      🐟 Secret Easter Egg: Click to feed the koi (or press &apos;F&apos; anywhere)
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3 flex flex-col justify-center">
                    <div className="text-[11px] font-semibold text-[var(--text)] mb-1">
                      Active Simulation
                    </div>
                    <div className="text-xs text-[var(--faint)]">
                      Pointer-reactive physics active. Move your cursor to create kinetic character ripples.
                    </div>
                    <button
                      type="button"
                      className="text-button feed-koi-hint mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[var(--accent-ink)] hover:underline cursor-pointer"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("wasmdeck:feed-koi", {
                            detail: { x: window.innerWidth / 2, y: window.innerHeight / 2, count: 6 },
                          })
                        );
                      }}
                    >
                      ⚡ Secret Easter Egg: Click to trigger pulse (or press &apos;F&apos; anywhere)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-4">
            <button
              type="button"
              onClick={resetThemeSettings}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--panel-raised)] hover:text-[var(--text)] transition-colors"
            >
              <RotateCcw size={13} />
              <span>Reset to defaults</span>
            </button>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                className="button button--lime text-xs font-bold px-5 py-2 rounded-lg"
              >
                Done
              </button>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
