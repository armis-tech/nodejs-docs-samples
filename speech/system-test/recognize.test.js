/**
 * Copyright 2016, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

require(`../../system-test/_setup`);

const path = require(`path`);

const cmd = `node recognize.js`;
const cwd = path.join(__dirname, `..`);
const filename = `./resources/audio.raw`;
const text = `how old is the Brooklyn Bridge`;

test(`should run sync recognize`, (t) => {
  return runAsync(`${cmd} sync ${filename}`, cwd)
    .then((stdout) => {
      t.is(stdout.includes(`Transcription: ${text}`), true);
    });
});

test(`should run async recognize`, (t) => {
  return runAsync(`${cmd} async ${filename}`, cwd)
    .then((stdout) => {
      t.is(stdout.includes(`Transcription: ${text}`), true);
    });
});

test(`should run streaming recognize`, (t) => {
  return runAsync(`${cmd} stream ${filename}`, cwd)
    .then((stdout) => {
      t.is(stdout.includes(text), true);
    });
});
