export interface DataConnectionSource extends EventTarget {
  saveData?: boolean;
}

export interface NavigatorDataSource {
  connection?: DataConnectionSource;
}

const resolveNavigatorSource = (source?: NavigatorDataSource): NavigatorDataSource | undefined => {
  if (source) return source;
  if (typeof navigator === 'undefined') return undefined;
  return navigator as Navigator & NavigatorDataSource;
};

export const prefersReducedData = (source?: NavigatorDataSource): boolean =>
  Boolean(resolveNavigatorSource(source)?.connection?.saveData);

export const observeReducedData = (
  listener: (reduced: boolean) => void,
  source?: NavigatorDataSource,
): (() => void) => {
  const connection = resolveNavigatorSource(source)?.connection;
  if (!connection) {
    listener(false);
    return () => undefined;
  }

  const onChange = (): void => listener(Boolean(connection.saveData));
  listener(Boolean(connection.saveData));
  connection.addEventListener('change', onChange);
  return () => connection.removeEventListener('change', onChange);
};
