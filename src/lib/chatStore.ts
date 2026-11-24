import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, updateDoc, writeBatch, type Timestamp } from "firebase/firestore";
import type { ChatMessage } from "./chat";
import { getFirebase } from "./firebase";

// Where chats live in Firestore (database "RailAssist" project):
//   users/{uid}/chats/{chatId}     title + last used time (small, used for the list)
//   users/{uid}/messages/{chatId}  the messages themselves, as one JSON string
// Security rules only allow a person to read and write under their own users/{uid}.

export interface ChatMeta {
  id: string;
  title: string;
  updatedAt: number;
}

const db = () => {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured");
  return fb.db;
};
const chatsCol = (uid: string) => collection(db(), "users", uid, "chats");
const chatDoc = (uid: string, id: string) => doc(db(), "users", uid, "chats", id);
const bodyDoc = (uid: string, id: string) => doc(db(), "users", uid, "messages", id);

/** Live list of this person's chats, newest first. Returns the unsubscribe function. */
export function watchChats(uid: string, onList: (list: ChatMeta[]) => void, onError: () => void) {
  return onSnapshot(
    query(chatsCol(uid), orderBy("updatedAt", "desc")),
    (snap) =>
      onList(
        snap.docs.map((d) => {
          const data = d.data({ serverTimestamps: "estimate" });
          return { id: d.id, title: String(data.title ?? ""), updatedAt: (data.updatedAt as Timestamp | null)?.toMillis?.() ?? Date.now() };
        }),
      ),
    onError,
  );
}

export async function loadMessages(uid: string, id: string): Promise<ChatMessage[]> {
  const snap = await getDoc(bodyDoc(uid, id));
  try {
    const parsed = JSON.parse(String(snap.data()?.json ?? "[]"));
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

/** `title` is only written when given, so a name the person chose is never overwritten. */
export async function saveChat(uid: string, id: string, title: string | null, messages: ChatMessage[]) {
  const batch = writeBatch(db());
  batch.set(chatDoc(uid, id), title === null ? { updatedAt: serverTimestamp() } : { title, updatedAt: serverTimestamp() }, { merge: true });
  batch.set(bodyDoc(uid, id), { json: JSON.stringify(messages.slice(-60)) });
  await batch.commit();
}

export async function renameChat(uid: string, id: string, title: string) {
  await updateDoc(chatDoc(uid, id), { title });
}

export async function deleteChat(uid: string, id: string) {
  const batch = writeBatch(db());
  batch.delete(chatDoc(uid, id));
  batch.delete(bodyDoc(uid, id));
  await batch.commit();
}

/** Deletes every chat this person has saved. */
export async function deleteAllChats(uid: string) {
  const snap = await getDocs(chatsCol(uid));
  for (let i = 0; i < snap.docs.length; i += 200) {
    const batch = writeBatch(db());
    for (const d of snap.docs.slice(i, i + 200)) {
      batch.delete(d.ref);
      batch.delete(bodyDoc(uid, d.id));
    }
    await batch.commit();
  }
}
