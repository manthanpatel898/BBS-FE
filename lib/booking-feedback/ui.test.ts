import { strict as assert } from 'node:assert';
import { FEEDBACK_CONTROL_CLASS } from './ui';

assert.match(FEEDBACK_CONTROL_CLASS, /bg-white/);
assert.match(FEEDBACK_CONTROL_CLASS, /text-slate-950/);
assert.match(FEEDBACK_CONTROL_CLASS, /caret-slate-950/);
assert.match(FEEDBACK_CONTROL_CLASS, /placeholder:text-slate-400/);
assert.match(FEEDBACK_CONTROL_CLASS, /disabled:text-slate-500/);
