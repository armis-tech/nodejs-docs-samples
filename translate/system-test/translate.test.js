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

const translate = require(`@google-cloud/translate`)();
const path = require(`path`);

const cwd = path.join(__dirname, `..`);
const cmd = `node translate.js`;
const text = `Hello world!`;
const text2 = `Goodbye!`;
const model = `nmt`;
const toLang = `ru`;

test(`should detect language of a single string`, (t) => {
  return runAsync(`${cmd} detect "${text}"`, cwd)
    .then((stdout) => {
      return translate.detect(text)
        .then((results) => {
          const expected = `Detections:\n${text} => ${results[0].language}`;
          t.is(stdout, expected);
        });
    });
});

test(`should detect language of multiple strings`, (t) => {
  return runAsync(`${cmd} detect "${text}" "${text2}"`, cwd)
    .then((stdout) => {
      return translate.detect([text, text2])
        .then((results) => {
          const expected = `Detections:\n${text} => ${results[0][0].language}\n${text2} => ${results[0][1].language}`;
          t.is(stdout, expected);
        });
    });
});

test(`should list languages`, (t) => {
  return runAsync(`${cmd} list`, cwd)
    .then((stdout) => {
      t.is(stdout.includes(`Languages:`), true);
      t.is(stdout.includes(`{ code: 'af', name: 'Afrikaans' }`), true);
    });
});

test(`should list languages with a target`, (t) => {
  return runAsync(`${cmd} list es`, cwd)
    .then((stdout) => {
      t.is(stdout.includes(`Languages:`), true);
      t.is(stdout.includes(`{ code: 'af', name: 'afrikáans' }`), true);
    });
});

test(`should translate a single string`, (t) => {
  return runAsync(`${cmd} translate ${toLang} "${text}"`, cwd)
    .then((stdout) => {
      return translate.translate(text, toLang)
        .then((results) => {
          const expected = `Translations:\n${text} => (${toLang}) ${results[0]}`;
          t.is(stdout, expected);
        });
    });
});

test(`should translate multiple strings`, (t) => {
  return runAsync(`${cmd} translate ${toLang} "${text}" "${text2}"`, cwd)
    .then((stdout) => {
      return translate.translate([text, text2], toLang)
        .then((results) => {
          const expected = `Translations:\n${text} => (${toLang}) ${results[0][0]}\n${text2} => (${toLang}) ${results[0][1]}`;
          t.is(stdout, expected);
        });
    });
});

test(`should translate a single string with a model`, (t) => {
  return runAsync(`${cmd} translate-with-model ${toLang} ${model} "${text}"`, cwd)
    .then((stdout) => {
      return translate.translate(text, toLang)
        .then((results) => {
          const expected = `Translations:\n${text} => (${toLang}) ${results[0]}`;
          t.is(stdout, expected);
        });
    });
});

test(`should translate multiple strings with a model`, (t) => {
  return runAsync(`${cmd} translate-with-model ${toLang} ${model} "${text}" "${text2}"`, cwd)
    .then((stdout) => {
      return translate.translate([text, text2], toLang)
        .then((results) => {
          const expected = `Translations:\n${text} => (${toLang}) ${results[0][0]}\n${text2} => (${toLang}) ${results[0][1]}`;
          t.is(stdout, expected);
        });
    });
});
