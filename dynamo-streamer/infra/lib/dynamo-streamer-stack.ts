import {CfnOutput, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {AttributeType, StreamViewType, Table} from "aws-cdk-lib/aws-dynamodb";

export class DynamoStreamerStack extends Stack {
  static getDynamoDbTableNameExportName(): string {
    return "TheDynamoStreamerDbTableName";
  }

  static getDynamoDbTableArnExportName(): string {
    return "TheDynamoStreamerDbTableArnId";
  }

  static getDynamoDbStreamArnExportName(): string {
    return "TheDynamoStreamerDbStreamArnId";
  }

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const table = new Table(this, "TheDynamoStreamerDb", {
      partitionKey: { name: 'message', type: AttributeType.STRING },
      stream: StreamViewType.NEW_IMAGE
    });

    new CfnOutput(this, "TheDynamoStreamerDbTableName", {
      exportName: DynamoStreamerStack.getDynamoDbTableNameExportName(),
      value: table.tableName
    });

    new CfnOutput(this, "TheDynamoStreamerDbTableOutputArn", {
      exportName: DynamoStreamerStack.getDynamoDbTableArnExportName(),
      value: table.tableArn
    });

    new CfnOutput(this, "TheDynamoStreamerDbStreamOutputArn", {
      exportName: DynamoStreamerStack.getDynamoDbStreamArnExportName(),
      value: table.tableStreamArn!
    });
  }
}
