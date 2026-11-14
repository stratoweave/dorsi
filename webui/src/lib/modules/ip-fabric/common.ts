import { arrayAt, at, isRecord, stringAt } from '$lib/core/util/json';

/** The container that holds every fabric. */
export const FABRIC_COLLECTION_ROOT = 'data/ip-fabric:ip-fabric';

/** The entries of one list below the fabrics, with the name of their fabric. */
export function fabricChildren(
  input: unknown,
  list: 'switch' | 'fabric-link' | 'server'
): { fabric: string; entry: unknown }[] {
  const out: { fabric: string; entry: unknown }[] = [];
  const fabrics = at(input, 'ip-fabric:ip-fabric', 'fabric');

  if (!Array.isArray(fabrics)) {
    return out;
  }

  for (const fabric of fabrics) {
    for (const entry of arrayAt(fabric, list)) {
      out.push({ fabric: stringAt(fabric, 'name'), entry });
    }
  }

  return out;
}

/** The entry of a RESTCONF GET of one list entry: `{ "<module>:<list>": [entry] }`. */
export function singleEntry(input: unknown, list: string, requiredKey: string): unknown {
  const wrapped = at(input, `ip-fabric:${list}`, 0);

  if (wrapped !== undefined) {
    return wrapped;
  }

  return isRecord(input) && requiredKey in input ? input : null;
}

/** Split a route id into `count` parts, padding with empty strings. The id
 * arrives percent-decoded already. */
export function splitRouteId(id: string, count: number): string[] {
  const parts = id.split(',').map((part) => part.trim());

  while (parts.length < count) {
    parts.push('');
  }

  return parts.slice(0, count);
}

export function keyPart(key: string | string[] | undefined, index: number): string {
  const parts = Array.isArray(key) ? key : key === undefined ? [] : [key];
  return parts[index] ?? '';
}
