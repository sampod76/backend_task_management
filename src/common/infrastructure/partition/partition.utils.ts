import { PartitionTableConfig } from './partition.types';
export const parsePartitionTable = (
  fullTableName: string,
): PartitionTableConfig => {
  const [schema, table] = fullTableName.split('.');
  return { schema, table };
};
