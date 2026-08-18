import { connectToDatabase } from "@/lib/db/mongodb";
import MessageModel, { type MessageDoc } from "@/models/Message";
import MessagesInbox from "@/components/admin/MessagesInbox";

export const dynamic = "force-dynamic";

async function all(): Promise<MessageDoc[]> {
  try {
    await connectToDatabase();
    const docs = await MessageModel.find({}).sort({ createdAt: -1 }).limit(300).lean();
    return JSON.parse(JSON.stringify(docs)) as MessageDoc[];
  } catch {
    return [];
  }
}

export default async function Page() {
  return <MessagesInbox initial={await all()} />;
}
