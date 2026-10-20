'use client';

import { Button } from '@/components/ui/button';
import { createPortal } from 'react-dom';
import { useEffect, useId, useRef } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { useMultiSelectMenu } from '@/hooks/use-multi-select-menu';

export interface IconActionMenuItem {
    id: string;
    label: string;
    onSelect: () => void;
    disabled?: boolean;
    tone?: 'default' | 'destructive';
    icon?: React.ReactNode;
    title?: string;
}

interface IconActionMenuProps {
    triggerAriaLabel: string;
    triggerTitle?: string;
    disabled?: boolean;
    items: IconActionMenuItem[];
    triggerIcon?: React.ReactNode;
    size?: 'default' | 'sm';
    onOpen?: () => void;
    footer?: string;
    className?: string;
    triggerClassName?: string;
    triggerAsButton?: boolean;
    triggerButtonVariant?: 'primary' | 'secondary';
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
    onOpen,
    footer,
    className = '',
    triggerClassName,
    triggerAsButton = false,
    triggerButtonVariant = 'primary',
}: IconActionMenuProps) {
    const { open, containerRef, triggerRef, dropdownRef, dropdownStyle, toggleOpen, openMenu, closeMenu } =
        useMultiSelectMenu({
            usePortalPosition: true,
            minWidth: footer ? 280 : 160,
            offset: 4,
            preferredMenuHeight: items.length * 40 + (footer ? 88 : 8),
        });

    const menuId = useId();
    const focusLastRef = useRef(false);

    useEffect(() => {
        if (!open) return;
        const buttons = dropdownRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        const index = focusLastRef.current ? (buttons?.length ?? 1) - 1 : 0;
        buttons?.[index]?.focus();
    }, [open, dropdownRef]);

    const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape' || event.key === 'Tab') {
            closeMenu();
            triggerRef.current?.focus();
            return;
        }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const buttons = Array.from(dropdownRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        if (!buttons.length) return;
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
            : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
    };

    const panel =
        open &&
        typeof document !== 'undefined' &&
        createPortal(
            <div
                ref={dropdownRef}
                id={menuId}
                role="menu"
                aria-label={triggerAriaLabel}
                onKeyDown={handleMenuKeyDown}
                className="z-9999 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg animate-filter-select-in"
                style={{
                    position: 'absolute',
                    top: dropdownStyle.top,
                    left: Math.max(window.scrollX + 8, Math.min(dropdownStyle.left, window.scrollX + window.innerWidth - Math.min(dropdownStyle.minWidth, window.innerWidth - 16) - 8)),
                    minWidth: Math.min(dropdownStyle.minWidth, window.innerWidth - 16),
                    maxWidth: window.innerWidth - 16,
                    width: footer ? Math.min(280, window.innerWidth - 16) : undefined,
                    maxHeight: dropdownStyle.maxHeight,
                }}
            >
                {items.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        tabIndex={-1}
                        disabled={item.disabled}
                        title={item.title}
                        className={`flex w-full items-center gap-2 cursor-pointer text-left transition-colors duration-100 ${item.tone === 'destructive' ? 'text-red-600 hover:bg-red-50' : 'text-gray-900 hover:bg-gray-50'} disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white ${size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}
                        onClick={() => {
                            if (item.disabled) return;
                            item.onSelect();
                            closeMenu();
                            triggerRef.current?.focus();
                        }}
                    >
                        {item.icon}{item.label}
                    </button>
                ))}
                {footer ? <p className="max-w-64 border-t border-gray-100 px-3 py-2 text-xs text-gray-500">{footer}</p> : null}
            </div>,
            document.body,
        );

    const Trigger = triggerAsButton ? Button : 'button';

    return (
        <div ref={containerRef} className={`relative shrink-0 ${className}`}>
            <Trigger
                {...(triggerAsButton ? { variant: triggerButtonVariant } : {})}
                ref={triggerRef}
                type="button"
                className={triggerClassName ?? triggerClass[size]}
                aria-label={triggerAriaLabel}
                title={triggerTitle ?? triggerAriaLabel}
                aria-expanded={open}
                aria-haspopup="menu"
                aria-controls={open ? menuId : undefined}
                disabled={disabled}
                onKeyDown={(event) => {
                    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
                    event.preventDefault();
                    focusLastRef.current = event.key === 'ArrowUp';
                    if (!open) onOpen?.();
                    openMenu();
                }}
                onClick={() => {
                    focusLastRef.current = false;
                    if (!open) onOpen?.();
                    toggleOpen();
                }}
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
            </Trigger>
            {panel}
        </div>
    );
}
