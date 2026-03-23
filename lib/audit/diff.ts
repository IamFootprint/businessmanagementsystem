function isObjectLike(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPrimitive(value: unknown) {
  return value == null || (typeof value !== "object" && typeof value !== "function");
}

function areDatesEquivalent(a: unknown, b: unknown) {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return false;
}

function compareValues(beforeValue: unknown, afterValue: unknown) {
  if (beforeValue === afterValue) return true;
  if (areDatesEquivalent(beforeValue, afterValue)) return true;
  return false;
}

export function computeChangedFields(beforeValue: unknown, afterValue: unknown): string[] {
  const changed = new Set<string>();

  function visit(beforeNode: unknown, afterNode: unknown, path: string) {
    if (compareValues(beforeNode, afterNode)) return;

    if (isPrimitive(beforeNode) || isPrimitive(afterNode)) {
      changed.add(path || "$root");
      return;
    }

    if (Array.isArray(beforeNode) || Array.isArray(afterNode)) {
      const beforeArray = Array.isArray(beforeNode) ? beforeNode : [];
      const afterArray = Array.isArray(afterNode) ? afterNode : [];
      const maxLength = Math.max(beforeArray.length, afterArray.length);
      for (let index = 0; index < maxLength; index += 1) {
        const nextPath = path ? `${path}[${index}]` : `[${index}]`;
        visit(beforeArray[index], afterArray[index], nextPath);
      }
      return;
    }

    if (!isObjectLike(beforeNode) || !isObjectLike(afterNode)) {
      changed.add(path || "$root");
      return;
    }

    const keys = new Set([...Object.keys(beforeNode), ...Object.keys(afterNode)]);
    for (const key of keys) {
      const nextPath = path ? `${path}.${key}` : key;
      visit(beforeNode[key], afterNode[key], nextPath);
    }
  }

  visit(beforeValue, afterValue, "");
  return Array.from(changed).sort();
}
