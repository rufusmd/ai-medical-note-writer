// src/lib/firebase/templates.ts

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    DocumentSnapshot,
    serverTimestamp,
    increment,
} from 'firebase/firestore';
import { db, COLLECTIONS, handleFirebaseError, firestoreUtils, createAuditLog } from '@/lib/firebase';
import { NoteTemplate, SmartPhrase, DotPhrase } from '@/lib/ai-providers/types';

export interface TemplateUsageStats {
    timesUsed: number;
    avgRating: number;
    lastUsed: Date | null;
    userRatings: {
        userId: string;
        rating: number;
        timestamp: Date;
        comment?: string;
    }[];
}

export interface TemplateSearchFilters {
    category?: NoteTemplate['category'];
    searchTerm?: string;
    epicCompatible?: boolean;
    createdBy?: string;
    sortBy?: 'name' | 'category' | 'lastModified' | 'usage';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
}

export interface TemplateListResult {
    templates: NoteTemplate[];
    totalCount: number;
    hasMore: boolean;
    lastDoc?: DocumentSnapshot;
}

// Template management service
export class TemplateService {
    private static instance: TemplateService;

    static getInstance(): TemplateService {
        if (!TemplateService.instance) {
            TemplateService.instance = new TemplateService();
        }
        return TemplateService.instance;
    }

    private constructor() { }

    // Create a new template
    async createTemplate(
        templateData: Omit<NoteTemplate, 'id' | 'lastModified' | 'usage'>,
        userId: string
    ): Promise<NoteTemplate> {
        try {
            // Validate Epic syntax
            const epicValidation = this.validateEpicSyntax(templateData.content);

            const template = {
                ...templateData,
                smartPhrases: epicValidation.smartPhrasesFound,
                dotPhrases: epicValidation.dotPhrasesFound,
                placeholders: epicValidation.placeholdersFound,
                epicCompatible: epicValidation.isValid,
                lastModified: new Date(),
                usage: {
                    timesUsed: 0,
                    avgRating: 0,
                    lastUsed: null,
                },
                createdBy: userId,
            };

            // Sanitize data
            const sanitizedData = firestoreUtils.sanitizeData(template);

            // Create the template document
            const docRef = await addDoc(collection(db, COLLECTIONS.TEMPLATES), {
                ...sanitizedData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Get the created template with actual timestamps
            const createdTemplate = await this.getTemplateById(docRef.id);
            if (!createdTemplate) {
                throw new Error('Failed to retrieve created template');
            }

            // Create audit log
            await createAuditLog(
                'TEMPLATE_CREATED',
                {
                    templateId: docRef.id,
                    name: templateData.name,
                    category: templateData.category,
                    epicCompatible: template.epicCompatible,
                },
                userId
            );

            return createdTemplate;

        } catch (error) {
            console.error('Error creating template:', error);
            throw handleFirebaseError(error);
        }
    }

    // Get a template by ID
    async getTemplateById(templateId: string): Promise<NoteTemplate | null> {
        try {
            const docRef = doc(db, COLLECTIONS.TEMPLATES, templateId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                return null;
            }

            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...firestoreUtils.convertTimestamps(data),
            } as NoteTemplate;

        } catch (error) {
            console.error('Error getting template:', error);
            throw handleFirebaseError(error);
        }
    }

    // Update a template
    async updateTemplate(
        templateId: string,
        updateData: Partial<Omit<NoteTemplate, 'id' | 'createdAt' | 'updatedAt'>>,
        userId: string
    ): Promise<NoteTemplate> {
        try {
            // Re-validate Epic syntax if content was updated
            if (updateData.content) {
                const epicValidation = this.validateEpicSyntax(updateData.content);
                updateData.smartPhrases = epicValidation.smartPhrasesFound;
                updateData.dotPhrases = epicValidation.dotPhrasesFound;
                updateData.placeholders = epicValidation.placeholdersFound;
                updateData.epicCompatible = epicValidation.isValid;
            }

            const sanitizedData = firestoreUtils.sanitizeData({
                ...updateData,
                lastModified: new Date(),
                updatedAt: serverTimestamp(),
            });

            const docRef = doc(db, COLLECTIONS.TEMPLATES, templateId);
            await updateDoc(docRef, sanitizedData);

            // Get the updated template
            const updatedTemplate = await this.getTemplateById(templateId);
            if (!updatedTemplate) {
                throw new Error('Failed to retrieve updated template');
            }

            // Create audit log
            await createAuditLog(
                'TEMPLATE_UPDATED',
                { templateId, fields: Object.keys(updateData) },
                userId
            );

            return updatedTemplate;

        } catch (error) {
            console.error('Error updating template:', error);
            throw handleFirebaseError(error);
        }
    }

    // Delete a template
    async deleteTemplate(templateId: string, userId: string): Promise<void> {
        try {
            const docRef = doc(db, COLLECTIONS.TEMPLATES, templateId);
            await deleteDoc(docRef);

            // Create audit log
            await createAuditLog(
                'TEMPLATE_DELETED',
                { templateId },
                userId
            );

        } catch (error) {
            console.error('Error deleting template:', error);
            throw handleFirebaseError(error);
        }
    }

    // List templates with filtering and pagination
    async listTemplates(
        filters: TemplateSearchFilters = {},
        lastDoc?: DocumentSnapshot
    ): Promise<TemplateListResult> {
        try {
            let q = collection(db, COLLECTIONS.TEMPLATES);
            const constraints: any[] = [];

            // Apply filters
            if (filters.category) {
                constraints.push(where('category', '==', filters.category));
            }

            if (filters.epicCompatible !== undefined) {
                constraints.push(where('epicCompatible', '==', filters.epicCompatible));
            }

            if (filters.createdBy) {
                constraints.push(where('createdBy', '==', filters.createdBy));
            }

            // Sorting
            const sortBy = filters.sortBy || 'lastModified';
            const sortOrder = filters.sortOrder || 'desc';

            let orderByField = sortBy;
            if (sortBy === 'usage') {
                orderByField = 'usage.timesUsed';
            }

            constraints.push(orderBy(orderByField, sortOrder));

            // Pagination
            const pageLimit = Math.min(filters.limit || 25, 100);
            constraints.push(limit(pageLimit));

            if (lastDoc) {
                constraints.push(startAfter(lastDoc));
            }

            // Build and execute query
            const finalQuery = query(q, ...constraints);
            const querySnapshot = await getDocs(finalQuery);

            // Convert documents to templates
            let templates: NoteTemplate[] = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...firestoreUtils.convertTimestamps(doc.data()),
            })) as NoteTemplate[];

