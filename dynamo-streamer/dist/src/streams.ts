import {DynamoDBStreamEvent} from "aws-lambda";
import {DynamoDBRecord} from "aws-lambda/trigger/dynamodb-stream";


export const handleStream = async (event: DynamoDBStreamEvent): Promise<void> => {
  console.log("request: ", JSON.stringify(event, undefined, 2));

  const records: DynamoDBRecord[] = event.Records;

  for(const index in records) {
    const payload = records[index].dynamodb?.NewImage;
    console.log('received message ' + JSON.stringify(payload));
  }
}
