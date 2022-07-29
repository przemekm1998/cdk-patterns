#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DynamoStreamerStack } from '../lib/dynamo-streamer-stack';


(async () => {
  const app = new cdk.App();
  new DynamoStreamerStack(app, "DynamoStreamerStack");
})();