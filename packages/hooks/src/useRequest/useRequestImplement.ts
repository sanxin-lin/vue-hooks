import {
  reactive,
  toRefs,
  onScopeDispose,
  inject,
  UnwrapRef,
  watchEffect,
  computed,
  isRef,
  unref,
} from 'vue';
import { merge } from 'lodash';
import { Fetch } from './fetch';
import { USEREQUEST_GLOBAL_OPTIONS_PROVIDE_KEY } from './config';
import {
  UseRequestFetchState,
  UseRequestOptions,
  UseRequestPlugin,
  useRequestResult,
  UseRequestService,
} from './types';

const isUseRequestFetchState = <TData, TParams extends any[]>(
  state: unknown,
): state is UseRequestFetchState<TData, TParams> => {
  const keys = Object.keys(state as object);
  return keys.every(i => ['data', 'loading', 'params', 'error'].includes(i));
};

export const useRequestImplement = <TData, TParams extends any[]>(
  service: UseRequestService<TData, TParams>,
  options: UseRequestOptions<TData, TParams, any> = {},
  plugins: UseRequestPlugin<TData, TParams>[] = [],
) => {
  // global option
  const USEREQUEST_GLOBAL_OPTIONS = inject<Record<string, any>>(
    USEREQUEST_GLOBAL_OPTIONS_PROVIDE_KEY,
    {},
  );
  // read option
  const {
    initialData = undefined,
    manual = false,
    ready = true,
    ...rest
  } = {
    ...(USEREQUEST_GLOBAL_OPTIONS ?? {}),
    ...(options ?? {}),
  };

  const fetchOptions = {
    manual,
    ready,
    ...rest,
  };

  const state = reactive<UseRequestFetchState<TData, TParams>>({
    data: initialData,
    loading: false,
    params: undefined,
    error: undefined,
  });

  const setState = (currentState: any, field?: keyof typeof state) => {
    if (field) {
      state[field] = currentState;
    } else {
      if (isUseRequestFetchState<UnwrapRef<TData>, UnwrapRef<TParams>>(currentState)) {
        state.data = currentState.data;
        state.loading = currentState.loading;
        state.error = currentState.error;
        state.params = currentState.params;
      }
    }
  };

  const initState = plugins.map(p => p?.onInit?.(fetchOptions)).filter(Boolean);

  const fetchInstance: Fetch<TData, TParams> = new Fetch<TData, TParams>({
    service,
    options: fetchOptions,
    onUpdateState: setState,
    initState: merge({}, ...initState, state),
  });

  fetchInstance.setPluginsImpls(plugins.map(p => p(fetchInstance, fetchOptions)));

  const readyComputed = computed(() => (isRef(ready) ? ready.value : ready));

  watchEffect(() => {
    if (!manual) {
      const { defaultParams, refreshDeps } = options;
      const params = (fetchInstance.getState().params ?? defaultParams ?? []) as TParams;
      if (readyComputed.value && refreshDeps === true) {
        fetchInstance.run(...params);
      }
    }
  });
  if (!manual && options.refreshDeps !== true) {
    const params = (fetchInstance.getState().params ?? options.defaultParams ?? []) as TParams;
    if (unref(ready)) fetchInstance.run(...(params as TParams));
  }

  onScopeDispose(() => {
    fetchInstance.cancel();
  });

  return {
    ...toRefs(state),
    cancel: fetchInstance.cancel.bind(fetchInstance),
    refresh: fetchInstance.refresh.bind(fetchInstance),
    refreshAsync: fetchInstance.refreshAsync.bind(fetchInstance),
    run: fetchInstance.run.bind(fetchInstance),
    runAsync: fetchInstance.runAsync.bind(fetchInstance),
    mutate: fetchInstance.mutate.bind(fetchInstance),
  } as unknown as useRequestResult<TData, TParams>;
};
