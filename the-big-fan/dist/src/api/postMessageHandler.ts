import {SNS} from "aws-sdk";

const SNS_ARN = process.env.SNS_ARN || '';

export const postMessageHandler = async (event: any = {}, context: any = {}, callback: any) => {
  const body = JSON.parse(event.body);
  const sns = new SNS();

  let response = {}
  console.log(body);
  console.log(SNS_ARN);
  sns.publish({
    TopicArn: SNS_ARN,
    Message: JSON.stringify(body)
  }, (err, data) => {
    if (err) {
      console.error(`error publishing to sns ${err.message}`);
      response = {
        statusCode: 500,
        body: JSON.stringify({ message: err.message })
      };
    } else {
      console.info("message published to SNS");
      response = {
        statusCode: 200,
        body: JSON.stringify({ message: "Done" })
      };
    }
  })

  callback(null, response);
};