import {APIGatewayEvent, APIGatewayProxyResult, Context} from "aws-lambda";
import {EventBridge} from "aws-sdk";
import {PutEventsRequestEntry} from "aws-sdk/clients/eventbridge";
import {DocumentClient} from "aws-sdk/clients/dynamodb";

const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || ""
const TABLE_NAME = "CircuitBreakerTable"
const ERROR_THRESHOLD = 3
const SERVICE_URL = 'www.google.com'

interface HttpCallResult {
  status: string
  siteUrl: string
  errorType: string
}

export const postEvent = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const eventBusClient = new EventBridge({ region: 'us-east-1' });
  const dynamoDbClient = new DocumentClient({
    region: 'us-east-1'
  });

  const secondsSinceEpoch = Math.round(Date.now() / 1000);
  const recentErrors = await dynamoDbClient.query({
    ExpressionAttributeValues: {
      ":v1": SERVICE_URL,
      ":now": secondsSinceEpoch
    },
    KeyConditionExpression: "SiteUrl = :v1 and ExpirationTime > :now",
    IndexName: "UrlIndex",
    TableName: TABLE_NAME
  }).promise();

  console.log(`Recent errors: ${JSON.stringify(recentErrors)}`);

  let errorType = '';
  const errorsCount = recentErrors.Count ? recentErrors.Count : 0
  if (errorsCount < ERROR_THRESHOLD) {
    await new Promise((resolve, reject) => {
      console.log('--- Calling Webservice, recent errors below threshold ---');
      setTimeout(() => {
        reject("Service timeout exception")
      }, 20)
    }).catch(reason => {
      console.log('--- Service Call Failure ---');
      console.log(reason);
      errorType = reason;
    });

    const event = await buildEvent({errorType: errorType, siteUrl: SERVICE_URL, status: "fail"})
    console.log(`EVENT: ${JSON.stringify({
        Detail: JSON.stringify({errorType: errorType, siteUrl: SERVICE_URL, status: 'fail'}),
        DetailType: 'httpcall',
        EventBusName: EVENT_BUS_NAME,
        Source: 'custom.circuitbreaker',
        Time: new Date(),
      })}`);

    const result = await eventBusClient.putEvents({
      Entries: [{
        Detail: JSON.stringify({errorType: errorType, siteUrl: SERVICE_URL, status: "fail"}),
        DetailType: 'httpcall',
        EventBusName: EVENT_BUS_NAME,
        Source: 'custom.circuitbreaker',
        Time: new Date(),
      }],
    }).promise()

    console.log(`EventBridge response: ${JSON.stringify(result)}`)

    return { statusCode: 500, body: JSON.stringify({ message: "Something is wrong with the service" }) }
  } else {
    console.log("Circuit closed");
    return { statusCode: 500, body: JSON.stringify({ message: "Circuit is closed" }) }
  }

}

const buildEvent = async (detail: HttpCallResult): Promise<PutEventsRequestEntry> => {
  return {
    Detail: JSON.stringify(detail),
    DetailType: 'httpcall',
    EventBusName: EVENT_BUS_NAME,
    Source: 'custom.circuitbreaker',
    Time: new Date(),
  }
}