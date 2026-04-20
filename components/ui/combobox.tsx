'use client';

import { useState, useRef, useEffect, useId } from 'react';

export interface ComboboxOption {
    value: string;
    label: string;
}

interface ComboboxProps {
    id?: string;
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: ComboboxOption[];
    placeholder?: string;
    disabled?: boolean;
    helperText?: string;
}

export function Combobox({
    id: externalId,
    label,
    value,
    onChange,
    options,
    placeholder,
    disabled,
    helperText,
}: ComboboxProps) {
    const generatedId = useId();
    const id = externalId ?? generatedId;

    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const filtered = options.filter(
        (opt) =>
            opt.label.toLowerCase().includes(value.toLowerCase()) ||
            opt.value.toLowerCase().includes(value.toLowerCase()),
    );

    const showDropdown = isOpen && filtered.length > 0;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setHighlightedIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
            item?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightedIndex]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        onChange(e.target.value);
        setIsOpen(true);
        setHighlightedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setIsOpen(true);
            setHighlightedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((prev) => Math.max(prev - 1, -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const option = filtered[highlightedIndex];
            if (option) {
                onChange(option.value);
                setIsOpen(false);
                setHighlightedIndex(-1);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setHighlightedIndex(-1);
        }
    };

    const handleOptionMouseDown = (optionValue: string): void => {
        onChange(optionValue);
        setIsOpen(false);
        setHighlightedIndex(-1);
    };

    return (
        <div className="grid gap-2 w-full">
            {label && (
                <label htmlFor={id} className="text-sm font-medium leading-none">
                    {label}
                </label>
            )}
            <div ref={containerRef} className="relative">
                <input
                    id={id}
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    onFocus={() => { if (filtered.length > 0) setIsOpen(true); }}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    placeholder={placeholder}
                    autoComplete="off"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
                {showDropdown && (
                    <div
                        ref={listRef}
                        className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md border border-gray-200 bg-white shadow-md"
                    >
                        {filtered.map((option, index) => (
                            <div
                                key={option.value}
                                onMouseDown={() => handleOptionMouseDown(option.value)}
                                className={`cursor-pointer px-3 py-2 text-sm truncate transition-colors ${
                                    index === highlightedIndex
                                        ? 'bg-gray-100 text-gray-900'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {helperText && (
                <p className="text-xs text-gray-500 ml-1">{helperText}</p>
            )}
        </div>
    );
}
