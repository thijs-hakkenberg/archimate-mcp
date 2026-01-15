/**
 * ArchiMate Relationship Validation
 * Based on ArchiMate 3.2 Specification Appendix B
 *
 * This module validates whether a relationship type is permitted between
 * two element types according to the ArchiMate specification.
 */
import { ElementType, RelationshipType } from '../model/types.js';
/**
 * Check if a relationship is valid between two element types
 */
export declare function isValidRelationship(sourceType: ElementType, targetType: ElementType, relationshipType: RelationshipType): boolean;
/**
 * Get all valid relationship types between two element types
 */
export declare function getValidRelationshipTypes(sourceType: ElementType, targetType: ElementType): RelationshipType[];
/**
 * Get all valid target element types for a relationship from a source type
 */
export declare function getValidTargetTypes(sourceType: ElementType, relationshipType: RelationshipType): ElementType[];
/**
 * Validate a relationship and return an error message if invalid
 */
export declare function validateRelationship(sourceType: ElementType, targetType: ElementType, relationshipType: RelationshipType): {
    valid: boolean;
    error?: string;
    suggestions?: RelationshipType[];
};
/**
 * Get relationship guidance for LLMs
 */
export declare function getRelationshipGuidance(sourceType: ElementType, targetType?: ElementType): string;
//# sourceMappingURL=validation.d.ts.map