import {CfnOutput, Duration, Stack, StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {SubscriptionFilter, Topic} from 'aws-cdk-lib/aws-sns';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import {SqsSubscription} from "aws-cdk-lib/aws-sns-subscriptions";

export class TheBigFanStack extends Stack {

  static getCreatedStatusQueueArnOutputExportName(queueName: string): string {
    return `${queueName}ArnId`
  }

  static getSnsTopicArnOutputExportName(topicName: string): string {
    return `${topicName}ArnId`
  }

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const topic = this.createSnsTopic("TheBigFanTopic");

    const createdStatusQueue = this.createSqsQueue("BigFanTopicStatusCreatedSubscriberQueue");
    topic.addSubscription(new SqsSubscription(createdStatusQueue, {
      rawMessageDelivery: true,
      filterPolicy: {
        status: SubscriptionFilter.stringFilter({ allowlist: ['created'] })
      }
    }));

    const anyOtherStatusQueue = this.createSqsQueue("BigFanTopicAnyOtherStatusSubscriberQueue");
    topic.addSubscription(new SqsSubscription(anyOtherStatusQueue, {
      rawMessageDelivery: true,
      filterPolicy: {
        status: SubscriptionFilter.stringFilter({ denylist: ['created'] })
      }
    }));
  }

  private createSnsTopic(topicName: string): Topic {
    const topic = new Topic(this, topicName, {
      displayName: "The big fan cdk pattern topic"
    });

    new CfnOutput(this, `${topicName}Output`, {
      exportName: TheBigFanStack.getSnsTopicArnOutputExportName(topicName),
      value: topic.topicArn,
    });

    return topic
  }

  private createSqsQueue(queueName: string): Queue {
    const queue = new Queue(this, queueName, {
      visibilityTimeout: Duration.seconds(300),
      queueName: queueName
    });

    new CfnOutput(this, `${queueName}Output`, {
      exportName: TheBigFanStack.getCreatedStatusQueueArnOutputExportName(queueName),
      value: queue.queueArn,
    });

    return queue
  }
}
