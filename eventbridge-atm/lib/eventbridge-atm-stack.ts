import {CfnOutput, Stack, StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {EventBus} from "aws-cdk-lib/aws-events";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class EventbridgeAtmStack extends Stack {
  static getEventBusName(): string {
    return "EventBusName"
  }

  static getEventBusArnIdExportName(): string {
    return "EventBusArnId";
  }

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const eventBus = new EventBus(this, "EventBus", {
      eventBusName: EventbridgeAtmStack.getEventBusName(),
    });

    new CfnOutput(this, "EventBusArnId", {
      exportName: EventbridgeAtmStack.getEventBusArnIdExportName(),
      value: eventBus.eventBusArn
    });
  }
}
