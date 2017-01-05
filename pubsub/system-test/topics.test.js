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

const pubsub = require(`@google-cloud/pubsub`)();
const uuid = require(`uuid`);
const path = require(`path`);

const cwd = path.join(__dirname, `..`);
const topicName = `nodejs-docs-samples-test-${uuid.v4()}`;
const subscriptionName = `nodejs-docs-samples-test-${uuid.v4()}`;
const projectId = process.env.GCLOUD_PROJECT;
const fullTopicName = `projects/${projectId}/topics/${topicName}`;
const message = { data: `Hello, world!` };
const cmd = `node topics.js`;

test.after(() => {
  return pubsub.subscription(subscriptionName).delete()
    .then(() => pubsub.topic(topicName).delete(), () => {})
    .catch(() => {});
});

test.serial(`should create a topic`, (t) => {
  return runAsync(`${cmd} create ${topicName}`, cwd)
    .then((stdout) => {
      t.is(stdout, `Topic ${fullTopicName} created.`);
      return pubsub.topic(topicName).exists();
    })
    .then((results) => {
      const exists = results[0];
      t.is(exists, true);
    });
});

test.cb.serial(`should list topics`, (t) => {
  // Listing is eventually consistent. Give the indexes time to update.
  setTimeout(() => {
    runAsync(`${cmd} list`, cwd)
      .then((stdout) => {
        t.is(stdout.includes(`Topics:`), true);
        t.is(stdout.includes(fullTopicName), true);
        t.end();
      }).catch(t.end);
  }, 5000);
});

test.serial(`should publish a simple message`, (t) => {
  let subscription;
  return pubsub.topic(topicName).subscribe(subscriptionName)
    .then((results) => {
      subscription = results[0];
      return runAsync(`${cmd} publish ${topicName} "${message.data}"`, cwd);
    })
    .then(() => subscription.pull())
    .then((results) => {
      const messages = results[0];
      t.is(messages[0].data, message.data);
    });
});

test.serial(`should publish a JSON message`, (t) => {
  let subscription;
  return pubsub.topic(topicName).subscribe(subscriptionName)
    .then((results) => {
      subscription = results[0];
      return runAsync(`${cmd} publish ${topicName} '${JSON.stringify(message)}'`, cwd);
    })
    .then(() => subscription.pull())
    .then((results) => {
      const messages = results[0];
      t.deepEqual(messages[0].data, message);
    });
});

test.serial(`should publish ordered messages`, (t) => {
  const topics = require(`../topics`);
  let subscription;

  return pubsub.topic(topicName).subscribe(subscriptionName)
    .then((results) => {
      subscription = results[0];
      return topics.publishOrderedMessage(topicName, message.data);
    })
    .then(() => subscription.pull())
    .then((results) => {
      const messages = results[0];
      t.is(messages[0].data, message.data);
      t.is(messages[0].attributes.counterId, '1');
      return topics.publishOrderedMessage(topicName, message.data);
    })
    .then(() => subscription.pull())
    .then((results) => {
      const messages = results[0];
      t.is(messages[0].data, message.data);
      t.is(messages[0].attributes.counterId, '2');
      return topics.publishOrderedMessage(topicName, message.data);
    });
});

test.serial(`should set the IAM policy for a topic`, (t) => {
  return runAsync(`${cmd} set-policy ${topicName}`, cwd)
    .then(() => pubsub.topic(topicName).iam.getPolicy())
    .then((results) => {
      const policy = results[0];
      t.deepEqual(policy.bindings, [
        {
          role: `roles/pubsub.editor`,
          members: [`group:cloud-logs@google.com`]
        },
        {
          role: `roles/pubsub.viewer`,
          members: [`allUsers`]
        }
      ]);
    });
});

test.serial(`should get the IAM policy for a topic`, (t) => {
  let policy;
  return pubsub.topic(topicName).iam.getPolicy()
    .then((results) => {
      policy = results[0];
      return runAsync(`${cmd} get-policy ${topicName}`, cwd);
    })
    .then((stdout) => {
      t.is(stdout, `Policy for topic: ${JSON.stringify(policy.bindings)}.`);
    });
});

test.serial(`should test permissions for a topic`, (t) => {
  return runAsync(`${cmd} test-permissions ${topicName}`, cwd)
    .then((stdout) => {
      t.is(stdout.includes(`Tested permissions for topic`), true);
    });
});

test.serial(`should delete a topic`, (t) => {
  return runAsync(`${cmd} delete ${topicName}`, cwd)
    .then((stdout) => {
      t.is(stdout, `Topic ${fullTopicName} deleted.`);
      return pubsub.topic(topicName).exists();
    })
    .then((results) => {
      const exists = results[0];
      t.is(exists, false);
    });
});
