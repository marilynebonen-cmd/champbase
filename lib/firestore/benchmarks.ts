/**
 * Firestore helpers: /benchmarks/{id}
 * List, get, create, update, delete benchmarks.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  Benchmark,
  BenchmarkWithId,
  BenchmarkCategory,
} from "@/types";

const COLLECTION = "benchmarks";
const PAGE_SIZE = 30;

function toDate(t: Timestamp | undefined): Date | undefined {
  if (!t) return undefined;
  return t.toDate ? t.toDate() : new Date((t as unknown as { seconds: number }).seconds * 1000);
}

function toBenchmarkWithId(id: string, d: Record<string, unknown>): BenchmarkWithId {
  return {
    id,
    name: (d.name as string) ?? "",
    nameLower: (d.nameLower as string) ?? "",
    category: (d.category as BenchmarkCategory) ?? "custom",
    scoreType: (d.scoreType as Benchmark["scoreType"]) ?? "custom",
    timeCapSeconds: d.timeCapSeconds != null ? (d.timeCapSeconds as number) : null,
    descriptionRx: (d.descriptionRx as string | null) ?? null,
    descriptionScaled: (d.descriptionScaled as string | null) ?? null,
    defaultTrack: (d.defaultTrack as Benchmark["defaultTrack"]) ?? "rx",
    movements: Array.isArray(d.movements) ? (d.movements as string[]) : null,
    source: (d.source as Benchmark["source"]) ?? "user",
    createdAt: toDate(d.createdAt as Timestamp) ?? new Date(),
    updatedAt: toDate(d.updatedAt as Timestamp) ?? new Date(),
  };
}

export type ListBenchmarksParams = {
  search?: string;
  category?: BenchmarkCategory;
  page?: number;
  pageSize?: number;
};

export type ListBenchmarksResult = {
  items: BenchmarkWithId[];
  nextPage: number | null;
  totalFetched: number;
};

/**
 * List benchmarks with optional search (prefix on nameLower), category filter, and pagination.
 */
export async function listBenchmarks(params: ListBenchmarksParams = {}): Promise<ListBenchmarksResult> {
  const { search, category, page = 1, pageSize = PAGE_SIZE } = params;
  const ref = collection(db, COLLECTION);

  const constraints: ReturnType<typeof where>[] = [];
  if (category) constraints.push(where("category", "==", category));
  const searchLower = (search ?? "").trim().toLowerCase();
  if (searchLower) {
    constraints.push(where("nameLower", ">=", searchLower));
    constraints.push(where("nameLower", "<=", searchLower + "\uf8ff"));
  }

  const order = orderBy("nameLower", "asc");
  const fetchSize = page * pageSize + 1;
  const q = query(ref, ...constraints, order, limit(fetchSize));
  const snap = await getDocs(q);
  const docs = snap.docs;
  const start = (page - 1) * pageSize;
  const pageDocs = docs.slice(start, start + pageSize);
  const items = pageDocs.map((d) => toBenchmarkWithId(d.id, d.data()));
  const hasNext = docs.length > start + pageSize;
  const nextPage = hasNext ? page + 1 : null;

  return {
    items,
    nextPage,
    totalFetched: items.length,
  };
}

export async function getBenchmark(id: string): Promise<BenchmarkWithId | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toBenchmarkWithId(snap.id, snap.data());
}

export type CreateBenchmarkInput = Omit<Benchmark, "createdAt" | "updatedAt">;

export async function createBenchmark(data: CreateBenchmarkInput): Promise<string> {
  const payload: Record<string, unknown> = {
    name: data.name,
    nameLower: (data.name ?? "").trim().toLowerCase(),
    category: data.category,
    scoreType: data.scoreType,
    timeCapSeconds: data.timeCapSeconds ?? null,
    descriptionRx: data.descriptionRx ?? null,
    descriptionScaled: data.descriptionScaled ?? null,
    defaultTrack: data.defaultTrack,
    movements: data.movements ?? null,
    source: data.source,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = collection(db, COLLECTION);
  const docRef = await addDoc(ref, payload);
  return docRef.id;
}

const BENCHMARK_EDIT_FIELDS = [
  "name", "nameLower", "category", "scoreType", "timeCapSeconds",
  "descriptionRx", "descriptionScaled", "defaultTrack", "movements", "source",
] as const;

export async function updateBenchmark(
  id: string,
  data: Partial<Pick<Benchmark, (typeof BENCHMARK_EDIT_FIELDS)[number]>>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const key of BENCHMARK_EDIT_FIELDS) {
    if (key in data && data[key as keyof typeof data] !== undefined) {
      let v = data[key as keyof typeof data];
      if (key === "name" && typeof v === "string") {
        payload.name = v;
        payload.nameLower = v.trim().toLowerCase();
      } else {
        (payload as Record<string, unknown>)[key] = v ?? null;
      }
    }
  }
  await updateDoc(ref, payload);
}

export async function deleteBenchmark(id: string): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}
