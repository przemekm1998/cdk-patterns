export const createHandler = async (event: any = {}): Promise<void> => {
  console.log("request: ", JSON.stringify(event, undefined, 2));

  const records: any[] = event.Records;

  for(const index in records) {
    const payload = records[index].body;
    console.log('received message ' + payload);
  }
};