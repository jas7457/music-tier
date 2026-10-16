import { ObjectId } from 'mongodb';

/**
 * A tiny in-memory stand-in for the MongoDB driver, covering just the query
 * shapes lib/data.ts uses: equality (including "array contains"), `$in`,
 * `sort({ field: 1 | -1 })`, `find().toArray()` and `findOne()`.
 *
 * Matching is type-strict like real MongoDB: an ObjectId never equals its hex
 * string, so a test fails if the code mixes the two up.
 */

type Doc = Record<string, unknown>;
type Filter = Record<string, unknown>;

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a instanceof ObjectId || b instanceof ObjectId) {
    return a instanceof ObjectId && b instanceof ObjectId && a.equals(b);
  }
  return a === b;
}

function fieldMatches(docValue: unknown, condition: unknown): boolean {
  if (
    condition !== null &&
    typeof condition === 'object' &&
    !(condition instanceof ObjectId)
  ) {
    const operators = Object.keys(condition);
    const unsupported = operators.filter((op) => op !== '$in');
    if (unsupported.length > 0) {
      throw new Error(`fakeMongo: unsupported operator(s) ${unsupported}`);
    }
    const candidates = (condition as { $in: unknown[] }).$in;
    return candidates.some((candidate) => fieldMatches(docValue, candidate));
  }
  if (Array.isArray(docValue)) {
    return docValue.some((item) => valuesEqual(item, condition));
  }
  return valuesEqual(docValue, condition);
}

function matches(doc: Doc, filter: Filter): boolean {
  return Object.entries(filter).every(([key, condition]) =>
    fieldMatches(doc[key], condition),
  );
}

function compare(a: unknown, b: unknown): number {
  const left = a instanceof ObjectId ? a.toHexString() : a;
  const right = b instanceof ObjectId ? b.toHexString() : b;
  if (left === right) return 0;
  return (left as number | string) < (right as number | string) ? -1 : 1;
}

export class FakeCollection<T extends Doc = Doc> {
  docs: T[] = [];

  insert(...docs: T[]) {
    this.docs.push(...docs);
  }

  find(filter: Filter = {}) {
    let results = this.docs.filter((doc) => matches(doc, filter));
    const cursor = {
      sort(spec: Record<string, 1 | -1>) {
        const entries = Object.entries(spec);
        results = [...results].sort((a, b) => {
          for (const [key, direction] of entries) {
            const result = compare(a[key], b[key]) * direction;
            if (result !== 0) return result;
          }
          return 0;
        });
        return cursor;
      },
      async toArray() {
        // Hand back copies, like the real driver deserialising fresh objects.
        return results.map((doc) => structuredCloneDoc(doc));
      },
    };
    return cursor;
  }

  async findOne(filter: Filter = {}) {
    const doc = this.docs.find((d) => matches(d, filter));
    return doc ? structuredCloneDoc(doc) : null;
  }

  async insertOne(doc: T) {
    this.docs.push(structuredCloneDoc(doc));
    return { acknowledged: true, insertedId: doc._id };
  }

  async insertMany(docs: T[]) {
    this.docs.push(...docs.map((doc) => structuredCloneDoc(doc)));
    return { acknowledged: true, insertedCount: docs.length };
  }

  async deleteOne(filter: Filter) {
    const index = this.docs.findIndex((d) => matches(d, filter));
    if (index !== -1) this.docs.splice(index, 1);
    return { acknowledged: true, deletedCount: index === -1 ? 0 : 1 };
  }

  async deleteMany(filter: Filter) {
    const before = this.docs.length;
    this.docs = this.docs.filter((d) => !matches(d, filter));
    return { acknowledged: true, deletedCount: before - this.docs.length };
  }

  /** Supports `$set` and `$unset`, returning the document after the update. */
  async findOneAndUpdate(
    filter: Filter,
    update: { $set?: Doc; $unset?: Record<string, unknown> },
  ) {
    const unsupported = Object.keys(update).filter(
      (op) => op !== '$set' && op !== '$unset',
    );
    if (unsupported.length > 0) {
      throw new Error(`fakeMongo: unsupported update(s) ${unsupported}`);
    }
    const doc = this.docs.find((d) => matches(d, filter));
    if (!doc) return null;
    Object.assign(doc, update.$set ?? {});
    for (const key of Object.keys(update.$unset ?? {})) {
      delete (doc as Doc)[key];
    }
    return structuredCloneDoc(doc);
  }
}

function structuredCloneDoc<T extends Doc>(doc: T): T {
  // structuredClone drops ObjectId's prototype, so copy shallowly and clone
  // arrays/plain objects one level down; ObjectIds are kept as-is (immutable).
  const copy: Doc = {};
  for (const [key, value] of Object.entries(doc)) {
    if (Array.isArray(value)) {
      copy[key] = [...value];
    } else if (
      value !== null &&
      typeof value === 'object' &&
      !(value instanceof ObjectId)
    ) {
      copy[key] = { ...value };
    } else {
      copy[key] = value;
    }
  }
  return copy as T;
}

export class FakeDb {
  private collections = new Map<string, FakeCollection>();

  collection<T extends Doc = Doc>(name: string): FakeCollection<T> {
    let collection = this.collections.get(name);
    if (!collection) {
      collection = new FakeCollection();
      this.collections.set(name, collection);
    }
    return collection as unknown as FakeCollection<T>;
  }

  /** Empties every collection but keeps the same objects (lib/data.ts caches them). */
  reset() {
    this.collections.forEach((collection) => {
      collection.docs = [];
    });
  }
}

export const fakeDb = new FakeDb();
