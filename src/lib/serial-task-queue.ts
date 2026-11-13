/** Preserve cookie-setting request order without letting one failed request stall the queue. */
export function createSerialTaskQueue() {
  let tail: Promise<void> = Promise.resolve();
  return (task: () => Promise<void>): Promise<void> => {
    const next = tail.then(task);
    tail = next.catch(() => {});
    return next;
  };
}