            // Apply client-side text search if specified
            if (filters.searchTerm) {
                const searchTerm = filters.searchTerm.toLowerCase();
                templates = templates.filter(template =>
                    template.name.toLowerCase().includes(searchTerm) ||
                    template.content.toLowerCase().includes(searchTerm) ||
                    template.category.toLowerCase().includes(searchTerm)
                );
            }

            return {
                templates,
                totalCount: templates.length,
                hasMore: querySnapshot.docs.length === pageLimit,
                lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1],
            };

        } catch (error) {
            console.error('Error listing templates:', error);
            throw handleFirebaseError(error);
        }
    }

    // Record template usage
    async recordUsage(templateId: string, userId: string): Promise<void> {
        try {
            const docRef = doc(db, COLLECTIONS.TEMPLATES, templateId);

            await updateDoc(docRef, {
                'usage.timesUsed': increment(1),
                'usage.lastUsed': serverTimestamp(),
                lastModified: serverTimestamp(),
            });

            // Create audit log
            await createAuditLog(
                'TEMPLATE_USED',
                { templateId },
                userId
            );

        } catch (error) {
            console.error('Error recording template usage:', error);
            throw handleFirebaseError(error);
        }
    }

    // Rate a template
    async rateTemplate(
        templateId: string,
        rating: number,
        userId: string,
        comment?: string
    ): Promise<void> {
        try {
            if (rating < 1 || rating > 10) {
                throw new Error('Rating must be between 1 and 10');
            }

            // Get current template to update average rating
            const template = await this.getTemplateById(templateId);
            if (!template) {
                throw new Error('Template not found');
            }

            // Calculate new average rating
            const userRatings = template.usage?.userRatings || [];
            const existingRatingIndex = userRatings.findIndex(r => r.userId === userId);

            if (existingRatingIndex >= 0) {
                // Update existing rating
                userRatings[existingRatingIndex] = {
                    userId,
                    rating,
                    timestamp: new Date(),
                    comment,
                };
            } else {
                // Add new rating
                userRatings.push({
                    userId,
                    rating,
                    timestamp: new Date(),
                    comment,
                });
            }

            // Calculate new average
            const avgRating = userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length;

            const docRef = doc(db, COLLECTIONS.TEMPLATES, templateId);
            await updateDoc(docRef, {
                'usage.userRatings': userRatings,
                'usage.avgRating': Math.round(avgRating * 10) / 10, // Round to 1 decimal
                lastModified: serverTimestamp(),
            });

            // Create audit log
            await createAuditLog(
                'TEMPLATE_RATED',
                { templateId, rating, comment: !!comment },
                userId
            );

        } catch (error) {
            console.error('Error rating template:', error);
            throw handleFirebaseError(error);
        }
    }

    // Get popular templates
    async getPopularTemplates(limit = 10): Promise<NoteTemplate[]> {
        const result = await this.listTemplates({
            sortBy: 'usage',
            sortOrder: 'desc',
            limit,
        });

        return result.templates.filter(t => t.usage && t.usage.timesUsed > 0);
    }

    // Get templates by category
    async getTemplatesByCategory(category: NoteTemplate['category'], limit = 20): Promise<NoteTemplate[]> {
        const result = await this.listTemplates({
            category,
            sortBy: 'lastModified',
            sortOrder: 'desc',
            limit,
        });

        return result.templates;
    }

    // Validate Epic syntax in template content
    private validateEpicSyntax(content: string): {
        isValid: boolean;
        smartPhrasesFound: string[];
        dotPhrasesFound: string[];
        placeholdersFound: string[];
        issues: string[];
    } {
        const smartPhrases = content.match(/@[A-Z][A-Z0-9_]*@/g) || [];
        const dotPhrases = content.match(/\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*/g) || [];
        const placeholders = content.match(/\*\*\*[^*]*\*\*\*/g) || [];

        const issues: string[] = [];

        // Check for malformed SmartPhrases
        const malformedSmart = content.match(/@[^@]*[a-z][^@]*@/g) || [];
        malformedSmart.forEach(phrase => {
            if (!smartPhrases.includes(phrase)) {
                issues.push(`Malformed SmartPhrase: ${phrase} (should be all uppercase)`);
            }
        });

        // Check for malformed DotPhrases
        const malformedDot = content.match(/\.[A-Z][^.\s]*(?:\.[A-Z][^.\s]*)*/g) || [];
        malformedDot.forEach(phrase => {
            if (!dotPhrases.includes(phrase)) {
                issues.push(`Malformed DotPhrase: ${phrase} (should be all lowercase)`);
            }
        });

        // Check for incomplete placeholders
        const incompletePlaceholders = content.match(/\*{1,2}[^*]+\*{1,2}(?!\*)/g) || [];
        incompletePlaceholders.forEach(phrase => {
            issues.push(`Incomplete placeholder: ${phrase} (should use triple asterisks)`);
        });

        return {
            isValid: issues.length === 0,
            smartPhrasesFound: smartPhrases.map(s => s.slice(1, -1)), // Remove @ symbols
            dotPhrasesFound: dotPhrases.map(s => s.substring(1)), // Remove leading .
            placeholdersFound: placeholders.map(s => s.slice(3, -3)), // Remove *** wrapper
            issues,
        };
    }

    // Get template analytics
    async getTemplateAnalytics(): Promise<{
        totalTemplates: number;
        templatesByCategory: Record<string, number>;
        averageRating: number;
        mostUsedTemplates: { name: string; timesUsed: number }[];
        epicCompatibilityRate: number;
    }> {
        try {
            const result = await this.listTemplates({ limit: 1000 }); // Get all templates
            const templates = result.templates;

            const templatesByCategory: Record<string, number> = {};
            let totalRating = 0;
            let templatesWithRating = 0;
            let epicCompatibleCount = 0;

            templates.forEach(template => {
                // Category distribution
                templatesByCategory[template.category] = (templatesByCategory[template.category] || 0) + 1;

                // Average rating
                if (template.usage?.avgRating && template.usage.avgRating > 0) {
                    totalRating += template.usage.avgRating;
                    templatesWithRating++;
                }

                // Epic compatibility
                if (template.epicCompatible) {
                    epicCompatibleCount++;
                }
            });

            // Most used templates
            const mostUsedTemplates = templates
                .filter(t => t.usage && t.usage.timesUsed > 0)
                .sort((a, b) => (b.usage?.timesUsed || 0) - (a.usage?.timesUsed || 0))
                .slice(0, 10)
                .map(t => ({
                    name: t.name,
                    timesUsed: t.usage?.timesUsed || 0,
                }));

            return {
                totalTemplates: templates.length,
                templatesByCategory,
                averageRating: templatesWithRating > 0 ? Math.round((totalRating / templatesWithRating) * 10) / 10 : 0,
                mostUsedTemplates,
                epicCompatibilityRate: templates.length > 0 ? Math.round((epicCompatibleCount / templates.length) * 100) / 100 : 0,
            };

        } catch (error) {
            console.error('Error getting template analytics:', error);
            throw handleFirebaseError(error);
        }
    }
}

