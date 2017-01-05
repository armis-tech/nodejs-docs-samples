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

const uuid = require(`uuid`);
const path = require(`path`);
const storage = require(`@google-cloud/storage`)();

const cmd = `node analyze.js`;
const cwd = path.join(__dirname, `..`);
const bucketName = `nodejs-docs-samples-test-${uuid.v4()}`;
const fileName = `text.txt`;
const localFilePath = path.join(__dirname, `../resources/text.txt`);
const text = `President Obama is speaking at the White House.`;

test.before(() => {
  return storage.createBucket(bucketName)
    .then((results) => results[0].upload(localFilePath));
});

test.after(() => {
  return storage.bucket(bucketName).deleteFiles({ force: true })
    .then(() => storage.bucket(bucketName).deleteFiles({ force: true }))
    .then(() => storage.bucket(bucketName).delete());
});

test(`should run sync recognize`, (t) => {
  return runAsync(`${cmd} sentiment-text "${text}"`, cwd)
    .then((stdout) => {
      t.is(stdout.includes(`Sentiment: positive.`), true);
    });
});

test(`should analyze sentiment in a file`, (t) => {
  return runAsync(`${cmd} sentiment-file ${bucketName} ${fileName}`, cwd)
    .then((stdout) => {
      t.is(stdout.includes(`Sentiment: positive.`), true);
    });
});

test(`should analyze entities in text`, (t) => {
  return runAsync(`${cmd} entities-text "${text}"`, cwd)
    .then((stdout) => {
      t.is(stdout.includes(`Entities:`), true);
      t.is(stdout.includes(`people:`), true);
      t.is(stdout.includes(`places:`), true);
    });
});

test('should analyze entities in a file', (t) => {
  return runAsync(`${cmd} entities-file ${bucketName} ${fileName}`, cwd)
    .then((stdout) => {
      t.is(stdout.includes(`Entities:`), true);
      t.is(stdout.includes(`people:`), true);
      t.is(stdout.includes(`places:`), true);
    });
});

test(`should analyze syntax in text`, (t) => {
  return runAsync(`${cmd} syntax-text "${text}"`, cwd)
    .then((stdout) => {
      t.is(stdout.includes(`Tags:`), true);
      t.is(stdout.includes(`NOUN`), true);
      t.is(stdout.includes(`VERB`), true);
      t.is(stdout.includes(`PUNCT`), true);
    });
});

test('should analyze syntax in a file', (t) => {
  return runAsync(`${cmd} syntax-file ${bucketName} ${fileName}`, cwd)
    .then((stdout) => {
      t.is(stdout.includes(`Tags:`), true);
      t.is(stdout.includes(`NOUN`), true);
      t.is(stdout.includes(`VERB`), true);
      t.is(stdout.includes(`PUNCT`), true);
    });
});
