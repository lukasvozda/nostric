import { writable } from "svelte/store";
import type {
  Writable,
  Subscriber,
  Invalidator,
  Unsubscriber,
} from "svelte/store";

export enum AlertTypes {
  SUCCESS,
  WARNING,
  ERROR,
}

export type AlertType =
  | AlertTypes.SUCCESS
  | AlertTypes.WARNING
  | AlertTypes.ERROR;

export type Alert = {
  title: string;
  message: string;
  type: AlertType;
};

export type AlertStore = {
  hide: () => void;
  subscribe: (
    this: void,
    run: Subscriber<boolean>,
    invalidate?: Invalidator<boolean>,
  ) => Unsubscriber;
  clear: () => void;
  show: () => void;
  fill: (title: string, message: string, type: AlertType) => void;
  getData: () => Alert | null;
};

export function getAlert(): AlertStore {
  const visible: Writable<boolean> = writable<boolean>(true);
  const { subscribe, set } = visible;

  let data: Alert | null = {
    title: "bla",
    message: "bla",
    type: AlertTypes.ERROR,
  };

  const fill = (title: string, message: string, type: AlertType): void => {
    data = { title, message, type };
    show();
  };

  const getData = (): Alert | null => {
    return data;
  };

  const clear = (): void => {
    data = null;
    hide();
  };

  const hide = (): void => {
    set(false);
  };

  const show = (): void => {
    set(true);
  };

  return {
    subscribe,
    fill,
    clear,
    hide,
    show,
    getData,
  };
}

export const alert: AlertStore = getAlert();
