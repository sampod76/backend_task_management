// src/prisma/extensions/soft-delete.extension.ts

import { Prisma } from 'src/generated/prisma/client';

type SoftDeleteQueryArgs = {
  withDeleted?: boolean;
  where?: Record<string, unknown>;
};

const SOFT_DELETE_MODELS = new Set(['User', 'Admin', 'File']);

export const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',

  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        if (!SOFT_DELETE_MODELS.has(model)) {
          return query(args);
        }

        const softDeleteArgs = args as SoftDeleteQueryArgs;

        if (softDeleteArgs.withDeleted) {
          // when need to get deleted data
          delete softDeleteArgs.withDeleted;
          return query(args); // 🚀 skip filter
        }

        args.where = {
          deletedAt: null,
          ...(args.where ?? {}),
        };

        return query(args);
      },

      async findFirst({ model, args, query }) {
        if (!SOFT_DELETE_MODELS.has(model)) {
          return query(args);
        }

        args.where = {
          deletedAt: null,
          ...(args.where ?? {}),
        };

        return query(args);
      },
      // এটা ❌ risky Prisma findUnique strict
      // async findUnique({ args, query }) {
      //   args.where = {
      //     ...(args.where ?? {}),
      //     deletedAt: null,
      //   };

      //   return query(args);
      // },

      async count({ model, args, query }) {
        if (!SOFT_DELETE_MODELS.has(model)) {
          return query(args);
        }

        args.where = {
          deletedAt: null,
          ...(args.where ?? {}),
        };

        return query(args);
      },
    },
  },
});
