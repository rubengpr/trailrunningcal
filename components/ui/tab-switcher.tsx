import type { ReactNode } from 'react';

interface Tab {
    id: string;
    label: ReactNode;
}

interface TabSwitcherProps {
    tabs: Tab[];
    activeId: string;
    onChange: (id: string) => void;
    disabled?: boolean;
    className?: string;
}

export function TabSwitcher({ tabs, activeId, onChange, disabled, className }: TabSwitcherProps) {
    return (
        <div className={['inline-flex rounded-lg border border-gray-200 bg-gray-50/80 p-1', className].filter(Boolean).join(' ')}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => onChange(tab.id)}
                    disabled={disabled}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        activeId === tab.id
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
