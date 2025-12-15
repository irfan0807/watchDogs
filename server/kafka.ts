import { Kafka, Producer, Consumer, EachMessagePayload } from "kafkajs";

const brokers = process.env.KAFKA_BROKERS?.split(",") || ["localhost:9092"];

export const kafka = new Kafka({
  clientId: "watchdog-messenger",
  brokers,
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
});

let producer: Producer | null = null;
let consumer: Consumer | null = null;

// Topics
export const TOPICS = {
  MESSAGE_EVENTS: "message-events",
  USER_EVENTS: "user-events",
  NOTIFICATION_EVENTS: "notification-events",
} as const;

// Initialize producer
export async function initProducer(): Promise<Producer> {
  if (!producer) {
    producer = kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
    
    await producer.connect();
    console.log("✓ Kafka producer connected");
  }
  return producer;
}

// Initialize consumer
export async function initConsumer(groupId: string): Promise<Consumer> {
  if (!consumer) {
    consumer = kafka.consumer({ 
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
    
    await consumer.connect();
    console.log("✓ Kafka consumer connected");
  }
  return consumer;
}

// Publish message event
export async function publishMessageEvent(event: {
  type: "send" | "receive" | "read" | "delete";
  messageId: string;
  senderId: string;
  recipientId: string;
  timestamp: Date;
  data?: any;
}): Promise<void> {
  const prod = await initProducer();
  
  await prod.send({
    topic: TOPICS.MESSAGE_EVENTS,
    messages: [
      {
        key: event.messageId,
        value: JSON.stringify(event),
        timestamp: event.timestamp.getTime().toString(),
      },
    ],
  });
}

// Publish user event
export async function publishUserEvent(event: {
  type: "online" | "offline" | "registered" | "updated";
  userId: string;
  timestamp: Date;
  data?: any;
}): Promise<void> {
  const prod = await initProducer();
  
  await prod.send({
    topic: TOPICS.USER_EVENTS,
    messages: [
      {
        key: event.userId,
        value: JSON.stringify(event),
        timestamp: event.timestamp.getTime().toString(),
      },
    ],
  });
}

// Publish notification event
export async function publishNotificationEvent(event: {
  type: "message" | "contact_request" | "contact_accepted";
  userId: string;
  timestamp: Date;
  data: any;
}): Promise<void> {
  const prod = await initProducer();
  
  await prod.send({
    topic: TOPICS.NOTIFICATION_EVENTS,
    messages: [
      {
        key: event.userId,
        value: JSON.stringify(event),
        timestamp: event.timestamp.getTime().toString(),
      },
    ],
  });
}

// Subscribe to message events
export async function subscribeToMessageEvents(
  handler: (payload: EachMessagePayload) => Promise<void>
): Promise<void> {
  const cons = await initConsumer("message-events-group");
  
  await cons.subscribe({ 
    topic: TOPICS.MESSAGE_EVENTS,
    fromBeginning: false,
  });
  
  await cons.run({
    eachMessage: handler,
  });
}

// Subscribe to user events
export async function subscribeToUserEvents(
  handler: (payload: EachMessagePayload) => Promise<void>
): Promise<void> {
  const cons = await initConsumer("user-events-group");
  
  await cons.subscribe({ 
    topic: TOPICS.USER_EVENTS,
    fromBeginning: false,
  });
  
  await cons.run({
    eachMessage: handler,
  });
}

// Graceful shutdown
export async function shutdownKafka(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    console.log("✓ Kafka producer disconnected");
  }
  if (consumer) {
    await consumer.disconnect();
    console.log("✓ Kafka consumer disconnected");
  }
}

// Handle process termination
process.on("SIGTERM", shutdownKafka);
process.on("SIGINT", shutdownKafka);

export default kafka;
