// src/components/notes/SaveButton.tsx
// ✨ NEW COMPONENT: Smart save button with loading states

'use client';

import React from 'react';

interface SaveButtonProps {
    onSave: () => void;
    isSaving: boolean;
    hasUnsavedChanges: boolean;
    disabled?: boolean;
}

export function SaveButton({
    onSave,
    isSaving,
    hasUnsavedChanges,
    disabled = false
}: SaveButtonProps) {
    const getButtonContent = () => {
        if (isSaving) {
            return (
                <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                </>
            );
        }

        if (hasUnsavedChanges) {
            return (
                <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Save Changes
                </>
            );
        }

        return (
            <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved
            </>
        );
    };

    const getButtonStyle = () => {
        if (disabled || isSaving) {
            return "bg-gray-400 cursor-not-allowed";
        }

        if (hasUnsavedChanges) {
            return "bg-blue-600 hover:bg-blue-700 text-white";
        }

        return "bg-green-600 text-white cursor-default";
    };

    return (
        <button
            onClick={onSave}
            disabled={disabled || isSaving || !hasUnsavedChanges}
            className={`
        inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md
        transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${getButtonStyle()}
      `}
            title={hasUnsavedChanges ? "Save changes (Ctrl+S)" : "No changes to save"}
        >
            {getButtonContent()}
        </button>
    );
}