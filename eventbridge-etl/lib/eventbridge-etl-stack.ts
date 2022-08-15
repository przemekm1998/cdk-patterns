import {Duration, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {AttributeType, Table} from "aws-cdk-lib/aws-dynamodb";
import {Bucket, EventType} from "aws-cdk-lib/aws-s3";
import {Queue} from "aws-cdk-lib/aws-sqs";
import {SqsDestination} from "aws-cdk-lib/aws-s3-notifications";
import {Effect, PolicyStatement} from 'aws-cdk-lib/aws-iam';
import {Code, Function, Runtime} from "aws-cdk-lib/aws-lambda"
import {SqsEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import {EventBus, Rule} from "aws-cdk-lib/aws-events";
import {LambdaFunction} from "aws-cdk-lib/aws-events-targets";
import {AwsLogDriver, Cluster, ContainerImage, FargateTaskDefinition} from "aws-cdk-lib/aws-ecs";
import {Vpc} from "aws-cdk-lib/aws-ec2";
import {RetentionDays} from "aws-cdk-lib/aws-logs";

export class EventbridgeEtlStack extends Stack {
    /**
   * If left unchecked this pattern could "fan out" on the transform and load
   * lambdas to the point that it consumes all resources on the account. This is
   * why we are limiting concurrency to 2 on all 3 lambdas. Feel free to raise this.
   */
  static LAMBDA_THROTTLE_SIZE = 2;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const table = new Table(this, "TransformedData", {
      partitionKey: { name: 'id', type: AttributeType.STRING }
    });

    const bucket = new Bucket(this, "LandingBucket", {});

    const s3EventsQueue = new Queue(this, "NewObjectLandingBucketEventQueue", {
      visibilityTimeout: Duration.seconds(300)
    });
    bucket.addEventNotification(EventType.OBJECT_CREATED, new SqsDestination(s3EventsQueue));

    const eventBus = new EventBus(this, "EtlEventBus", {
      eventBusName: "EtlEventBus"
    });
    const eventBridgePutPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [eventBus.eventBusArn],
      actions: ['events:PutEvents']
    });

    /**
     * Fargate ECS Task Creation to pull data from S3
     *
     * Fargate is used here because if you had a seriously large file,
     * you could stream the data to fargate for as long as needed before
     * putting the data onto eventbridge or up the memory/storage to
     * download the whole file. Lambda has limitations on runtime and
     * memory/storage
     */
    const vpc = new Vpc(this, "Vpc", {
      maxAzs: 2
    });

    const logging = new AwsLogDriver({
      streamPrefix: "EventBridgeEtl",
      logRetention: RetentionDays.ONE_DAY
    });

    const cluster = new Cluster(this, "Ec2Cluster", {
      vpc:vpc
    });

    const taskDefinition = new FargateTaskDefinition(this, "FargateTaskDefinition", {
      memoryLimitMiB: 512,
      cpu: 256,
    });
    taskDefinition.addToTaskRolePolicy(eventBridgePutPolicy);
    bucket.grantRead(taskDefinition.taskRole);

    const container = taskDefinition.addContainer("AppContainer", {
      image: ContainerImage.fromAsset('container'),
      logging,
      environment: {
        'S3_BUCKET_NAME': bucket.bucketName
      },
    })

    /**
     * Lambdas
     *
     * These are used for 4 phases:
     *
     * Extract    - kicks of ecs fargate task to download data and splinter to eventbridge events
     * Transform  - takes the two comma separated strings and produces a json object
     * Load       - inserts the data into dynamodb
     * Observe    - This is a lambda that subscribes to all events and logs them centrally
     */

    const extractLambda = new Function(this, 'extractLambdaHandler', {
      runtime: Runtime.NODEJS_16_X,
      code: Code.fromAsset('src'),
      handler: 'index.extractHandler',
      // reservedConcurrentExecutions: EventbridgeEtlStack.LAMBDA_THROTTLE_SIZE,
      environment: {
        CLUSTER_NAME: cluster.clusterName,
        TASK_DEFINITION: taskDefinition.taskDefinitionArn,
        SUBNETS: JSON.stringify(Array.from(vpc.privateSubnets, x => x.subnetId)),
        CONTAINER_NAME: container.containerName,
        EVENT_BUS_NAME: eventBus.eventBusName
      }
    });
    s3EventsQueue.grantConsumeMessages(extractLambda);
    extractLambda.addEventSource(new SqsEventSource(s3EventsQueue, {}));
    extractLambda.addToRolePolicy(eventBridgePutPolicy);

    const runTaskPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['ecs:RunTask'],
      resources: [taskDefinition.taskDefinitionArn]
    });
    extractLambda.addToRolePolicy(runTaskPolicyStatement);

    const taskExecutionRolePolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'iam:PassRole'
      ],
      resources: [
        taskDefinition.obtainExecutionRole().roleArn,
        taskDefinition.taskRole.roleArn
      ]
    });
    extractLambda.addToRolePolicy(taskExecutionRolePolicyStatement);

    /**
     * Transform
     */
    const transformLambda = new Function(this, 'TransformLambdaHandler', {
      runtime: Runtime.NODEJS_16_X,
      code: Code.fromAsset('src'),
      handler: 'index.transformHandler',
      // reservedConcurrentExecutions: EventbridgeEtlStack.LAMBDA_THROTTLE_SIZE,
      timeout: Duration.seconds(3)
    });
    transformLambda.addToRolePolicy(eventBridgePutPolicy);

    const transformRule = new Rule(this, "TransformRule", {
      description: "Data extracted from S3 needs to be transformed",
      eventBus: eventBus,
      eventPattern: {
        source: ['custom.etl'],
        detailType: ['s3RecordExtraction'],
        detail: {
          status: ['extracted']
        }
      }
    });
    transformRule.addTarget(new LambdaFunction(transformLambda));

    /**
     * Load
     */
    const loadLambda = new Function(this, "LoadLambdaHandler", {
      runtime: Runtime.NODEJS_16_X,
      code: Code.fromAsset("src"),
      handler: 'index.loadHandler',
      timeout: Duration.seconds(3),
      // reservedConcurrentExecutions: EventbridgeEtlStack.LAMBDA_THROTTLE_SIZE,
      environment: {
        TABLE_NAME: table.tableName
      }
    });
    loadLambda.addToRolePolicy(eventBridgePutPolicy);
    table.grantReadWriteData(loadLambda);

    const loadRule = new Rule(this, "LoadRule", {
      description: "Data transformed, needs to be loaded to dynamodb",
      eventBus: eventBus,
      eventPattern: {
        source: ['custom.etl'],
        detailType: ['transform'],
        detail: {
          status: ["transformed"]
        }
      }
    });
    loadRule.addTarget(new LambdaFunction(loadLambda));

    /**
     * Observe
     */
    const observeLambda = new Function(this, "ObserveLambdaHandler", {
      runtime: Runtime.NODEJS_16_X,
      code: Code.fromAsset('src'),
      handler: 'index.observeHandler',
      timeout: Duration.seconds(3),
    });

    const observeRule = new Rule(this, "ObserveRule", {
      description: "All events are monitored here",
      eventBus: eventBus,
      eventPattern: {
        source: ['custom.etl']
      }
    });
    observeRule.addTarget(new LambdaFunction(observeLambda));
  }
}
