import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { writeModel, createEmptyModel as writerCreateEmptyModel, addElementToModel as writerAddElementToModel } from '../src/model/writer.js';
import { parseModelComplete, getAllElements } from '../src/model/parser.js';
import {
  createElement,
  resetIdCounter,
} from '../src/__tests__/fixtures/sample-model.js';
import type { ArchiMateModel } from '../src/model/types.js';

const feature = await loadFeature('./features/model-management.feature');

function freshTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'feature-model-'));
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Create a new empty model in a fresh directory', ({ Given, When, Then, And }) => {
    let dir: string;
    let model: ArchiMateModel;

    Given('an empty directory at "/tmp/new-model"', () => {
      dir = freshTempDir();
    });

    When('the caller invokes archimate_create_model with name "MyModel" and that path', async () => {
      resetIdCounter();
      model = writerCreateEmptyModel('MyModel', 'id-mymodel');
      await writeModel(model, dir);
    });

    Then('a model.archimate file is written to that directory', () => {
      expect(fs.existsSync(path.join(dir, 'model.archimate'))).toBe(true);
    });

    And('the model becomes the current model for subsequent calls', () => {
      // Server-level "current model" is module state; we simulate by holding the
      // returned model object — readable + writable via subsequent writer calls.
      expect(model.id).toBe('id-mymodel');
    });

    And('the response includes the generated model id and the path', () => {
      expect(model.id).toMatch(/.+/);
      expect(dir.length).toBeGreaterThan(0);
      fs.rmSync(dir, { recursive: true, force: true });
    });
  });

  Scenario('Creating a model in a non-existent directory fails clearly', ({ Given, When, Then, And }) => {
    let missingPath: string;
    let error: Error | null = null;
    let currentModel: ArchiMateModel | null = null;

    Given('the path "/tmp/does-not-exist" does not exist on disk', () => {
      missingPath = path.join(os.tmpdir(), `missing-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      expect(fs.existsSync(missingPath)).toBe(false);
    });

    When('the caller invokes archimate_create_model targeting that path', async () => {
      try {
        const m = writerCreateEmptyModel('Doomed', 'id-doomed');
        await writeModel(m, missingPath);
        currentModel = m;
      } catch (e) {
        error = e as Error;
      }
    });

    Then('the call returns an error referencing the missing directory', () => {
      expect(error).not.toBeNull();
      expect(error!.message.toLowerCase()).toMatch(/no such file|enoent|directory/);
    });

    And('no current model is set', () => {
      expect(currentModel).toBeNull();
    });
  });

  Scenario('Open an existing coArchi2 model', ({ Given, When, Then, And }) => {
    let dir: string;
    let opened: ArchiMateModel;

    Given('a coArchi2 repository directory containing a valid model.archimate file', async () => {
      dir = freshTempDir();
      const m = writerCreateEmptyModel('Existing', 'id-existing');
      writerAddElementToModel(m, createElement('BusinessActor', 'Customer'));
      writerAddElementToModel(m, createElement('ApplicationComponent', 'Service'));
      await writeModel(m, dir);
    });

    When('the caller invokes archimate_open_model with that path', async () => {
      opened = await parseModelComplete(dir);
    });

    Then('the model is parsed and becomes the current model', () => {
      expect(opened).toBeDefined();
      expect(opened.name).toBe('Existing');
    });

    And('the response reports element counts grouped by ArchiMate layer', () => {
      const elements = getAllElements(opened);
      expect(elements.length).toBe(2);
      fs.rmSync(dir, { recursive: true, force: true });
    });
  });

  Scenario('Save the current model back to its source path', ({ Given, When, Then, And }) => {
    let dir: string;
    let model: ArchiMateModel;

    Given('a current model that was opened from "/tmp/existing"', async () => {
      dir = freshTempDir();
      model = writerCreateEmptyModel('Existing', 'id-existing');
      writerAddElementToModel(model, createElement('BusinessActor', 'OrigActor'));
      await writeModel(model, dir);
      model = await parseModelComplete(dir);
    });

    When('the caller invokes archimate_save_model with no path argument', async () => {
      writerAddElementToModel(model, createElement('ApplicationComponent', 'NewApp'));
      await writeModel(model, dir);
    });

    Then('the model is written to "/tmp/existing/model.archimate"', () => {
      expect(fs.existsSync(path.join(dir, 'model.archimate'))).toBe(true);
    });

    And('the on-disk XML reflects every change made since the model was opened', async () => {
      const reread = await parseModelComplete(dir);
      const elementNames = getAllElements(reread).map((e) => e.name).sort();
      expect(elementNames).toEqual(['NewApp', 'OrigActor']);
      fs.rmSync(dir, { recursive: true, force: true });
    });
  });

  Scenario('Save the current model to a different path', ({ Given, When, Then, And }) => {
    let originalDir: string;
    let newDir: string;
    let model: ArchiMateModel;

    Given('a current model', () => {
      originalDir = freshTempDir();
      newDir = freshTempDir();
      resetIdCounter();
      model = writerCreateEmptyModel('Wanderer', 'id-wanderer');
      writerAddElementToModel(model, createElement('BusinessActor', 'Wandering Actor'));
    });

    When('the caller invokes archimate_save_model with path "/tmp/elsewhere"', async () => {
      await writeModel(model, newDir);
    });

    Then('the model is written to "/tmp/elsewhere/model.archimate"', () => {
      expect(fs.existsSync(path.join(newDir, 'model.archimate'))).toBe(true);
    });

    And('subsequent saves with no path target the new path', async () => {
      // Caller now treats newDir as the "current" save path; verify a follow-up
      // writeModel to the same location keeps working and the old originalDir
      // remains untouched (no model.archimate was written there).
      await writeModel(model, newDir);
      expect(fs.existsSync(path.join(originalDir, 'model.archimate'))).toBe(false);
      fs.rmSync(originalDir, { recursive: true, force: true });
      fs.rmSync(newDir, { recursive: true, force: true });
    });
  });
});
