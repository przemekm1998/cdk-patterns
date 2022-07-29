import {APIGatewayEvent, APIGatewayProxyResult, Context} from "aws-lambda";
import {EventBridge} from "aws-sdk";
import { PutEventsRequestEntry } from "aws-sdk/clients/eventbridge";

const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || "";

export const handlePostEvent = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  if (event.body) {
    const client = new EventBridge({ region: "us-east-1" });
    console.log(event.body)
    console.log(event.body ? event.body : '')

    client.putEvents({ Entries: [ await generatePayload(event) ] }, (err, data) => {
      if (err) {
        return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
      } else {
        return { statusCode: 200, body: JSON.stringify({ message: 'Success' }) }
      }
    });
  }

  return { statusCode: 400, body: JSON.stringify({ message: 'Empty payload' }) }
};


const generatePayload = async (eventData: APIGatewayEvent): Promise<PutEventsRequestEntry> => {
  return {
    Detail: eventData.body ? eventData.body : '',
    DetailType: "transaction",
    EventBusName: EVENT_BUS_NAME,
    Source: "custom.myAtmApp",
    Time: new Date(),
  }
}