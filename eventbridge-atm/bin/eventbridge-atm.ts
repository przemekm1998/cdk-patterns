#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EventbridgeAtmStack } from '../lib/eventbridge-atm-stack';

(async () => {
  const app = new cdk.App();
  new EventbridgeAtmStack(app, "EventBridgeAtmStack");
})();