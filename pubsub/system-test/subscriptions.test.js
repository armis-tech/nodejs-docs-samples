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
const subscriptionNameOne = `nodejs-docs-samples-test-sub-${uuid.v4()}`;
const subscriptionNameTwo = `nodejs-docs-samples-test-sub-${uuid.v4()}`;
const projectId = process.env.GCLOUD_PROJECT;
const fullTopicName = `projects/${projectId}/topics/${topicName}`;
const fullSubscriptionNameOne = `projects/${projectId}/subscriptions/${subscriptionNameOne}`;
const fullSubscriptionNameTwo = `projects/${projectId}/subscriptions/${subscriptionNameTwo}`;
const cmd = `node subscriptions.js`;

test.before(() => {
  stubConsole();
  return pubsub.createTopic(topicName);
});

test.after(() => {
  restoreConsole();
  return pubsub.subscription(subscriptionNameOne).delete().catch(() => {})
    .then(() => pubsub.subscription(subscriptionNameTwo).delete()).catch(() => {})
    .then(() => pubsub.topic(topicName).delete(), () => {}).catch(() => {});
});

test.serial(`should create a subscription`, (t) => {
  return runAsync(`${cmd} create ${topicName} ${subscriptionNameOne}`, cwd)
    .then((stdout) => {
      t.is(stdout, `Subscription ${fullSubscriptionNameOne} created.`);
      return pubsub.subscription(subscriptionNameOne).exists();
    })
    .then((results) => {
      const exists = results[0];
      t.is(exists, true);
    });
});

test.serial(`should create a push subscription`, (t) => {
  return runAsync(`${cmd} create-push ${topicName} ${subscriptionNameTwo}`, cwd)
    .then((stdout) => {
      t.is(stdout, `Subscription ${fullSubscriptionNameTwo} created.`);
      return pubsub.subscription(subscriptionNameTwo).exists();
    })
    .then((results) => {
      const exists = results[0];
      t.is(exists, true);
    });
});

test.serial(`should get metadata for a subscription`, (t) => {
  return runAsync(`${cmd} get ${subscriptionNameOne}`, cwd)
    .then((stdout) => {
      const expected = `Subscription: ${fullSubscriptionNameOne}` +
        `\nTopic: ${fullTopicName}` +
        `\nPush config: ` +
        `\nAck deadline: 10s`;
      t.is(stdout, expected);
    });
});

test.cb.serial(`should list all subscriptions`, (t) => {
  // Listing is eventually consistent. Give the indexes time to update.
  setTimeout(() => {
    runAsync(`${cmd} list`, cwd)
      .then((stdout) => {
        t.is(stdout.includes(`Subscriptions:`), true);
        t.is(stdout.includes(fullSubscriptionNameOne), true);
        t.is(stdout.includes(fullSubscriptionNameTwo), true);
        t.end();
      }).catch(t.end);
  }, 5000);
});

test.serial(`should list subscriptions for a topic`, (t) => {
  return runAsync(`${cmd} list ${topicName}`, cwd)
    .then((stdout) => {
      t.is(stdout.includes(`Subscriptions for ${topicName}:`), true);
      t.is(stdout.includes(fullSubscriptionNameOne), true);
      t.is(stdout.includes(fullSubscriptionNameTwo), true);
    });
});

test.serial(`should pull messages`, (t) => {
  const expected = `Hello, world!`;
  let expectedOutput;
  return pubsub.topic(topicName).publish(expected)
    .then((results) => {
      const messageIds = results[0];
      expectedOutput = `Received ${messageIds.length} messages.\n` +
        `* ${messageIds[0]} "${expected}" {}`;
      return runAsync(`${cmd} pull ${subscriptionNameOne}`, cwd);
    })
    .then((stdout) => {
      t.is(stdout, expectedOutput);
    });
});

test.serial(`should pull ordered messages`, (t) => {
  const subscriptions = require('../subscriptions');
  const expected = `Hello, world!`;
  const publishedMessageIds = [];

  return pubsub.topic(topicName).publish({ data: expected, attributes: { counterId: '3' } }, { raw: true })
    .then((results) => {
      const messageIds = results[0];
      publishedMessageIds.push(messageIds[0]);
      return subscriptions.pullOrderedMessages(subscriptionNameOne);
    })
    .then(() => {
      t.is(console.log.callCount, 0);
      return pubsub.topic(topicName).publish({ data: expected, attributes: { counterId: '1' } }, { raw: true });
    })
    .then((results) => {
      const messageIds = results[0];
      publishedMessageIds.push(messageIds[0]);
      return subscriptions.pullOrderedMessages(subscriptionNameOne);
    })
    .then(() => {
      t.is(console.log.callCount, 1);
      t.deepEqual(console.log.firstCall.args, [`* %d %j %j`, publishedMessageIds[1], expected, { counterId: '1' }]);
      return pubsub.topic(topicName).publish({ data: expected, attributes: { counterId: '1' } }, { raw: true });
    })
    .then((results) => {
      return pubsub.topic(topicName).publish({ data: expected, attributes: { counterId: '2' } }, { raw: true });
    })
    .then((results) => {
      const messageIds = results[0];
      publishedMessageIds.push(messageIds[0]);
      return subscriptions.pullOrderedMessages(subscriptionNameOne);
    })
    .then(() => {
      t.is(console.log.callCount, 3);
      t.deepEqual(console.log.secondCall.args, [`* %d %j %j`, publishedMessageIds[2], expected, { counterId: '2' }]);
      t.deepEqual(console.log.thirdCall.args, [`* %d %j %j`, publishedMessageIds[0], expected, { counterId: '3' }]);
    });
});

test.serial(`should set the IAM policy for a subscription`, (t) => {
  return runAsync(`${cmd} set-policy ${subscriptionNameOne}`, cwd)
    .then(() => pubsub.subscription(subscriptionNameOne).iam.getPolicy())
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

test.serial(`should get the IAM policy for a subscription`, (t) => {
  let policy;
  return pubsub.subscription(subscriptionNameOne).iam.getPolicy()
    .then((results) => {
      policy = results[0];
      return runAsync(`${cmd} get-policy ${subscriptionNameOne}`, cwd);
    })
    .then((stdout) => {
      t.is(stdout, `Policy for subscription: ${JSON.stringify(policy.bindings)}.`);
    });
});

test.serial(`should test permissions for a subscription`, (t) => {
  return runAsync(`${cmd} test-permissions ${subscriptionNameOne}`, cwd)
    .then((stdout) => {
      t.is(stdout.includes(`Tested permissions for subscription`), true);
    });
});

test.serial(`should delete a subscription`, (t) => {
  return runAsync(`${cmd} delete ${subscriptionNameOne}`, cwd)
    .then((stdout) => {
      t.is(stdout, `Subscription ${fullSubscriptionNameOne} deleted.`);
      return pubsub.subscription(subscriptionNameOne).exists();
    })
    .then((results) => {
      const exists = results[0];
      t.is(exists, false);
    });
});
