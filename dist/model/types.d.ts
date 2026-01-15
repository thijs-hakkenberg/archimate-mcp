/**
 * ArchiMate 3.2 Type Definitions
 * Organized by specification chapter structure
 */
export declare const MotivationElementTypes: readonly ["Stakeholder", "Driver", "Assessment", "Goal", "Outcome", "Principle", "Requirement", "Constraint", "Meaning", "Value"];
export type MotivationElementType = typeof MotivationElementTypes[number];
export declare const StrategyElementTypes: readonly ["Resource", "Capability", "ValueStream", "CourseOfAction"];
export type StrategyElementType = typeof StrategyElementTypes[number];
export declare const BusinessElementTypes: readonly ["BusinessActor", "BusinessRole", "BusinessCollaboration", "BusinessInterface", "BusinessProcess", "BusinessFunction", "BusinessInteraction", "BusinessEvent", "BusinessService", "BusinessObject", "Contract", "Representation", "Product"];
export type BusinessElementType = typeof BusinessElementTypes[number];
export declare const ApplicationElementTypes: readonly ["ApplicationComponent", "ApplicationCollaboration", "ApplicationInterface", "ApplicationFunction", "ApplicationInteraction", "ApplicationProcess", "ApplicationEvent", "ApplicationService", "DataObject"];
export type ApplicationElementType = typeof ApplicationElementTypes[number];
export declare const TechnologyElementTypes: readonly ["Node", "Device", "SystemSoftware", "TechnologyCollaboration", "TechnologyInterface", "Path", "CommunicationNetwork", "TechnologyFunction", "TechnologyProcess", "TechnologyInteraction", "TechnologyEvent", "TechnologyService", "Artifact", "Equipment", "Facility", "DistributionNetwork", "Material"];
export type TechnologyElementType = typeof TechnologyElementTypes[number];
export declare const ImplementationElementTypes: readonly ["WorkPackage", "Deliverable", "ImplementationEvent", "Plateau", "Gap"];
export type ImplementationElementType = typeof ImplementationElementTypes[number];
export declare const CompositeElementTypes: readonly ["Grouping", "Location"];
export type CompositeElementType = typeof CompositeElementTypes[number];
export declare const AllElementTypes: readonly ["Stakeholder", "Driver", "Assessment", "Goal", "Outcome", "Principle", "Requirement", "Constraint", "Meaning", "Value", "Resource", "Capability", "ValueStream", "CourseOfAction", "BusinessActor", "BusinessRole", "BusinessCollaboration", "BusinessInterface", "BusinessProcess", "BusinessFunction", "BusinessInteraction", "BusinessEvent", "BusinessService", "BusinessObject", "Contract", "Representation", "Product", "ApplicationComponent", "ApplicationCollaboration", "ApplicationInterface", "ApplicationFunction", "ApplicationInteraction", "ApplicationProcess", "ApplicationEvent", "ApplicationService", "DataObject", "Node", "Device", "SystemSoftware", "TechnologyCollaboration", "TechnologyInterface", "Path", "CommunicationNetwork", "TechnologyFunction", "TechnologyProcess", "TechnologyInteraction", "TechnologyEvent", "TechnologyService", "Artifact", "Equipment", "Facility", "DistributionNetwork", "Material", "WorkPackage", "Deliverable", "ImplementationEvent", "Plateau", "Gap", "Grouping", "Location"];
export type ElementType = typeof AllElementTypes[number];
export declare const RelationshipTypes: readonly ["Composition", "Aggregation", "Assignment", "Realization", "Serving", "Access", "Influence", "Association", "Triggering", "Flow", "Specialization"];
export type RelationshipType = typeof RelationshipTypes[number];
export declare const AccessTypes: readonly ["Read", "Write", "ReadWrite"];
export type AccessType = typeof AccessTypes[number];
export declare const InfluenceModifiers: readonly ["++", "+", "0", "-", "--"];
export type InfluenceModifier = typeof InfluenceModifiers[number];
export type Layer = 'Motivation' | 'Strategy' | 'Business' | 'Application' | 'Technology' | 'Physical' | 'Implementation' | 'Composite';
export declare const LayerFolderTypes: {
    readonly Motivation: "motivation";
    readonly Strategy: "strategy";
    readonly Business: "business";
    readonly Application: "application";
    readonly Technology: "technology";
    readonly Physical: "technology";
    readonly Implementation: "implementation_migration";
    readonly Composite: "other";
};
export declare function getLayerForElementType(elementType: ElementType): Layer;
export interface ArchiMateProperty {
    key: string;
    value: string;
}
export interface ArchiMateElement {
    id: string;
    type: ElementType;
    name: string;
    documentation?: string;
    properties?: ArchiMateProperty[];
}
export interface ArchiMateRelationship {
    id: string;
    type: RelationshipType;
    sourceId: string;
    targetId: string;
    name?: string;
    documentation?: string;
    accessType?: AccessType;
    influenceModifier?: InfluenceModifier;
    properties?: ArchiMateProperty[];
}
export interface DiagramBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface DiagramBendpoint {
    x: number;
    y: number;
}
export interface DiagramConnection {
    id: string;
    sourceId: string;
    targetId: string;
    relationshipId: string;
    bendpoints?: DiagramBendpoint[];
}
export interface DiagramObject {
    id: string;
    elementId: string;
    bounds: DiagramBounds;
    sourceConnections?: DiagramConnection[];
    targetConnectionIds?: string[];
    children?: DiagramObject[];
}
export interface ArchiMateDiagram {
    id: string;
    name: string;
    viewpoint?: string;
    documentation?: string;
    objects: DiagramObject[];
}
export interface ArchiMateFolder {
    id: string;
    name: string;
    type: string;
    elements: ArchiMateElement[];
    subfolders: ArchiMateFolder[];
}
export interface ArchiMateModel {
    id: string;
    name: string;
    version: string;
    documentation?: string;
    folders: ArchiMateFolder[];
    relationships: ArchiMateRelationship[];
    diagrams: ArchiMateDiagram[];
}
export declare const XmlTypeToElementType: Record<string, ElementType>;
export declare const ElementTypeToXmlType: Record<ElementType, string>;
export declare const XmlTypeToRelationshipType: Record<string, RelationshipType>;
export declare const RelationshipTypeToXmlType: Record<RelationshipType, string>;
export declare const ElementDescriptions: Record<ElementType, string>;
export declare const RelationshipDescriptions: Record<RelationshipType, string>;
//# sourceMappingURL=types.d.ts.map