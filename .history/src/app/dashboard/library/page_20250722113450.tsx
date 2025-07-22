// src/app/dashboard/library/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SmartLink {
    id: string;
    name: string; // @SMARTPHRASE@
    description: string;
    category: string;
    institution: string;
    relatedDotPhrases: string[];
    createdAt: string;
    lastUsed?: string;
    usage_count: number;
}

interface DotPhrase {
    id: string;
    name: string; // .dotphrase
    content: string;
    category: string;
    smartLinkId?: string;
    createdAt: string;
}

export default function LibraryPage() {
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'smartlinks' | 'dotphrases'>('smartlinks');

    const [smartLinks] = useState<SmartLink[]>([
        {
            id: '1',
            name: '@CC@',
            description: 'Chief Complaint template',
            category: 'General',
            institution: 'General Hospital',
            relatedDotPhrases: ['.cc', '.chiefcomplaint'],
            createdAt: '2024-01-15',
            lastUsed: '2024-01-22',
            usage_count: 45
        },
        {
            id: '2',
            name: '@ASSESSMENT@',
            description: 'Clinical assessment and plan',
            category: 'General',
            institution: 'General Hospital',
            relatedDotPhrases: ['.assessment', '.plan'],
            createdAt: '2024-01-10',
            lastUsed: '2024-01-21',
            usage_count: 38
        },
        {
            id: '3',
            name: '@CARDIO@',
            description: 'Cardiology examination template',
            category: 'Specialty',
            institution: 'Cardiac Center',
            relatedDotPhrases: ['.cardioaccessment', '.echo'],
            createdAt: '2024-01-08',
            lastUsed: '2024-01-20',
            usage_count: 12
        }
    ]);

    const [dotPhrases] = useState<DotPhrase[]>([
        {
            id: '1',
            name: '.cc',
            content: 'The patient presents today with complaints of ***.',
            category: 'General',
            smartLinkId: '1',
            createdAt: '2024-01-15'
        },
        {
            id: '2',
            name: '.assessment',
            content: 'Assessment:\n1. ***\n2. ***\n\nPlan:\n1. ***\n2. ***',
            category: 'General',
            smartLinkId: '2',
            createdAt: '2024-01-10'
        },
        {
            id: '3',
            name: '.cardioaccessment',
            content: 'Cardiovascular Assessment:\nHeart rate: *** BPM\nBlood pressure: ***/*** mmHg\nHeart sounds: ***\nMurmurs: ***',
            category: 'Specialty',
            smartLinkId: '3',
            createdAt: '2024-01-08'
        }
    ]);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    const categories = ['All', 'General', 'Specialty', 'Emergency', 'Surgical'];

    const filteredSmartLinks = smartLinks.filter(link => {
        const matchesSearch = link.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            link.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || link.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const filteredDotPhrases = dotPhrases.filter(phrase => {
        const matchesSearch = phrase.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            phrase.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || phrase.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleCreateSmartLink = () => {
        // TODO: Navigate to SmartLink creation form
        console.log('Creating new SmartLink...');
    };

    const handleCreateDotPhrase = () => {
        // TODO: Navigate to DotPhrase creation form
        console.log('Creating new DotPhrase...');
    };

    const handleEditSmartLink = (id: string) => {
        // TODO: Navigate to SmartLink editing
        console.log('Editing SmartLink:', id);
    };

    const handleEditDotPhrase = (id: string) => {
        // TODO: Navigate to DotPhrase editing
        console.log('Editing DotPhrase:', id);
    };

    const handleCopyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // TODO: Show toast notification
        console.log('Copied to clipboard:', text);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">SmartLink Library</h1>
                    <p className="mt-2 text-gray-600">
                        Manage Epic SmartPhrases and DotPhrases for efficient clinical documentation
                    </p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={activeTab === 'smartlinks' ? handleCreateSmartLink : handleCreateDotPhrase}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Create {activeTab === 'smartlinks' ? 'SmartLink' : 'DotPhrase'}</span>
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                    <button
                        onClick={() => setActiveTab('smartlinks')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'smartlinks'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        SmartLinks ({smartLinks.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('dotphrases')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'dotphrases'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        DotPhrases ({dotPhrases.length})
                    </button>
                </nav>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex-1">
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
                <div className="flex space-x-2">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${selectedCategory === category
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'smartlinks' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSmartLinks.map((smartLink) => (
                        <div key={smartLink.id} className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-2">
                                        <code className="px-2 py-1 bg-green-100 text-green-800 rounded font-mono text-sm">
                                            {smartLink.name}
                                        </code>
                                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                            {smartLink.category}
                                        </span>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-600 mb-4">{smartLink.description}</p>

                                <div className="text-xs text-gray-500 mb-4">
                                    <div>Institution: {smartLink.institution}</div>
                                    <div>Used {smartLink.usage_count} times</div>
                                    {smartLink.lastUsed && (
                                        <div>Last used: {new Date(smartLink.lastUsed).toLocaleDateString()}</div>
                                    )}
                                </div>

                                {/* Related DotPhrases */}
                                {smartLink.relatedDotPhrases.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs font-medium text-gray-500 mb-2">Related DotPhrases:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {smartLink.relatedDotPhrases.map((phrase, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => handleCopyToClipboard(phrase)}
                                                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded font-mono hover:bg-gray-200 transition-colors"
                                                >
                                                    {phrase}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleCopyToClipboard(smartLink.name)}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                    >
                                        Copy
                                    </button>
                                    <button
                                        onClick={() => handleEditSmartLink(smartLink.id)}
                                        className="px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors"
                                    >
                                        Edit
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredDotPhrases.map((dotPhrase) => (
                        <div key={dotPhrase.id} className="bg-white shadow rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-3">
                                        <code className="px-2 py-1 bg-orange-100 text-orange-800 rounded font-mono text-sm">
                                            {dotPhrase.name}
                                        </code>
                                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                            {dotPhrase.category}
                                        </span>
                                        {dotPhrase.smartLinkId && (
                                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                                Linked
                                            </span>
                                        )}
                                    </div>

                                    <div className="bg-gray-50 p-3 rounded-md mb-4">
                                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                                            {dotPhrase.content}
                                        </pre>
                                    </div>

                                    <div className="text-xs text-gray-500">
                                        Created: {new Date(dotPhrase.createdAt).toLocaleDateString()}
                                    </div>
                                </div>

                                <div className="ml-4 flex space-x-2">
                                    <button
                                        onClick={() => handleCopyToClipboard(dotPhrase.content)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                    >
                                        Copy Content
                                    </button>
                                    <button
                                        onClick={() => handleEditDotPhrase(dotPhrase.id)}
                                        className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                    >
                                        Edit
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty States */}
            {((activeTab === 'smartlinks' && filteredSmartLinks.length === 0) ||
                (activeTab === 'dotphrases' && filteredDotPhrases.length === 0)) && (
                    <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                            No {activeTab === 'smartlinks' ? 'SmartLinks' : 'DotPhrases'} found
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Get started by creating your first {activeTab === 'smartlinks' ? 'SmartLink' : 'DotPhrase'}.
                        </p>
                        <div className="mt-6">
                            <button
                                onClick={activeTab === 'smartlinks' ? handleCreateSmartLink : handleCreateDotPhrase}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Create {activeTab === 'smartlinks' ? 'SmartLink' : 'DotPhrase'}
                            </button>
                        </div>
                    </div>
                )}
        </div>
    );
}