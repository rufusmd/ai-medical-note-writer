// src/types/smartlinks.ts
import { Timestamp } from 'firebase/firestore';

export interface SmartLink {
    id: string;
    name: string;              // @SMARTPHRASE@
    description: string;
    purpose: string;
    dataSource: string;
    outputFormat: string;
    institution: string;
    category: string;
    tags: string[];
    isPublic: boolean;
    createdBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface DotPhrase {
    id: string;
    name: string;              // .dotphrase
    description: string;
    purpose: string;
    dataSource: string;
    outputFormat: string;
    usage: string;
    institution: string;
    category: string;
    tags: string[];
    isPublic: boolean;
    createdBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface SmartLinkDotPhraseRelationship {
    id: string;
    smartLinkId: string;
    dotPhraseId: string;
    confidence: number;
    verified: boolean;
    verifiedBy?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface TemplateAnalysis {
    templateId: string;
    smartLinks: Array<{
        smartLinkId?: string;
        name: string;
        position: number;
        confidence: number;
    }>;
    dotPhrases: Array<{
        dotPhraseId?: string;
        name: string;
        position: number;
        confidence: number;
    }>;
    analysisDate: Timestamp;
}