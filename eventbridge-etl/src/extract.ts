import {SQSHandler, SQSEvent} from "aws-lambda";
import {ECS, EventBridge} from "aws-sdk";
import {RunTaskRequest} from "aws-sdk/clients/ecs";
import {AWSError} from "aws-sdk/lib/error";
import {EventBridgePutEventsEntry} from "aws-cdk-lib/aws-stepfunctions-tasks";
import {PutEventsRequestEntry} from "aws-sdk/clients/eventbridge";

const CLUSTER_NAME = process.env.CLUSTER_NAME || "";
const TASK_DEFINITION = process.env.TASK_DEFINITION || "";
const SUBNETS = process.env.SUBNETS || "";
const CONTAINER_NAME = process.env.CONTAINER_NAME || "";
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || "";

export const extractHandler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  const ecs = new ECS();
  const eventBridge = new EventBridge();

  console.log("request: ", JSON.stringify(event, undefined, 2));

  const records = event.Records;

  /**
   * An event can contain multiple records to process. i.e. the user could have uploaded 2 files.
   */
  for (let index in records) {
    let payload = JSON.parse(records[index].body);
    console.log(`processing s3 events ${payload}`);

    let s3EventRecords = payload.Records;
    console.log(`records: ${s3EventRecords}`)

    for (let i in s3EventRecords) {
      let s3Event = s3EventRecords[i];
      console.log(`s3 event: ${s3Event}`);

      const objectKey = s3Event?.s3?.object?.key;
      const bucketName = s3Event?.s3?.bucket?.name;
      const bucketArn = s3Event?.s3?.bucket?.arn;

      console.log('Object Key - ' + objectKey);
      console.log('Bucket Name - ' + bucketName);
      console.log('Bucket ARN - ' + bucketArn);

      if ((typeof (objectKey) != 'undefined') && (typeof (bucketName) != 'undefined') && (typeof (bucketArn) != 'undefined')) {
        let ecsResponse = await ecs.runTask(await constructTaskParams(bucketName, objectKey)).promise()
          .catch((error: AWSError) => {
            console.log(error);
            throw new Error(error.message);
        });

        console.log(JSON.stringify(ecsResponse));

        const result = await eventBridge.putEvents({
          Entries: [
            await constructEventParams(ecsResponse)
          ]}).promise()
          .catch((error: AWSError) => {
            console.log(error);
            throw new Error(error.message);
        });
        console.log(JSON.stringify(result));
      } else {
        console.log('not an s3 event...')
      }
    }
  }
}

const constructTaskParams = async (bucketName: string, objectKey: string): Promise<RunTaskRequest> => {
  return {
    cluster: CLUSTER_NAME,
    launchType: 'FARGATE',
    taskDefinition: TASK_DEFINITION,
    count: 1,
    platformVersion: 'LATEST',
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: JSON.parse(SUBNETS),
        assignPublicIp: 'DISABLED'
      }
    },
    overrides: {
      containerOverrides: [{
        environment: [
          {name: 'S3_BUCKET_NAME', value: bucketName},
          {name: 'S3_OBJECT_KEY', value: objectKey},
          {name: 'EVENT_BUS_NAME', value: EVENT_BUS_NAME}
        ],
        name: CONTAINER_NAME
      }]
    }
  }
}

const constructEventParams = async (ecsResponse: any = {}): Promise<PutEventsRequestEntry> => {
  return {
    Detail: JSON.stringify({ status: 'success', data: ecsResponse }),
    DetailType: "ecs-started",
    EventBusName: EVENT_BUS_NAME,
    Source: "custom.etl",
    Time: new Date(),
  }
}