/**
 * ArchiMate 3.2 Type Definitions
 * Organized by specification chapter structure
 */
// =============================================================================
// Chapter 6: Motivation Elements
// =============================================================================
export const MotivationElementTypes = [
    'Stakeholder',
    'Driver',
    'Assessment',
    'Goal',
    'Outcome',
    'Principle',
    'Requirement',
    'Constraint',
    'Meaning',
    'Value',
];
// =============================================================================
// Chapter 7: Strategy Layer
// =============================================================================
export const StrategyElementTypes = [
    'Resource',
    'Capability',
    'ValueStream',
    'CourseOfAction',
];
// =============================================================================
// Chapter 8: Business Layer
// =============================================================================
export const BusinessElementTypes = [
    // Active Structure
    'BusinessActor',
    'BusinessRole',
    'BusinessCollaboration',
    'BusinessInterface',
    // Behavior
    'BusinessProcess',
    'BusinessFunction',
    'BusinessInteraction',
    'BusinessEvent',
    'BusinessService',
    // Passive Structure
    'BusinessObject',
    'Contract',
    'Representation',
    // Composite
    'Product',
];
// =============================================================================
// Chapter 9: Application Layer
// =============================================================================
export const ApplicationElementTypes = [
    // Active Structure
    'ApplicationComponent',
    'ApplicationCollaboration',
    'ApplicationInterface',
    // Behavior
    'ApplicationFunction',
    'ApplicationInteraction',
    'ApplicationProcess',
    'ApplicationEvent',
    'ApplicationService',
    // Passive Structure
    'DataObject',
];
// =============================================================================
// Chapter 10: Technology Layer (including Physical)
// =============================================================================
export const TechnologyElementTypes = [
    // Active Structure
    'Node',
    'Device',
    'SystemSoftware',
    'TechnologyCollaboration',
    'TechnologyInterface',
    'Path',
    'CommunicationNetwork',
    // Behavior
    'TechnologyFunction',
    'TechnologyProcess',
    'TechnologyInteraction',
    'TechnologyEvent',
    'TechnologyService',
    // Passive Structure
    'Artifact',
    // Physical Active Structure
    'Equipment',
    'Facility',
    'DistributionNetwork',
    // Physical Passive Structure
    'Material',
];
// =============================================================================
// Chapter 12: Implementation & Migration Layer
// =============================================================================
export const ImplementationElementTypes = [
    'WorkPackage',
    'Deliverable',
    'ImplementationEvent',
    'Plateau',
    'Gap',
];
// =============================================================================
// Chapter 4: Composite Elements
// =============================================================================
export const CompositeElementTypes = [
    'Grouping',
    'Location',
];
// =============================================================================
// All Element Types Combined
// =============================================================================
export const AllElementTypes = [
    ...MotivationElementTypes,
    ...StrategyElementTypes,
    ...BusinessElementTypes,
    ...ApplicationElementTypes,
    ...TechnologyElementTypes,
    ...ImplementationElementTypes,
    ...CompositeElementTypes,
];
// =============================================================================
// Chapter 5: Relationships
// =============================================================================
export const RelationshipTypes = [
    // Structural
    'Composition',
    'Aggregation',
    'Assignment',
    'Realization',
    // Dependency
    'Serving',
    'Access',
    'Influence',
    'Association',
    // Dynamic
    'Triggering',
    'Flow',
    // Other
    'Specialization',
];
export const AccessTypes = ['Read', 'Write', 'ReadWrite'];
export const InfluenceModifiers = ['++', '+', '0', '-', '--'];
export const LayerFolderTypes = {
    Motivation: 'motivation',
    Strategy: 'strategy',
    Business: 'business',
    Application: 'application',
    Technology: 'technology',
    Physical: 'technology', // Physical is part of Technology folder
    Implementation: 'implementation_migration',
    Composite: 'other',
};
export function getLayerForElementType(elementType) {
    if (MotivationElementTypes.includes(elementType)) {
        return 'Motivation';
    }
    if (StrategyElementTypes.includes(elementType)) {
        return 'Strategy';
    }
    if (BusinessElementTypes.includes(elementType)) {
        return 'Business';
    }
    if (ApplicationElementTypes.includes(elementType)) {
        return 'Application';
    }
    if (TechnologyElementTypes.includes(elementType)) {
        // Check if it's a physical element
        const physicalTypes = ['Equipment', 'Facility', 'DistributionNetwork', 'Material'];
        if (physicalTypes.includes(elementType)) {
            return 'Physical';
        }
        return 'Technology';
    }
    if (ImplementationElementTypes.includes(elementType)) {
        return 'Implementation';
    }
    if (CompositeElementTypes.includes(elementType)) {
        return 'Composite';
    }
    throw new Error(`Unknown element type: ${elementType}`);
}
// =============================================================================
// XML Type Mapping (for parser/writer)
// =============================================================================
export const XmlTypeToElementType = {
    // Motivation
    'archimate:Stakeholder': 'Stakeholder',
    'archimate:Driver': 'Driver',
    'archimate:Assessment': 'Assessment',
    'archimate:Goal': 'Goal',
    'archimate:Outcome': 'Outcome',
    'archimate:Principle': 'Principle',
    'archimate:Requirement': 'Requirement',
    'archimate:Constraint': 'Constraint',
    'archimate:Meaning': 'Meaning',
    'archimate:Value': 'Value',
    // Strategy
    'archimate:Resource': 'Resource',
    'archimate:Capability': 'Capability',
    'archimate:ValueStream': 'ValueStream',
    'archimate:CourseOfAction': 'CourseOfAction',
    // Business
    'archimate:BusinessActor': 'BusinessActor',
    'archimate:BusinessRole': 'BusinessRole',
    'archimate:BusinessCollaboration': 'BusinessCollaboration',
    'archimate:BusinessInterface': 'BusinessInterface',
    'archimate:BusinessProcess': 'BusinessProcess',
    'archimate:BusinessFunction': 'BusinessFunction',
    'archimate:BusinessInteraction': 'BusinessInteraction',
    'archimate:BusinessEvent': 'BusinessEvent',
    'archimate:BusinessService': 'BusinessService',
    'archimate:BusinessObject': 'BusinessObject',
    'archimate:Contract': 'Contract',
    'archimate:Representation': 'Representation',
    'archimate:Product': 'Product',
    // Application
    'archimate:ApplicationComponent': 'ApplicationComponent',
    'archimate:ApplicationCollaboration': 'ApplicationCollaboration',
    'archimate:ApplicationInterface': 'ApplicationInterface',
    'archimate:ApplicationFunction': 'ApplicationFunction',
    'archimate:ApplicationInteraction': 'ApplicationInteraction',
    'archimate:ApplicationProcess': 'ApplicationProcess',
    'archimate:ApplicationEvent': 'ApplicationEvent',
    'archimate:ApplicationService': 'ApplicationService',
    'archimate:DataObject': 'DataObject',
    // Technology
    'archimate:Node': 'Node',
    'archimate:Device': 'Device',
    'archimate:SystemSoftware': 'SystemSoftware',
    'archimate:TechnologyCollaboration': 'TechnologyCollaboration',
    'archimate:TechnologyInterface': 'TechnologyInterface',
    'archimate:Path': 'Path',
    'archimate:CommunicationNetwork': 'CommunicationNetwork',
    'archimate:TechnologyFunction': 'TechnologyFunction',
    'archimate:TechnologyProcess': 'TechnologyProcess',
    'archimate:TechnologyInteraction': 'TechnologyInteraction',
    'archimate:TechnologyEvent': 'TechnologyEvent',
    'archimate:TechnologyService': 'TechnologyService',
    'archimate:Artifact': 'Artifact',
    // Physical
    'archimate:Equipment': 'Equipment',
    'archimate:Facility': 'Facility',
    'archimate:DistributionNetwork': 'DistributionNetwork',
    'archimate:Material': 'Material',
    // Implementation & Migration
    'archimate:WorkPackage': 'WorkPackage',
    'archimate:Deliverable': 'Deliverable',
    'archimate:ImplementationEvent': 'ImplementationEvent',
    'archimate:Plateau': 'Plateau',
    'archimate:Gap': 'Gap',
    // Composite
    'archimate:Grouping': 'Grouping',
    'archimate:Location': 'Location',
};
export const ElementTypeToXmlType = Object.fromEntries(Object.entries(XmlTypeToElementType).map(([xml, elem]) => [elem, xml]));
export const XmlTypeToRelationshipType = {
    'archimate:CompositionRelationship': 'Composition',
    'archimate:AggregationRelationship': 'Aggregation',
    'archimate:AssignmentRelationship': 'Assignment',
    'archimate:RealizationRelationship': 'Realization',
    'archimate:ServingRelationship': 'Serving',
    'archimate:AccessRelationship': 'Access',
    'archimate:InfluenceRelationship': 'Influence',
    'archimate:AssociationRelationship': 'Association',
    'archimate:TriggeringRelationship': 'Triggering',
    'archimate:FlowRelationship': 'Flow',
    'archimate:SpecializationRelationship': 'Specialization',
};
export const RelationshipTypeToXmlType = Object.fromEntries(Object.entries(XmlTypeToRelationshipType).map(([xml, rel]) => [rel, xml]));
// =============================================================================
// Element Descriptions (for LLM guidance)
// =============================================================================
export const ElementDescriptions = {
    // Motivation
    Stakeholder: 'Represents the role of an individual, team, or organization that has interests in the architecture',
    Driver: 'Represents an external or internal condition that motivates an organization to define its goals',
    Assessment: 'Represents the result of an analysis of the state of affairs with respect to some driver',
    Goal: 'Represents a high-level statement of intent, direction, or desired end state',
    Outcome: 'Represents an end result, effect, or consequence of a certain state of affairs',
    Principle: 'Represents a statement of intent defining a general property that applies to any system',
    Requirement: 'Represents a statement of need defining a property that applies to a specific system',
    Constraint: 'Represents a limitation on aspects of the architecture, its implementation, or realization',
    Meaning: 'Represents the knowledge or expertise present in, or interpretation given to, a concept',
    Value: 'Represents the relative worth, utility, or importance of a concept',
    // Strategy
    Resource: 'Represents an asset owned or controlled by an individual or organization',
    Capability: 'Represents an ability that an active structure element possesses',
    ValueStream: 'Represents a sequence of activities that create an overall result for a stakeholder',
    CourseOfAction: 'Represents an approach or plan for configuring capabilities and resources',
    // Business
    BusinessActor: 'Represents a business entity that is capable of performing behavior',
    BusinessRole: 'Represents the responsibility for performing specific behavior',
    BusinessCollaboration: 'Represents an aggregate of business elements working together',
    BusinessInterface: 'Represents a point of access where business services are made available',
    BusinessProcess: 'Represents a sequence of business behaviors that achieves a specific result',
    BusinessFunction: 'Represents a collection of business behavior based on specific criteria',
    BusinessInteraction: 'Represents a unit of collective business behavior performed by a collaboration',
    BusinessEvent: 'Represents a business-related state change',
    BusinessService: 'Represents explicitly defined behavior that is exposed to the environment',
    BusinessObject: 'Represents a concept used within a particular business domain',
    Contract: 'Represents a formal or informal specification of an agreement',
    Representation: 'Represents a perceptible form of the information carried by a business object',
    Product: 'Represents a coherent collection of services and/or passive structure elements',
    // Application
    ApplicationComponent: 'Represents an encapsulation of application functionality',
    ApplicationCollaboration: 'Represents an aggregate of application components working together',
    ApplicationInterface: 'Represents a point of access where application services are made available',
    ApplicationFunction: 'Represents automated behavior that can be performed by an application component',
    ApplicationInteraction: 'Represents a unit of collective application behavior',
    ApplicationProcess: 'Represents a sequence of application behaviors that achieves a specific result',
    ApplicationEvent: 'Represents an application state change',
    ApplicationService: 'Represents an explicitly defined exposed application behavior',
    DataObject: 'Represents data structured for automated processing',
    // Technology
    Node: 'Represents a computational or physical resource that hosts other resources',
    Device: 'Represents a physical IT resource upon which software may be deployed',
    SystemSoftware: 'Represents software that provides an environment for other software',
    TechnologyCollaboration: 'Represents an aggregate of technology elements working together',
    TechnologyInterface: 'Represents a point of access where technology services are offered',
    Path: 'Represents a link between technology elements for data/energy/material exchange',
    CommunicationNetwork: 'Represents a set of structures that connects devices',
    TechnologyFunction: 'Represents a collection of technology behavior',
    TechnologyProcess: 'Represents a sequence of technology behaviors',
    TechnologyInteraction: 'Represents a unit of collective technology behavior',
    TechnologyEvent: 'Represents a technology state change',
    TechnologyService: 'Represents an explicitly defined exposed technology behavior',
    Artifact: 'Represents a piece of data used or produced in software development or deployment',
    // Physical
    Equipment: 'Represents physical machines, tools, or instruments',
    Facility: 'Represents a physical structure or environment',
    DistributionNetwork: 'Represents a physical network used to transport materials or energy',
    Material: 'Represents tangible physical matter or energy',
    // Implementation
    WorkPackage: 'Represents a series of actions to achieve specific results',
    Deliverable: 'Represents a precisely defined result of a work package',
    ImplementationEvent: 'Represents a state change related to implementation or migration',
    Plateau: 'Represents a relatively stable state of the architecture',
    Gap: 'Represents a statement of difference between two plateaus',
    // Composite
    Grouping: 'Aggregates or composes concepts that belong together',
    Location: 'Represents a conceptual or physical place where concepts are located',
};
export const RelationshipDescriptions = {
    Composition: 'Represents that an element consists of one or more other concepts',
    Aggregation: 'Represents that an element combines one or more other concepts',
    Assignment: 'Represents the allocation of responsibility, performance, storage, or execution',
    Realization: 'Represents that an element plays a critical role in creating a more abstract element',
    Serving: 'Represents that an element provides its functionality to another element',
    Access: 'Represents the ability to observe or act upon passive structure elements',
    Influence: 'Represents that an element affects the implementation of some motivation element',
    Association: 'Represents an unspecified relationship',
    Triggering: 'Represents a temporal or causal relationship between elements',
    Flow: 'Represents transfer from one element to another',
    Specialization: 'Represents that an element is a particular kind of another element',
};
//# sourceMappingURL=types.js.map