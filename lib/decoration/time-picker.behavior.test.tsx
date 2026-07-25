import './image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import React, { useState } from 'react';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { DecorationTimePicker } from '../../components/decoration/decoration-time-picker';

test.afterEach(() => cleanup());

test('keeps partial choices and emits banquet-style time as HH:mm', () => {
  function Harness() {
    const [value, setValue] = useState('');
    return <><DecorationTimePicker value={value} onChange={setValue}/><output>{value}</output></>;
  }

  render(<Harness/>);
  const page = within(document.body);
  fireEvent.change(page.getByLabelText('Hour'), { target: { value: '7' } });
  assert.equal((page.getByLabelText('Hour') as HTMLSelectElement).value, '7');
  fireEvent.change(page.getByLabelText('Minute'), { target: { value: '30' } });
  fireEvent.change(page.getByLabelText('AM or PM'), { target: { value: 'PM' } });
  assert.equal(page.getByText('19:30').textContent, '19:30');
});
