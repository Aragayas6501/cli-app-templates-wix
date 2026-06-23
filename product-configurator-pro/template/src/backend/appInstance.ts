import { appInstances } from "@wix/app-management";
import { auth } from "@wix/essentials";

export type AppInstance = appInstances.AppInstance;

export const getAppInstanceElevated = async () => {
  const elevatedGetAppInstance = auth.elevate(appInstances.getAppInstance);
  return (await elevatedGetAppInstance()).instance;
};

export const isPremiumInstance = (instance: AppInstance | undefined) =>
  Boolean(instance?.billing) && !instance?.isFree;
