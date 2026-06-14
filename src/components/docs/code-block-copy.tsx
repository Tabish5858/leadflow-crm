"use client";

import { useEffect, useRef } from "react";
import { Copy, Check } from "lucide-react";

export function CodeBlockCopy() {
  const injected = useRef(false);

  useEffect(() => {
    if (injected.current) return;
    injected.current = true;

    // Find all pre elements that don't already have a copy button
    const pres = document.querySelectorAll<HTMLPreElement>(
      ".docs-dark .prose pre:not([data-copy-enabled])"
    );

    pres.forEach((pre) => {
      pre.setAttribute("data-copy-enabled", "true");
      pre.style.position = "relative";

      const btn = document.createElement("button");
      btn.className =
        "absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-neutral-700 bg-neutral-900 text-neutral-400 opacity-0 transition-opacity duration-150 hover:border-neutral-500 hover:text-white focus:opacity-100 group-hover:opacity-100";
      btn.setAttribute("aria-label", "Copy code");
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;

      // Show button on hover of the pre block
      pre.classList.add("group");
      pre.addEventListener("mouseenter", () => {
        btn.style.opacity = "1";
      });
      pre.addEventListener("mouseleave", () => {
        if (btn.dataset.copied !== "true") {
          btn.style.opacity = "0";
        }
      });

      btn.addEventListener("click", async () => {
        // Get text content, excluding the button's own text
        const code = pre.querySelector("code");
        const text = code?.textContent || pre.textContent || "";

        try {
          await navigator.clipboard.writeText(text.trim());
          btn.dataset.copied = "true";
          btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
          btn.style.opacity = "1";
          btn.style.borderColor = "hsl(152 55% 42%)";
          btn.style.color = "hsl(152 55% 50%)";

          setTimeout(() => {
            btn.dataset.copied = "false";
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
            btn.style.borderColor = "";
            btn.style.color = "";
            // Hide if mouse left pre
            if (!pre.matches(":hover")) {
              btn.style.opacity = "0";
            }
          }, 2000);
        } catch {
          // Fallback for older browsers
          const ta = document.createElement("textarea");
          ta.value = text.trim();
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
      });

      pre.appendChild(btn);
    });
  }, []);

  return null;
}
