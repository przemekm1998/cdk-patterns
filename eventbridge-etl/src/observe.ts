import {EventBridgeEvent} from "aws-lambda";

export const observeHandler = async (event: EventBridgeEvent<any, any>): Promise<void> => {
  console.log(JSON.stringify(event, null, 2));
}