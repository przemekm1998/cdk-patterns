import datetime
import json
import os
import uuid
import csv

import boto3


def main():
    event_bridge = boto3.client('events')

    s3_bucket_name = os.environ.get("S3_BUCKET_NAME")
    s3_object_key = os.environ.get("S3_OBJECT_KEY")
    event_bus_name = os.environ.get("EVENT_BUS_NAME")

    print('Bucket Name ' + s3_bucket_name)
    print('S3 Object Key ' + s3_object_key)

    file_path = f"/tmp/{str(uuid.uuid4())}.csv"
    s3_resource = boto3.resource('s3')
    s3_resource.Object(s3_bucket_name, s3_object_key).download_file(file_path)

    with open(file_path) as csvfile:
        reader = csv.reader(csvfile, delimiter=',')
        headers = next(reader)
        for row in reader:
            print(', '.join(row))
            event = {
                'status': 'extracted',
                'headers': ["id", "name"],
                'data': [str(uuid.uuid4()), "my-product"]
            }

            event_bridge.put_events(
                Entries=[
                    {
                        'DetailType': 's3RecordExtraction',
                        'EventBusName': event_bus_name,
                        'Source': 'custom.etl',
                        'Time': datetime.datetime.now(),
                        'Detail': json.dumps(event)
                    }
                ]
            )

    exit(0)


if __name__ == '__main__':
    main()