// SmartPhrase management
export class SmartPhraseService {
    private static instance: SmartPhraseService;

    static getInstance(): SmartPhraseService {
        if (!SmartPhraseService.instance) {
            SmartPhraseService.instance = new SmartPhraseService();
        }
        return SmartPhraseService.instance;
    }

    async createSmartPhrase(data: Omit<SmartPhrase, 'id' | 'createdDate' | 'lastModified'>, userId: string): Promise<SmartPhrase> {
        try {
            const smartPhrase = {
                ...data,
                epicSyntax: `@${data.name.toUpperCase()}@`,
                createdDate: new Date(),
                lastModified: new Date(),
                createdBy: userId,
            };

            const docRef = await addDoc(collection(db, COLLECTIONS.SMART_LINKS), firestoreUtils.sanitizeData(smartPhrase));

            const created = await this.getSmartPhraseById(docRef.id);
            if (!created) throw new Error('Failed to retrieve created SmartPhrase');

            await createAuditLog('SMARTPHRASE_CREATED', { id: docRef.id, name: data.name }, userId);
            return created;
        } catch (error) {
            console.error('Error creating SmartPhrase:', error);
            throw handleFirebaseError(error);
        }
    }

    async getSmartPhraseById(id: string): Promise<SmartPhrase | null> {
        try {
            const docRef = doc(db, COLLECTIONS.SMART_LINKS, id);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) return null;

            return {
                id: docSnap.id,
                ...firestoreUtils.convertTimestamps(docSnap.data()),
            } as SmartPhrase;
        } catch (error) {
            console.error('Error getting SmartPhrase:', error);
            throw handleFirebaseError(error);
        }
    }

    async listSmartPhrases(): Promise<SmartPhrase[]> {
        try {
            const q = query(collection(db, COLLECTIONS.SMART_LINKS), orderBy('name'));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...firestoreUtils.convertTimestamps(doc.data()),
            })) as SmartPhrase[];
        } catch (error) {
            console.error('Error listing SmartPhrases:', error);
            throw handleFirebaseError(error);
        }
    }
}

