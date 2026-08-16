import assert from 'node:assert/strict';

async function main() {
  let moduleUnderTest:
    | typeof import('./flexible-menu-builder')
    | undefined;

  try {
    moduleUnderTest = await import('./flexible-menu-builder');
  } catch {
    moduleUnderTest = undefined;
  }

  assert.equal(
    typeof moduleUnderTest?.normalizeFlexibleMenuBuilderFlag,
    'function',
    'restaurant forms must expose the flexible-menu flag normalizer',
  );

  assert.equal(
    moduleUnderTest?.normalizeFlexibleMenuBuilderFlag('BANQUET', true),
    true,
  );
  assert.equal(
    moduleUnderTest?.normalizeFlexibleMenuBuilderFlag('BANQUET', false),
    false,
  );
  assert.equal(
    moduleUnderTest?.normalizeFlexibleMenuBuilderFlag('EVENT_DECORATION', true),
    false,
  );
}

void main();
