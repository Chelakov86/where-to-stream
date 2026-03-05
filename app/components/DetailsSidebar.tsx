'use client';

import React, { useEffect, useCallback } from 'react';
import ResultDetails from './ResultDetails';

interface DetailsSidebarProps {
    selectedTitle: { id: number; type: 'movie' | 'tv' } | null;
    onClose: () => void;
    onError?: (message: string | null) => void;
}

const DetailsSidebar: React.FC<DetailsSidebarProps> = ({
    selectedTitle,
    onClose,
    onError,
}) => {
    // Close on Escape key
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        },
        [onClose]
    );

    useEffect(() => {
        if (!selectedTitle) return;
        // Only lock body scroll when the overlay is actually visible (below lg = 1024px)
        const isOverlayVisible = window.innerWidth < 1024;
        document.addEventListener('keydown', handleKeyDown);
        if (isOverlayVisible) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [selectedTitle, handleKeyDown]);

    if (!selectedTitle) return null;

    return (
        <div className="details-sidebar-overlay" role="dialog" aria-modal="true" aria-label="Title details">
            {/* Backdrop — clicking it closes on desktop */}
            <div
                className="details-backdrop"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel */}
            <aside className="details-sidebar" role="complementary">
                {/* Close button */}
                <div className="sticky top-0 z-10 flex justify-end p-3 sm:p-4 bg-gradient-to-b from-[#1A0F1F] to-transparent">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-muted-violet/60 hover:bg-muted-violet border border-golden-bronze/30 hover:border-primary-gold rounded-lg text-sm font-medium text-cream-text hover:text-white transition-all"
                        aria-label="Close details"
                    >
                        <span aria-hidden="true">✕</span>
                        <span className="hidden sm:inline">Close</span>
                    </button>
                </div>

                {/* Details content */}
                <div className="px-4 pb-6 sm:px-5 sm:pb-8">
                    <ResultDetails title={selectedTitle} onError={onError} />
                </div>
            </aside>
        </div>
    );
};

export default DetailsSidebar;
