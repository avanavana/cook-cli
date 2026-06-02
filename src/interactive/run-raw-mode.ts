import { render } from 'ink';
import React from 'react';

import { RawApp } from './raw-app.js';

export async function runRawMode(): Promise<void> {
  const app = render(React.createElement(RawApp));

  await app.waitUntilExit();
}
