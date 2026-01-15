/**
 * ArchiMate Relationship Validation
 * Based on ArchiMate 3.2 Specification Appendix B
 *
 * This module validates whether a relationship type is permitted between
 * two element types according to the ArchiMate specification.
 */
import { MotivationElementTypes, StrategyElementTypes, BusinessElementTypes, ApplicationElementTypes, TechnologyElementTypes, ImplementationElementTypes, CompositeElementTypes, getLayerForElementType, } from '../model/types.js';
/**
 * Classify an element type into its category
 */
function getElementCategory(elementType) {
    // Active Structure Elements (internal)
    const activeStructure = [
        'BusinessActor', 'BusinessRole', 'BusinessCollaboration',
        'ApplicationComponent', 'ApplicationCollaboration',
        'Node', 'Device', 'SystemSoftware', 'TechnologyCollaboration',
        'Equipment', 'Facility',
    ];
    // External Active Structure (Interfaces)
    const interfaces = [
        'BusinessInterface', 'ApplicationInterface', 'TechnologyInterface',
    ];
    // Internal Behavior Elements
    const behaviorInternal = [
        'BusinessProcess', 'BusinessFunction', 'BusinessInteraction',
        'ApplicationFunction', 'ApplicationInteraction', 'ApplicationProcess',
        'TechnologyFunction', 'TechnologyProcess', 'TechnologyInteraction',
    ];
    // External Behavior Elements (Services)
    const services = [
        'BusinessService', 'ApplicationService', 'TechnologyService',
    ];
    // Event Elements
    const events = [
        'BusinessEvent', 'ApplicationEvent', 'TechnologyEvent', 'ImplementationEvent',
    ];
    // Passive Structure Elements
    const passiveStructure = [
        'BusinessObject', 'Contract', 'Representation',
        'DataObject', 'Artifact', 'Material',
    ];
    // Strategy Elements
    const strategy = [
        'Resource', 'Capability', 'ValueStream', 'CourseOfAction',
    ];
    // Motivation Elements
    const motivation = [
        'Stakeholder', 'Driver', 'Assessment', 'Goal', 'Outcome',
        'Principle', 'Requirement', 'Constraint', 'Meaning', 'Value',
    ];
    // Implementation & Migration
    const implMigration = [
        'WorkPackage', 'Deliverable', 'Plateau', 'Gap',
    ];
    // Composite
    const composite = [
        'Grouping', 'Location', 'Product',
    ];
    if (activeStructure.includes(elementType) || interfaces.includes(elementType))
        return 'ActiveStructure';
    if (behaviorInternal.includes(elementType))
        return 'BehaviorInternal';
    if (services.includes(elementType))
        return 'BehaviorExternal';
    if (events.includes(elementType))
        return 'Event';
    if (passiveStructure.includes(elementType))
        return 'PassiveStructure';
    if (strategy.includes(elementType))
        return 'Strategy';
    if (motivation.includes(elementType))
        return 'Motivation';
    if (implMigration.includes(elementType))
        return 'ImplementationMigration';
    if (composite.includes(elementType))
        return 'Composite';
    return 'Composite'; // Default fallback
}
/**
 * Check if elements are in the same layer
 */
function isSameLayer(sourceType, targetType) {
    return getLayerForElementType(sourceType) === getLayerForElementType(targetType);
}
/**
 * Get the layer hierarchy level (higher number = lower in stack)
 */
function getLayerLevel(layer) {
    const levels = {
        'Motivation': 0,
        'Strategy': 1,
        'Business': 2,
        'Application': 3,
        'Technology': 4,
        'Physical': 4,
        'Implementation': 5,
        'Composite': 6,
    };
    return levels[layer];
}
/**
 * Check if a relationship is valid between two element types
 */
