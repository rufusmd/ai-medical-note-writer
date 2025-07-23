// src/lib/notes/auto-save.ts
// ✨ NEW FILE: Auto-save utility for notes

import { debounce } from 'lodash';
import { AutoSaveConfig, DEFAULT_AUTO_SAVE_CONFIG } from '@/types/notes';

export interface AutoSaveOptions {
    noteId: string;
    onAutoSave: (content: string) => Promise<void>;
    onError?: (error: Error) => void;
    onSuccess?: () => void;
    config?: Partial<AutoSaveConfig>;
}

export class AutoSave {
    private noteId: string;
    private onAutoSave: (content: string) => Promise<void>;
    private onError?: (error: Error) => void;
    private onSuccess?: () => void;
    private config: AutoSaveConfig;
    private debouncedSave: (content: string) => void;
    private lastSaveTime: Date | null = null;
    private currentSavePromise: Promise<void> | null = null;
    private isDestroyed = false;
    private retryCount = 0;

    constructor(options: AutoSaveOptions) {
        this.noteId = options.noteId;
        this.onAutoSave = options.onAutoSave;
        this.onError = options.onError;
        this.onSuccess = options.onSuccess;
        this.config = { ...DEFAULT_AUTO_SAVE_CONFIG, ...options.config };

        // Create debounced save function
        this.debouncedSave = debounce(
            this.performAutoSave.bind(this),
            this.config.intervalMs
        );
    }

    /**
     * Trigger an auto-save for the given content
     */
    public triggerAutoSave(content: string): void {
        if (!this.config.enabled || this.isDestroyed) {
            return;
        }

        this.debouncedSave(content);
    }

    /**
     * Force an immediate auto-save (bypasses debouncing)
     */
    public async forceAutoSave(content: string): Promise<void> {
        if (!this.config.enabled || this.isDestroyed) {
            return;
        }

        // Cancel any pending debounced save
        this.debouncedSave.cancel();

        // Perform immediate save
        await this.performAutoSave(content);
    }

    /**
     * Check if an auto-save is currently in progress
     */
    public isSaving(): boolean {
        return this.currentSavePromise !== null;
    }

    /**
     * Get the timestamp of the last successful auto-save
     */
    public getLastSaveTime(): Date | null {
        return this.lastSaveTime;
    }

    /**
     * Update the auto-save configuration
     */
    public updateConfig(newConfig: Partial<AutoSaveConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // Recreate debounced function with new interval if changed
        if (newConfig.intervalMs) {
            this.debouncedSave.cancel();
            this.debouncedSave = debounce(
                this.performAutoSave.bind(this),
                this.config.intervalMs
            );
        }
    }

    /**
     * Cancel any pending auto-saves and clean up
     */
    public destroy(): void {
        this.isDestroyed = true;
        this.debouncedSave.cancel();
        this.currentSavePromise = null;
    }

    /**
     * Perform the actual auto-save operation with retry logic
     */
    private async performAutoSave(content: string): Promise<void> {
        if (this.isDestroyed) {
            return;
        }

        // Don't start a new save if one is already in progress
        if (this.currentSavePromise) {
            return;
        }

        try {
            this.currentSavePromise = this.saveWithRetry(content);
            await this.currentSavePromise;

            this.lastSaveTime = new Date();
            this.retryCount = 0;

            if (this.onSuccess) {
                this.onSuccess();
            }

        } catch (error) {
            console.error('Auto-save failed after all retries:', error);

            if (this.onError) {
                this.onError(error instanceof Error ? error : new Error('Auto-save failed'));
            }
        } finally {
            this.currentSavePromise = null;
        }
    }

    /**
     * Save with retry logic
     */
    private async saveWithRetry(content: string): Promise<void> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
            try {
                await this.onAutoSave(content);
                return; // Success!

            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');

                // If this isn't the last attempt, wait before retrying
                if (attempt < this.config.retryAttempts) {
                    await this.delay(this.config.retryDelayMs * (attempt + 1)); // Exponential backoff
                }
            }
        }

        // If we get here, all retries failed
        throw lastError;
    }

    /**
     * Utility function to create a delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * React hook for auto-save functionality
 */
export function useAutoSave(options: AutoSaveOptions) {
    const [autoSave] = React.useState(() => new AutoSave(options));
    const [isSaving, setIsSaving] = React.useState(false);
    const [lastSaveTime, setLastSaveTime] = React.useState<Date | null>(null);
    const [error, setError] = React.useState<Error | null>(null);

    // Update saving state when auto-save operations occur
    React.useEffect(() => {
        const originalOnAutoSave = options.onAutoSave;

        const wrappedOnAutoSave = async (content: string) => {
            setIsSaving(true);
            setError(null);

            try {
                await originalOnAutoSave(content);
                setLastSaveTime(new Date());
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Auto-save failed'));
                throw err; // Re-throw so AutoSave class can handle retries
            } finally {
                setIsSaving(false);
            }
        };

        autoSave.onAutoSave = wrappedOnAutoSave;
    }, [options.onAutoSave]);

    // Clean up on unmount
    React.useEffect(() => {
        return () => {
            autoSave.destroy();
        };
    }, [autoSave]);

    return {
        triggerAutoSave: autoSave.triggerAutoSave.bind(autoSave),
        forceAutoSave: autoSave.forceAutoSave.bind(autoSave),
        isSaving,
        lastSaveTime,
        error,
        updateConfig: autoSave.updateConfig.bind(autoSave)
    };
}

/**
 * Utility function to create auto-save status text
 */
export function getAutoSaveStatusText(
    isSaving: boolean,
    lastSaveTime: Date | null,
    error: Error | null
): string {
    if (error) {
        return 'Auto-save failed';
    }

    if (isSaving) {
        return 'Auto-saving...';
    }

    if (lastSaveTime) {
        const now = new Date();
        const diffMs = now.getTime() - lastSaveTime.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);

        if (diffMinutes < 1) {
            return 'Auto-saved just now';
        } else if (diffMinutes < 60) {
            return `Auto-saved ${diffMinutes}m ago`;
        } else {
            return `Auto-saved at ${lastSaveTime.toLocaleTimeString()}`;
        }
    }

    return 'Auto-save enabled';
}

/**
 * Configuration for different auto-save scenarios
 */
export const AUTO_SAVE_PRESETS = {
    // Aggressive auto-save for high-value content
    aggressive: {
        enabled: true,
        intervalMs: 1000,        // 1 second
        retryAttempts: 5,
        retryDelayMs: 500
    } as AutoSaveConfig,

    // Standard auto-save for most use cases
    standard: {
        enabled: true,
        intervalMs: 2000,        // 2 seconds
        retryAttempts: 3,
        retryDelayMs: 1000
    } as AutoSaveConfig,

    // Conservative auto-save for slower connections
    conservative: {
        enabled: true,
        intervalMs: 5000,        // 5 seconds
        retryAttempts: 2,
        retryDelayMs: 2000
    } as AutoSaveConfig,

    // Disabled auto-save
    disabled: {
        enabled: false,
        intervalMs: 0,
        retryAttempts: 0,
        retryDelayMs: 0
    } as AutoSaveConfig
};

// Import React for the hook
import React from 'react';