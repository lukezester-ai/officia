"use client";
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("officia-theme");
    if (saved === "light") {
      setDark(false);
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    const theme = next ? "dark" : "light";
    localStorage.setItem("officia-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  };

  return (
    <button
      onClick={toggle}
      title={dark ? "Светла тема" : "Тъмна тема"}
      className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