export function isValidRelationship(sourceType, targetType, relationshipType) {
    const sourceCategory = getElementCategory(sourceType);
    const targetCategory = getElementCategory(targetType);
    const sourceLayer = getLayerForElementType(sourceType);
    const targetLayer = getLayerForElementType(targetType);
    // Special rules for specific relationship types
    switch (relationshipType) {
        case 'Composition':
        case 'Aggregation':
            // Generally allowed within same type or related types
            // Must be same layer or composite elements
            if (sourceType === targetType)
                return true;
            if (sourceCategory === 'Composite' || targetCategory === 'Composite')
                return true;
            if (isSameLayer(sourceType, targetType))
                return true;
            return false;
        case 'Specialization':
            // Must be same element type
            return sourceType === targetType;
        case 'Assignment':
            // Active structure to behavior, or behavior to passive structure
            return ((sourceCategory === 'ActiveStructure' && (targetCategory === 'BehaviorInternal' || targetCategory === 'BehaviorExternal')) ||
                (sourceCategory === 'BehaviorInternal' && targetCategory === 'PassiveStructure') ||
                // Work packages can be assigned to business roles
                (sourceType === 'WorkPackage' && sourceCategory === 'ActiveStructure'));
        case 'Realization':
            // Lower layer elements realize higher layer elements
            // Or behavior realizes services
            if (sourceCategory === 'BehaviorInternal' && targetCategory === 'BehaviorExternal')
                return true;
            if (getLayerLevel(sourceLayer) > getLayerLevel(targetLayer))
                return true;
            // Strategy elements are realized by core elements
            if (targetCategory === 'Strategy')
                return true;
            // Motivation elements can be realized
            if (targetCategory === 'Motivation')
                return true;
            // Artifacts realize application/data
            if (sourceType === 'Artifact')
                return true;
            return false;
        case 'Serving':
            // Services serve other elements
            // Higher layer elements serve lower layer elements
            if (sourceCategory === 'BehaviorExternal')
                return true;
            if (sourceCategory === 'ActiveStructure' && targetCategory === 'ActiveStructure')
                return true;
            if (getLayerLevel(sourceLayer) > getLayerLevel(targetLayer))
                return true;
            // Capabilities serve value streams
            if (sourceType === 'Capability' && targetType === 'ValueStream')
                return true;
            return isSameLayer(sourceType, targetType);
        case 'Access':
            // Behavior accesses passive structure
            return ((sourceCategory === 'BehaviorInternal' || sourceCategory === 'BehaviorExternal' || sourceCategory === 'Event') &&
                (targetCategory === 'PassiveStructure'));
        case 'Influence':
            // Motivation elements influence each other
            // Other elements can influence motivation elements
            // Any element can influence motivation elements
            return targetCategory === 'Motivation';
        case 'Triggering':
            // Events trigger behavior, behavior triggers behavior
            return (sourceCategory === 'Event' ||
                sourceCategory === 'BehaviorInternal' ||
                sourceCategory === 'BehaviorExternal' ||
                targetCategory === 'Event' ||
                targetCategory === 'BehaviorInternal' ||
                targetCategory === 'BehaviorExternal' ||
                sourceCategory === 'ImplementationMigration' ||
                targetCategory === 'ImplementationMigration');
        case 'Flow':
            // Between behavior elements or passive structure
            return (sourceCategory === 'BehaviorInternal' ||
                sourceCategory === 'BehaviorExternal' ||
                sourceCategory === 'Event' ||
                targetCategory === 'BehaviorInternal' ||
                targetCategory === 'BehaviorExternal' ||
                targetCategory === 'Event' ||
                sourceCategory === 'PassiveStructure' ||
                targetCategory === 'PassiveStructure');
        case 'Association':
            // Association is allowed between almost any elements
            return true;
        default:
            return false;
    }
}
/**
 * Get all valid relationship types between two element types
 */
export function getValidRelationshipTypes(sourceType, targetType) {
    const allTypes = [
        'Composition', 'Aggregation', 'Assignment', 'Realization',
        'Serving', 'Access', 'Influence', 'Association',
        'Triggering', 'Flow', 'Specialization',
    ];
    return allTypes.filter(relType => isValidRelationship(sourceType, targetType, relType));
}
/**
 * Get all valid target element types for a relationship from a source type
 */
export function getValidTargetTypes(sourceType, relationshipType) {
    const allTypes = [
        ...MotivationElementTypes,
        ...StrategyElementTypes,
        ...BusinessElementTypes,
        ...ApplicationElementTypes,
        ...TechnologyElementTypes,
        ...ImplementationElementTypes,
        ...CompositeElementTypes,
    ];
    return allTypes.filter(targetType => isValidRelationship(sourceType, targetType, relationshipType));
}
/**
 * Validate a relationship and return an error message if invalid
 */
export function validateRelationship(sourceType, targetType, relationshipType) {
    if (isValidRelationship(sourceType, targetType, relationshipType)) {
        return { valid: true };
    }
    const validTypes = getValidRelationshipTypes(sourceType, targetType);
    if (validTypes.length === 0) {
        return {
            valid: false,
            error: `No valid relationships exist between ${sourceType} and ${targetType} in ArchiMate 3.2`,
            suggestions: [],
        };
    }
    return {
        valid: false,
        error: `${relationshipType} is not a valid relationship between ${sourceType} and ${targetType}`,
        suggestions: validTypes,
    };
}
/**
 * Get relationship guidance for LLMs
 */
export function getRelationshipGuidance(sourceType, targetType) {
    const sourceCategory = getElementCategory(sourceType);
    const sourceLayer = getLayerForElementType(sourceType);
    let guidance = `For ${sourceType} (${sourceLayer} layer, ${sourceCategory}):\n\n`;
    if (targetType) {
        const validTypes = getValidRelationshipTypes(sourceType, targetType);
        if (validTypes.length > 0) {
            guidance += `Valid relationships to ${targetType}: ${validTypes.join(', ')}\n`;
        }
        else {
            guidance += `No valid direct relationships to ${targetType}\n`;
        }
    }
    else {
        // General guidance
        guidance += `Common relationships:\n`;
        if (sourceCategory === 'ActiveStructure') {
            guidance += `- Assignment: to behavior elements (processes, functions)\n`;
            guidance += `- Composition/Aggregation: to other ${sourceLayer} active structure elements\n`;
            guidance += `- Serving: to other active structure or behavior elements\n`;
        }
        if (sourceCategory === 'BehaviorInternal') {
            guidance += `- Realization: to services (external behavior)\n`;
            guidance += `- Access: to passive structure elements (objects, artifacts)\n`;
            guidance += `- Triggering: to other behavior elements or events\n`;
            guidance += `- Flow: to other behavior elements\n`;
        }
        if (sourceCategory === 'BehaviorExternal') {
            guidance += `- Serving: to higher-layer elements\n`;
            guidance += `- Access: to passive structure elements\n`;
        }
        if (sourceCategory === 'Motivation') {
            guidance += `- Influence: to other motivation elements\n`;
            guidance += `- Realization: from core elements\n`;
            guidance += `- Association: to stakeholders, drivers\n`;
        }
    }
    return guidance;
}
//# sourceMappingURL=validation.js.map