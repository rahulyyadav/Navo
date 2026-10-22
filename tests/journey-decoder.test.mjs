import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const original = await readFile(new URL('../src/services/journeys/types.ts', import.meta.url), 'utf8');
const source = original.replace(
  "import { isCoordinate } from '../places/types';",
  'const isCoordinate = value => Boolean(value && typeof value === "object" && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) && Math.abs(value.latitude) <= 90 && Math.abs(value.longitude) <= 180);',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const journeys = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('ready itinerary decoding accepts backend nulls for optional point fields', () => {
  const checkedAt = '2026-10-21T00:00:00.000Z';
  const point = { id: 'point-a', name: 'Schematic gateway', latitude: 28.2, longitude: 83.9, fullName: null, region: null, country: null, placeType: 'schematic checkpoint', canonicalId: null, destinationMeaning: null, provider: 'coordinates', providerId: null, coordinatesApproximate: true };
  const destination = { id: 'destination', name: 'Mardi Himal Trek', latitude: 28.48, longitude: 83.94, fullName: null, region: null, country: null, placeType: null, canonicalId: null, destinationMeaning: null, provider: null, providerId: null, coordinatesApproximate: false };
  const source = { id: 'source-1', title: 'Route reference', url: 'https://example.com/route', checkedAt, publishedAt: null };
  const itinerary = {
    version: 1,
    id: 'a'.repeat(24),
    destination,
    title: 'Mardi Himal route',
    destinationMeaning: null,
    legs: [{ id: 'leg-1', start: point, end: destination, options: [{ id: 'walk', mode: 'walk', label: 'Trek', minutes: null, note: 'Source-backed stage.', sourceIds: ['source-1'], verification: 'unconfirmed', verificationSourceIds: [], requiresUserDecision: false, warning: null }], selected: 'walk', geometry: [], geometryKind: 'schematic' }],
    sources: [source],
    researchedAt: checkedAt,
    expiresAt: '2026-10-28T00:00:00.000Z',
    provenance: 'researched',
    readiness: 'ready',
    warnings: [],
  };
  assert.equal(journeys.decodeItinerary(itinerary).legs.length, 1);
});

const reviewJourney = () => ({
  phase: 'draft', approach: [], selections: {}, acceptedUnverified: [],
  template: { readiness: 'needs-user-choice', legs: [{ id: 'first', selected: 'bus', options: [
    { id: 'bus', verification: 'unconfirmed', requiresUserDecision: false },
  ] }] },
});

test('a general review warning can be acknowledged without inventing a stage decision', () => {
  const journey = reviewJourney();
  assert.equal(journeys.journeyReview(journey).needsAcknowledgement, true);
  assert.equal(journeys.journeyReview(journey).canStart, false);
  journey.reviewAcknowledged = true;
  assert.equal(journeys.journeyReview(journey).canStart, true);
});

test('viewing or acknowledging notes does not accept a flagged transport choice', () => {
  const journey = reviewJourney();
  journey.template.legs[0].options[0].requiresUserDecision = true;
  journey.reviewAcknowledged = true;
  assert.equal(journeys.journeyReview(journey).pending.length, 1);
  assert.equal(journeys.journeyReview(journey).canStart, false);
  journey.acceptedUnverified = ['first:bus'];
  assert.equal(journeys.journeyReview(journey).canStart, true);
});

test('reported closures remain attached to the viewable route', () => {
  const journey = reviewJourney();
  journey.reviewAcknowledged = true;
  journey.template.legs[0].options[0].verification = 'closed-confirmed';
  assert.equal(journeys.journeyReview(journey).closed.length, 1);
  assert.equal(journeys.journeyReview(journey).canStart, false);
});

test('an unavailable origin connection keeps a viewable, explicitly unconfirmed departure leg', async () => {
  const apiSource = (await readFile(new URL('../src/services/journeys/api.ts', import.meta.url), 'utf8')).replace(/^import .*;$/gm, '');
  const apiCode = ts.transpileModule(apiSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const api = await import(`data:text/javascript;base64,${Buffer.from(apiCode).toString('base64')}`);
  const origin = { id: 'origin', name: 'Sabhya Samaj Marg', latitude: 27.67, longitude: 85.32 };
  const gateway = { id: 'gateway', name: 'Departure stop', latitude: 27.70, longitude: 85.31 };
  const template = { legs: [{ start: gateway }], sources: [{ id: 'guide', title: 'Departure reference', url: 'https://example.com/guide' }] };
  const approach = api.unconfirmedApproach(template, origin);
  assert.equal(approach.legs[0].start, origin);
  assert.equal(approach.legs[0].end, gateway);
  assert.equal(approach.legs[0].options[0].requiresUserDecision, true);
  assert.equal(approach.legs[0].options[0].minutes, null);
  assert.equal(approach.legs[0].geometryKind, 'schematic');
  journeys.decodeLegs(approach.legs, approach.sources);
});