// DotPhrase management
export class DotPhraseService {
    private static instance: DotPhraseService;

    static getInstance(): DotPhraseService {
        if (!DotPhraseService.instance) {
            DotPhraseService.instance = new DotPhraseService();
        }
        return DotPhraseService.instance;
    }

    async createDotPhrase(data: Omit<DotPhrase, 'id' | 'createdDate' | 'lastModified'>, userId: string): Promise<DotPhrase> {
        try {
            const dotPhrase = {
                ...data,
                epicSyntax: `.${data.name.toLowerCase()}`,
                createdDate: new Date(),
                lastModified: new Date(),
                createdBy: userId,
            };

            const docRef = await addDoc(collection(db, COLLECTIONS.DOT_PHRASES), firestoreUtils.sanitizeData(dotPhrase));

            const created = await this.getDotPhraseById(docRef.id);
            if (!created) throw new Error('Failed to retrieve created DotPhrase');

            await createAuditLog('DOTPHRASE_CREATED', { id: docRef.id, name: data.name }, userId);
            return created;
        } catch (error) {
            console.error('Error creating DotPhrase:', error);
            throw handleFirebaseError(error);
        }
    }

    async getDotPhraseById(id: string): Promise<DotPhrase | null> {
        try {
            const docRef = doc(db, COLLECTIONS.DOT_PHRASES, id);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) return null;

            return {
                id: docSnap.id,
                ...firestoreUtils.convertTimestamps(docSnap.data()),
            } as DotPhrase;
        } catch (error) {
            console.error('Error getting DotPhrase:', error);
            throw handleFirebaseError(error);
        }
    }

    async listDotPhrases(): Promise<DotPhrase[]> {
        try {
            const q = query(collection(db, COLLECTIONS.DOT_PHRASES), orderBy('name'));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...firestoreUtils.convertTimestamps(doc.data()),
            })) as DotPhrase[];
        } catch (error) {
            console.error('Error listing DotPhrases:', error);
            throw handleFirebaseError(error);
        }
    }
}

// Export singleton instances
export const templateService = TemplateService.getInstance();
export const smartPhraseService = SmartPhraseService.getInstance();
export const dotPhraseService = DotPhraseService.getInstance();