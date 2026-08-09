"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface CustomSelectDropdownProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export default function CustomSelectDropdown({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  disabled = false,
  style,
  className = "",
}: CustomSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSelect = (optValue: string, isOptDisabled?: boolean) => {
    if (isOptDisabled || disabled) return;
    onChange(optValue);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        width: "100%",
        userSelect: "none",
        ...style,
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: "var(--surface-hover)",
          border: `1px solid ${isOpen ? "var(--accent)" : "var(--border)"}`,
          borderRadius: "var(--radius-sm)",
          color: selectedOption ? "var(--text-primary)" : "var(--text-muted)",
          fontSize: 13,
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          transition: "border-color 0.15s ease, background-color 0.15s ease",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginRight: 8,
          }}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: "var(--text-muted)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#18181b",
            border: "1px solid var(--border-medium)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
            zIndex: 100,
            maxHeight: 220,
            overflowY: "auto",
            padding: "4px 0",
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-muted)" }}>
              No options available
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value, opt.disabled)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 14px",
                    fontSize: 13,
                    color: opt.disabled
                      ? "var(--text-muted)"
                      : isSelected
                      ? "var(--accent)"
                      : "var(--text-primary)",
                    background: isSelected ? "var(--accent-dim)" : "transparent",
                    cursor: opt.disabled ? "not-allowed" : "pointer",
                    opacity: opt.disabled ? 0.5 : 1,
                    transition: "background 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!opt.disabled && !isSelected) {
                      e.currentTarget.style.background = "var(--surface-hover)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!opt.disabled && !isSelected) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontFamily: opt.value ? "var(--font-mono)" : "inherit",
                    }}
                  >
                    {opt.label}
                  </span>
                  {isSelected && <Check size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
