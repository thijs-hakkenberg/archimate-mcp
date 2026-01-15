/**
 * ArchiMate Model XML Writer
 * Writes model.archimate files compatible with coArchi2
 */
import { ArchiMateModel, ArchiMateElement, ArchiMateRelationship, ArchiMateDiagram } from './types.js';
export declare function writeModel(model: ArchiMateModel, outputPath: string): Promise<void>;
/**
 * Create a new empty model with standard folder structure
 */
export declare function createEmptyModel(name: string, id: string): ArchiMateModel;
/**
 * Generate a unique ID in the ArchiMate format
 */
export declare function generateId(): string;
/**
 * Add an element to the appropriate folder
 */
export declare function addElementToModel(model: ArchiMateModel, element: ArchiMateElement): ArchiMateModel;
/**
 * Add a relationship to the model
 */
export declare function addRelationshipToModel(model: ArchiMateModel, relationship: ArchiMateRelationship): ArchiMateModel;
/**
 * Add a diagram to the model
 */
export declare function addDiagramToModel(model: ArchiMateModel, diagram: ArchiMateDiagram): ArchiMateModel;
/**
 * Remove an element from the model (also removes associated relationships)
 */
export declare function removeElementFromModel(model: ArchiMateModel, elementId: string): ArchiMateModel;
/**
 * Remove a relationship from the model
 */
export declare function removeRelationshipFromModel(model: ArchiMateModel, relationshipId: string): ArchiMateModel;
/**
 * Update an element in the model
 */
export declare function updateElementInModel(model: ArchiMateModel, elementId: string, updates: Partial<Pick<ArchiMateElement, 'name' | 'documentation' | 'properties'>>): ArchiMateModel;
//# sourceMappingURL=writer.d.ts.map