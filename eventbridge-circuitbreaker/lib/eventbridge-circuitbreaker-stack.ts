import {CfnOutput, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {AttributeType, Table} from "aws-cdk-lib/aws-dynamodb";
import {EventBus} from "aws-cdk-lib/aws-events";

export class EventbridgeCircuitbreakerStack extends Stack {
  static getDynamoDbTableName(): string {
    return "CircuitBreakerTable"
  }

  static getDynamoDbTableArnIdExportName(): string {
    return "CircuitBreakerTableArnId"
  }

  static getEventBusName(): string {
    return "CircuitBreakerEventBus"
  }

  static getEventBusArnIdExportName(): string {
    return "CircuitBreakerEventBusArnId"
  }

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.createDynamoDbTable();
    this.createEventBridge();
  }

  private createDynamoDbTable(): Table {
    const table = new Table(this, 'CircuitBreaker', {
      tableName: EventbridgeCircuitbreakerStack.getDynamoDbTableName(),
      partitionKey: { name: 'RequestID', type: AttributeType.STRING },
      sortKey: { name: 'ExpirationTime', type: AttributeType.NUMBER },
      timeToLiveAttribute: 'ExpirationTime'
    });

    table.addGlobalSecondaryIndex({
      indexName: 'UrlIndex',
      partitionKey: { name: 'SiteUrl', type: AttributeType.STRING },
      sortKey: { name: 'ExpirationTime', type: AttributeType.NUMBER }
    });

    new CfnOutput(this, "CircuitBreakerArnId", {
      exportName: EventbridgeCircuitbreakerStack.getDynamoDbTableArnIdExportName(),
      value: table.tableArn
    });

    return table;
  }

  private createEventBridge(): EventBus {
    const bus = new EventBus(this, "CircuitBreakerEventBus", {
      eventBusName: EventbridgeCircuitbreakerStack.getEventBusName()
    });

    new CfnOutput(this, "CircuitBreakerEventBusArnId", {
      exportName: EventbridgeCircuitbreakerStack.getEventBusArnIdExportName(),
      value: bus.eventBusArn
    });

    return bus
  }
}
