import {MongoClient, MongoClientOptions} from "mongodb";
import {WebhookEvent} from "../entities/WebhookEvent";

export class MongoDbService {
    client?: MongoClient = undefined;

    async getDatabase() {
        if (!this.client) {
            const options: MongoClientOptions = {
                authSource: 'admin',
            };
            const connectionString = process.env.CREATE_ISSUE_BRANCH_MONGODB;
            if (!connectionString) {
                throw new Error('Environment variable CREATE_ISSUE_BRANCH_MONGODB not set');
            } else {
                this.client = await MongoClient.connect(connectionString, options);
            }
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