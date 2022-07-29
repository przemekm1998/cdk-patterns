import {Context, APIGatewayProxyEvent, Callback} from "aws-lambda";
import {DynamoDB} from "aws-sdk";

const TABLE_NAME = process.env.TABLE_NAME || ""

export const handleSaveMessage = async (event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> => {
  if (event.body) {
    const body = JSON.parse(event.body);
    const dynamo = new DynamoDB.DocumentClient();
    let response = {}

    console.log(body);
    console.log(TABLE_NAME);

    const item = JSON.parse(event.body)
    dynamo.put({TableName: TABLE_NAME, Item: item}, (err, data) => {
      if (err) {
        response = { statusCode: 500, body: err.message };
      } else {
        response = { statusCode: 201, body: 'Success' }
      }
    });
    callback(null, response);
  }
}