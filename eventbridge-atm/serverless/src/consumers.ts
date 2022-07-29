import {EventBridgeEvent} from "aws-lambda";

export const approvedHandler = async (event: EventBridgeEvent<any, any>): Promise<void> => {
  console.log("APPROVED")
  console.log(event.detail);
};

export const unapprovedHandler = async (event: EventBridgeEvent<any, any>): Promise<void> => {
  console.log("UNAPPROVED");
  console.log(event.detail);
}