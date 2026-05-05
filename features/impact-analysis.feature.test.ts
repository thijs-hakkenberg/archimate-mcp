import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { analyzeImpact } from '../src/model/impact.js';
import {
  createEmptyModel,
  createElement,
  createRelationship,
  addElementToModel,
  resetIdCounter,
} from '../src/__tests__/fixtures/sample-model.js';
import type { ArchiMateModel } from '../src/model/types.js';

const feature = await loadFeature('./features/impact-analysis.feature');

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('a current model', () => {
      // Each scenario constructs its own model in subsequent steps.
    });
  });

  Scenario('Outgoing impact at depth 1 lists immediate downstream elements', ({ Given, When, Then, And }) => {
    let model: ArchiMateModel;
    let orderService: ReturnType<typeof createElement>;
    let result: ReturnType<typeof analyzeImpact>;

    Given('ApplicationComponent "Order Service" Serving "Customer" and "Sales Rep"', () => {
      resetIdCounter();
      model = createEmptyModel();
      orderService = createElement('ApplicationComponent', 'Order Service');
      const customer = createElement('BusinessActor', 'Customer');
      const salesRep = createElement('BusinessRole', 'Sales Rep');
      [orderService, customer, salesRep].forEach((e) => addElementToModel(model, e));
      model.relationships.push(
        createRelationship('Serving', orderService.id, customer.id),
        createRelationship('Serving', orderService.id, salesRep.id),
      );
    });

    When('the caller invokes archimate_impact_analysis on "Order Service" with direction "outgoing" and depth 1', () => {
      result = analyzeImpact(model, orderService.id, 'outgoing', 1);
    });

    Then('the response lists "Customer" and "Sales Rep" as direct outgoing dependencies', () => {
      const names = result!.impactedElements.map((e) => e.elementName).sort();
      expect(names).toEqual(['Customer', 'Sales Rep']);
      expect(result!.impactedElements.every((e) => e.direction === 'outgoing')).toBe(true);
    });

    And('no transitive dependencies appear', () => {
      expect(result!.impactedElements.every((e) => e.depth === 1)).toBe(true);
      expect(result!.totalImpacted).toBe(2);
    });
  });

  Scenario('Incoming impact at depth 1 lists immediate upstream elements', ({ Given, And, When, Then }) => {
    let model: ArchiMateModel;
    let orderService: ReturnType<typeof createElement>;
    let result: ReturnType<typeof analyzeImpact>;

    Given('Node "Web Server" Assigned to ApplicationComponent "Order Service"', () => {
      resetIdCounter();
      model = createEmptyModel();
      orderService = createElement('ApplicationComponent', 'Order Service');
      const webServer = createElement('Node', 'Web Server');
      addElementToModel(model, orderService);
      addElementToModel(model, webServer);
      model.relationships.push(createRelationship('Assignment', webServer.id, orderService.id));
    });

    And('TechnologyService "Database Service" Serving "Order Service"', () => {
      const dbService = createElement('TechnologyService', 'Database Service');
      addElementToModel(model, dbService);
      model.relationships.push(createRelationship('Serving', dbService.id, orderService.id));
    });

    When('the caller invokes archimate_impact_analysis on "Order Service" with direction "incoming" and depth 1', () => {
      result = analyzeImpact(model, orderService.id, 'incoming', 1);
    });

    Then('the response lists "Web Server" and "Database Service" as direct upstream dependencies', () => {
      const names = result!.impactedElements.map((e) => e.elementName).sort();
      expect(names).toEqual(['Database Service', 'Web Server']);
      expect(result!.impactedElements.every((e) => e.direction === 'incoming')).toBe(true);
      expect(result!.impactedElements.every((e) => e.depth === 1)).toBe(true);
    });
  });

  Scenario('Both-direction impact at depth 2 walks two hops in either direction', ({ Given, When, Then, And }) => {
    let model: ArchiMateModel;
    let appComponent: ReturnType<typeof createElement>;
    let result: ReturnType<typeof analyzeImpact>;

    Given('a chain Node → ApplicationComponent → BusinessProcess → BusinessActor', () => {
      resetIdCounter();
      model = createEmptyModel();
      const node = createElement('Node', 'NodeA');
      appComponent = createElement('ApplicationComponent', 'CompB');
      const process = createElement('BusinessProcess', 'ProcessC');
      const actor = createElement('BusinessActor', 'ActorD');
      [node, appComponent, process, actor].forEach((e) => addElementToModel(model, e));
      model.relationships.push(
        createRelationship('Assignment', node.id, appComponent.id),
        createRelationship('Serving', appComponent.id, process.id),
        createRelationship('Assignment', actor.id, process.id),
      );
    });

    When('the caller invokes archimate_impact_analysis on the ApplicationComponent with direction "both" and depth 2', () => {
      result = analyzeImpact(model, appComponent.id, 'both', 2);
    });

    Then('the response includes the Node and BusinessProcess at depth 1', () => {
      const depth1 = result!.impactedElements.filter((e) => e.depth === 1).map((e) => e.elementName).sort();
      expect(depth1).toEqual(['NodeA', 'ProcessC']);
    });

    And('includes the BusinessActor at depth 2', () => {
      const depth2 = result!.impactedElements.filter((e) => e.depth === 2).map((e) => e.elementName);
      expect(depth2).toContain('ActorD');
    });

    And('does not extend further', () => {
      expect(result!.impactedElements.every((e) => e.depth <= 2)).toBe(true);
    });
  });

  Scenario('Default depth is 2', ({ When, Then, And }) => {
    let result: ReturnType<typeof analyzeImpact>;

    When('the caller invokes archimate_impact_analysis with no depth specified', () => {
      resetIdCounter();
      const model = createEmptyModel();
      const a = createElement('ApplicationComponent', 'A');
      const b = createElement('ApplicationComponent', 'B');
      const c = createElement('ApplicationComponent', 'C');
      [a, b, c].forEach((e) => addElementToModel(model, e));
      model.relationships.push(
        createRelationship('Serving', a.id, b.id),
        createRelationship('Serving', b.id, c.id),
      );
      result = analyzeImpact(model, a.id);
    });

    Then('traversal walks at most two hops in the requested direction', () => {
      expect(result!.impactedElements.every((e) => e.depth <= 2)).toBe(true);
    });

    And("the response's maxDepth field reports 2", () => {
      expect(result!.maxDepth).toBe(2);
    });
  });

  Scenario('Default direction is "both"', ({ When, Then, And }) => {
    let result: ReturnType<typeof analyzeImpact>;

    When('the caller invokes archimate_impact_analysis with no direction specified', () => {
      resetIdCounter();
      const model = createEmptyModel();
      const center = createElement('ApplicationComponent', 'Center');
      const upstream = createElement('ApplicationComponent', 'Upstream');
      const downstream = createElement('ApplicationComponent', 'Downstream');
      [center, upstream, downstream].forEach((e) => addElementToModel(model, e));
      model.relationships.push(
        createRelationship('Serving', upstream.id, center.id),
        createRelationship('Serving', center.id, downstream.id),
      );
      result = analyzeImpact(model, center.id);
    });

    Then("the response's direction field reports \"both\"", () => {
      expect(result!.direction).toBe('both');
    });

    And('both incoming and outgoing edges are traversed', () => {
      const directions = new Set(result!.impactedElements.map((e) => e.direction));
      expect(directions.has('incoming')).toBe(true);
      expect(directions.has('outgoing')).toBe(true);
    });
  });
});
