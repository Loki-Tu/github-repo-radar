import { useState, useEffect } from "react";

interface SearchBarProps {
  onSearch: (url: string) => void;
  disabled: boolean;
}

export default function SearchBar({ onSearch, disabled }: SearchBarProps) {
  const [url, setUrl] = useState("");

  // 自动获取当前标签页的 URL（如果是 GitHub 页面）
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabUrl = tabs[0]?.url || "";
      if (tabUrl.includes("github.com/")) {
        setUrl(tabUrl);
      }
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !disabled) {
      onSearch(url.trim());
    }
  };

  const isGitHubUrl = url.includes("github.com/");

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="GitHub 仓库 URL，例如 https://github.com/fastapi/fastapi"
        disabled={disabled}
        className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background
                   focus:outline-none focus:ring-2 focus:ring-ring
                   disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={disabled || !url.trim()}
        className="px-4 py-2 text-sm font-medium rounded-md
                   bg-primary text-primary-foreground
                   hover:opacity-90 transition-opacity
                   disabled:opacity-50 disabled:cursor-not-allowed
                   whitespace-nowrap"
      >
        {disabled ? "搜索中..." : "搜索"}
      </button>
    </form>
  );
}
