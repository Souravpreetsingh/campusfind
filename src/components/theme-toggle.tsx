'use client';

export function ThemeToggle() {
  function toggle() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-full bg-primary/10 p-2 hover:bg-primary/20 transition-colors"
      aria-label="Toggle dark mode"
    >
      <span className="material-symbols-outlined dark:hidden" aria-hidden="true">
        dark_mode
      </span>
      <span className="material-symbols-outlined hidden dark:inline" aria-hidden="true">
        light_mode
      </span>
    </button>
  );
}
