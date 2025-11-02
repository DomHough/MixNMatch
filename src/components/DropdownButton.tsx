import type { ReactNode } from "react";
import { useState, useRef, useEffect } from "react";
import { twMerge } from "tailwind-merge";

type DropdownItem = {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
};

type Props = {
  children: ReactNode | string;
  items: DropdownItem[];
  variant?: "primary" | "background" | "surface";
  className?: string;
  dropdownClassName?: string;
};

export default function DropdownButton({
  children,
  items,
  variant = "primary",
  className = "",
  dropdownClassName = "",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const defaultStyle = "rounded-xl py-2 px-4 flex flex-row items-center gap-2";
  const colorVariants = {
    primary:
      "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active",
    background:
      "bg-background text-on-background hover:bg-background-hover active:bg-background-active",
    surface:
      "bg-surface text-on-surface hover:bg-on-surface hover:text-surface",
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleItemClick = (onClick: () => void) => {
    onClick();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className={twMerge(defaultStyle, colorVariants[variant], className)}
      >
        {children}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className={twMerge(
            "absolute top-full mt-2 right-0 bg-surface rounded-xl shadow-lg border border-on-surface/10 overflow-hidden z-50 min-w-[200px]",
            dropdownClassName
          )}
        >
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => handleItemClick(item.onClick)}
              className="w-full px-4 py-2 text-left text-on-surface hover:bg-on-surface/10 active:bg-on-surface/20 flex flex-row items-center gap-2 transition-colors"
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

