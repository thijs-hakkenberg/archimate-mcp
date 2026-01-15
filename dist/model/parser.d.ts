/**
 * ArchiMate Model XML Parser
 * Parses model.archimate files from coArchi2 repositories
 */
import { ArchiMateModel, ArchiMateFolder, ArchiMateElement, ArchiMateRelationship, ElementType } from './types.js';
export declare function parseModel(modelPath: string): Promise<ArchiMateModel>;
/**
 * Enhanced parser that also extracts relationships properly
 */
export declare function parseModelComplete(modelPath: string): Promise<ArchiMateModel>;
/**
 * Find all elements in a model
 */
export declare function getAllElements(model: ArchiMateModel): ArchiMateElement[];
/**
 * Find an element by ID
 */
export declare function getElementById(model: ArchiMateModel, id: string): ArchiMateElement | undefined;
/**
 * Find elements by type
 */
export declare function getElementsByType(model: ArchiMateModel, type: ElementType): ArchiMateElement[];
/**
 * Find elements by name pattern
 */
export declare function findElementsByName(model: ArchiMateModel, pattern: string): ArchiMateElement[];
/**
 * Get relationships for an element
 */
export declare function getRelationshipsForElement(model: ArchiMateModel, elementId: string, direction?: 'incoming' | 'outgoing' | 'both'): ArchiMateRelationship[];
/**
 * Get folder by type
 */
export declare function getFolderByType(model: ArchiMateModel, type: string): ArchiMateFolder | undefined;
//# sourceMappingURL=parser.d.ts.map