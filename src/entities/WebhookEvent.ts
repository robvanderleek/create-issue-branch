export interface WebhookEvent {
    timestamp: Date;
    name: string;
    action: string;
    owner: string;
    repo: string;
}