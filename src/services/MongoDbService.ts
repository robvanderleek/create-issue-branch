import {MongoClient, MongoClientOptions} from "mongodb";
import {WebhookEvent} from "../entities/WebhookEvent.ts";

export class MongoDbService {
    connectionString: string;
    client?: MongoClient = undefined;

    constructor(connectionString: string) {
        this.connectionString = connectionString;
    }

    async getDatabase() {
        if (!this.client) {
            const options: MongoClientOptions = {
                authSource: 'admin',
            };
            this.client = await MongoClient.connect(this.connectionString, options);
        }
        return this.client.db('create-issue-branch');
    }

    async storeEvent(event: WebhookEvent) {
        const db = await this.getDatabase();
        const collection = db.collection<WebhookEvent>('action');
        await collection.insertOne(event);
    }

    disconnect() {
        this.client?.close();
    }
}