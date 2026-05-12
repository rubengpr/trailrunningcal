'use client';

import { createPortal } from 'react-dom';
import { ChevronDown, Download } from 'lucide-react';
import { useMultiSelectMenu } from '@/hooks/use-multi-select-menu';

export interface IconActionMenuItem {
    id: string;
    label: string;
    onSelect: () => void;
    disabled?: boolean;
}

interface IconActionMenuProps {
    triggerAriaLabel: string;
    triggerTitle?: string;
    disabled?: boolean;
    items: IconActionMenuItem[];
    triggerIcon?: React.ReactNode;
    size?: 'default' | 'sm';
}

const triggerClass = {
    default: 'inline-flex h-9 min-h-9 shrink-0 items-center justify-center gap-0.5 rounded-xl border border-gray-300 bg-white px-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
    sm: 'inline-flex h-7 min-h-7 shrink-0 items-center justify-center gap-0.5 rounded-lg border border-gray-200 bg-white px-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 focus:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
};

export function IconActionMenu({
    triggerAriaLabel,
    triggerTitle,
    disabled = false,
    items,
    triggerIcon,
    size = 'default',
}: IconActionMenuProps) {
    const { open, containerRef, triggerRef, dropdownRef, dropdownStyle, toggleOpen, closeMenu } =
        useMultiSelectMenu({
            usePortalPosition: true,
            minWidth: 160,
            offset: 4,
        });

    const panel =
        open &&
        typeof document !== 'undefined' &&
        createPortal(
            <div
                ref={dropdownRef}
                className="z-9999 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg animate-filter-select-in"
                style={{
                    position: 'absolute',
                    top: dropdownStyle.top,
                    left: dropdownStyle.left,
                    minWidth: dropdownStyle.minWidth,
                }}
            >
                {items.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        disabled={item.disabled}
                        className={`flex w-full cursor-pointer text-left text-gray-900 transition-colors duration-100 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white ${size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}
                        onClick={() => {
                            if (item.disabled) return;
                            item.onSelect();
                            closeMenu();
                        }}
                    >
                        {item.label}
                    </button>
                ))}
            </div>,
            document.body,
        );

    return (
        <div ref={containerRef} className="relative shrink-0">
            <button
                ref={triggerRef}
                type="button"
                className={triggerClass[size]}
                aria-label={triggerAriaLabel}
                title={triggerTitle ?? triggerAriaLabel}
                aria-expanded={open}
                aria-haspopup="menu"
                disabled={disabled}
                onClick={toggleOpen}
            >
                {triggerIcon ?? (
                    <>
                        <Download className={`${size === 'sm' ? 'size-3.5' : 'size-4'} shrink-0`} strokeWidth={2} aria-hidden />
                        <ChevronDown
                            size={size === 'sm' ? 12 : 14}
                            strokeWidth={2}
                            className={`shrink-0 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                            aria-hidden
                        />
                    </>
                )}
            </button>
            {panel}
        </div>
    );
}
