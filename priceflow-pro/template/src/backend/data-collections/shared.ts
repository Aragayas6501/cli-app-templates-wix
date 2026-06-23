import type { DataCollection } from "@wix/astro/builders";

type Field = DataCollection["fields"][number];
type Index = NonNullable<DataCollection["indexes"]>[number];

export const privilegedPermissions = {
  itemRead: "PRIVILEGED",
  itemInsert: "PRIVILEGED",
  itemUpdate: "PRIVILEGED",
  itemRemove: "PRIVILEGED",
} as const;

export const instanceField: Field = {
  key: "instanceId",
  displayName: "Instance ID",
  type: "TEXT",
};

export function textField(key: string, displayName: string): Field {
  return { key, displayName, type: "TEXT" };
}

export function numberField(key: string, displayName: string): Field {
  return { key, displayName, type: "NUMBER" };
}

export function booleanField(key: string, displayName: string): Field {
  return { key, displayName, type: "BOOLEAN" };
}

export function dateTimeField(key: string, displayName: string): Field {
  return { key, displayName, type: "DATETIME" };
}

export function objectField(key: string, displayName: string): Field {
  return { key, displayName, type: "OBJECT", objectOptions: { fields: [] } };
}

export function arrayStringField(key: string, displayName: string): Field {
  return { key, displayName, type: "ARRAY_STRING" };
}

export function referenceField(
  key: string,
  displayName: string,
  referencedCollectionId: string
): Field {
  return {
    key,
    displayName,
    type: "REFERENCE",
    referenceOptions: { referencedCollectionId },
  };
}

export function instanceIndex(extraPath?: string): Index {
  return {
    fields: extraPath
      ? [{ path: "instanceId" }, { path: extraPath }]
      : [{ path: "instanceId" }],
  };
}

export function uniqueIndex(...paths: string[]): Index {
  return { fields: paths.map((path) => ({ path })), unique: true };
}

export function collection(
  idSuffix: string,
  displayName: string,
  displayField: string,
  fields: Field[],
  indexes: Index[] = [instanceIndex()]
): DataCollection {
  return {
    idSuffix,
    displayName,
    displayField,
    fields: [instanceField, ...fields],
    dataPermissions: privilegedPermissions,
    indexes,
    initialData: [],
  };
}

