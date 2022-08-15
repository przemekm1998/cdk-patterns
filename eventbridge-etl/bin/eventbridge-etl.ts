#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EventbridgeEtlStack } from '../lib/eventbridge-etl-stack';

(async () => {
  const app = new cdk.App();
  new EventbridgeEtlStack(app, "EventBridgeEtlStack");
})()