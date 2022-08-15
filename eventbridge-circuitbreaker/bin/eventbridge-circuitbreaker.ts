#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EventbridgeCircuitbreakerStack } from '../lib/eventbridge-circuitbreaker-stack';

(async () => {
  const app = new cdk.App();
  new EventbridgeCircuitbreakerStack(app, "EventbridgeCircuitbreakerStack");
})()