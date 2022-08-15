import {Context, EventBridgeEvent} from "aws-lambda";
import {DocumentClient} from "aws-sdk/clients/dynamodb";

const TABLE_NAME = "CircuitBreakerTable"

export const handleError = async (event: EventBridgeEvent<any, any>, context: Context): Promise<void> => {

  const dynamoDbClient = new DocumentClient({ region: 'us-east-1' });

  const secondsSinceEpoch = Math.round(Date.now() / 1000);
  const expirationTime = '' + (secondsSinceEpoch + 60);

  const result = await dynamoDbClient.put({
    TableName: TABLE_NAME,
    Item: {
      'RequestID': {S: Math.random().toString(36).substring(2) + Date.now().toString(36)},
      'SiteUrl': {S: event.detail.siteUrl},
      'ErrorType': {S: event.detail.errorType},
      'ExpirationTime': {N: expirationTime}
    }
  }).promise();

  console.log(result);
}