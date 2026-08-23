import { PrismaClient } from "@prisma/client";
import { prisma } from "./client";

// Models that always belong to one studio. User/Session stay global.
const ORG_SCOPED = new Set([
  "Client",
  "Booking",
  "Invoice",
  "FeatureOverride",
  "ImportBatch",
]);

function delegateName(model: string) {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

/**
 * Returns a Prisma client that injects orgId on every org-scoped query.
 * A forgotten WHERE cannot leak Studio A's clients to Studio B.
 */
export function prismaForOrg(orgId: string) {
  return prisma.$extends({
    name: "orgTenant",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!ORG_SCOPED.has(model)) {
            return query(args);
          }

          const db = prisma as PrismaClient;
          const delegate = (db as never)[delegateName(model)] as Record<
            string,
            (a: unknown) => Promise<unknown>
          >;

          // Unique-where operations cannot take extra orgId — rewrite them.
          if (operation === "findUnique" || operation === "findUniqueOrThrow") {
            const op =
              operation === "findUnique" ? "findFirst" : "findFirstOrThrow";
            const where = { ...(args as { where: object }).where, orgId };
            return delegate[op]({ ...(args as object), where });
          }

          if (operation === "update" || operation === "delete") {
            const manyOp = operation === "update" ? "updateMany" : "deleteMany";
            const { where, data, ...rest } = args as {
              where: object;
              data?: object;
            };
            const scoped = { ...where, orgId };
            await delegate[manyOp]({
              where: scoped,
              ...(data ? { data } : {}),
            });
            return delegate.findFirst({ ...rest, where: scoped });
          }

          if (operation === "create") {
            const a = args as { data: object };
            a.data = { ...a.data, orgId };
            return query(args);
          }

          if (operation === "upsert") {
            const a = args as { create: object };
            a.create = { ...a.create, orgId };
            return query(args);
          }

          if (operation === "createMany") {
            const a = args as { data: object | object[] };
            a.data = Array.isArray(a.data)
              ? a.data.map((row) => ({ ...row, orgId }))
              : { ...a.data, orgId };
            return query(args);
          }

          const a = args as { where?: object };
          a.where = { ...(a.where ?? {}), orgId };
          return query(args);
        },
      },
    },
  });
}
