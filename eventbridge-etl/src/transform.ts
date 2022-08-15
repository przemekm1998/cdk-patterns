import {EventBridgeEvent} from "aws-lambda";

export const transformHandler = async (event: EventBridgeEvent<any, any>): Promise<void> => {
  console.log(JSON.stringify(event, null, 2));
}