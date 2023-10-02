import { isFunction, isArray } from 'lodash';
import type {
  UseRequestFetchState,
  UseRequestOptions,
  UseRequestPluginReturn,
  UseRequestService,
} from './types';

export class Fetch<TData, TParams extends unknown[] = any> {
  private pluginImpls: UseRequestPluginReturn<TData, TParams>[] = [];
  private count = 0;

  private state: UseRequestFetchState<TData, TParams> = {
    loading: false,
    params: undefined,
    data: undefined,
    error: undefined,
  };

  private previousValidData?: TData;

  private service: UseRequestService<TData, TParams>;
  private options: UseRequestOptions<TData, TParams, any> = {};
  private onUpdateState?: (
    currentState: UseRequestFetchState<TData, TParams>,
    key?: keyof UseRequestFetchState<TData, TParams>,
  ) => void;

  constructor({
    service,
    options = {},
    onUpdateState,
    initState,
  }: {
    service: UseRequestService<TData, TParams>;
    options: UseRequestOptions<TData, TParams, any>;
    onUpdateState?: (
      currentState: UseRequestFetchState<TData, TParams>,
      key?: keyof UseRequestFetchState<TData, TParams>,
    ) => void;
    initState: Partial<UseRequestFetchState<TData, TParams>>;
  }) {
    this.service = service;
    this.options = options;
    this.onUpdateState = onUpdateState;
    this.state = {
      ...this.state,
      loading: !options.manual,
      ...initState,
    };
  }

  setPluginsImpls(pluginImpls: UseRequestPluginReturn<TData, TParams>[] = []) {
    this.pluginImpls = pluginImpls;
  }

  setState(value: Partial<UseRequestFetchState<TData, TParams>> = {}) {
    this.state = {
      ...this.state,
      ...value,
    };
    this.onUpdateState?.(this.state);
  }

  setFetchState(
    data: any,
    key?:
      | keyof UseRequestFetchState<TData, TParams>
      | (keyof UseRequestFetchState<TData, TParams>)[],
  ) {
    if (key) {
      if (isArray(key)) {
        key.forEach(k => {
          this.state[k] = data;
          this.onUpdateState?.(data, k);
        });
      } else {
        this.state[key] = data;
        this.onUpdateState?.(data, key);
      }
    }
  }

  runPluginHandler<T extends keyof UseRequestPluginReturn<TData, TParams>>(
    event: T,
    ...rest: unknown[]
  ) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const r = (this.pluginImpls?.map(i => i[event]?.(...rest)) ?? [])?.filter(Boolean);
    return Object.assign({}, ...r);
  }

  async runAsync(...params: TParams): Promise<TData> {
    const { onBefore, formatResult, onSuccess, onFinally, onError, rollbackOnError } = this.options;
    this.count += 1;
    const _count = this.count;
    const {
      stopNow = false,
      returnNow = false,
      ...state
    } = this.runPluginHandler('onBefore', params);

    if (stopNow) {
      return new Promise(() => {});
    }

    this.setState({
      loading: true,
      params,
      ...state,
    });

    if (returnNow) {
      return Promise.resolve(state.data);
    }

    onBefore?.(params);

    try {
      let { servicePromise } = this.runPluginHandler('onRequest', this.service, params);
      const responseFn = (res: any) => {
        if (_count !== this.count) {
          return new Promise(() => {});
        }

        const _res = formatResult ? formatResult(res) : res;

        this.setState({
          data: _res,
          error: undefined,
          loading: false,
        });

        onSuccess?.(_res, params);

        this.runPluginHandler('onSuccess', _res, params);

        this.previousValidData = _res;

        onFinally?.(params, _res, undefined);

        this.runPluginHandler('onFinally', params, _res, undefined);

        return _res;
      };

      if (!servicePromise) {
        servicePromise = this.service(...params);
      }
      const res = await servicePromise;
      return responseFn(res);
    } catch (error) {
      if (_count !== this.count) {
        return new Promise(() => {});
      }

      this.setState({
        error,
        loading: false,
      });

      onError?.(error as Error, params);
      this.runPluginHandler('onError', error, params);

      if (rollbackOnError) {
        this.setState({
          data: this.previousValidData,
        });
      }

      onFinally?.(params, undefined, error as Error);

      this.runPluginHandler('onFinally', params, undefined, error);

      throw error;
    }
  }

  run(...params: TParams) {
    this.runAsync(...params).catch(error => {
      if (!this.options.onError) {
        console.error(error);
      }
    });
  }

  cancel() {
    this.count -= 1;
    this.setState({
      loading: false,
    });

    this.runPluginHandler('onCancel');
  }

  refresh() {
    const params = (this.state.params ?? []) as TParams;
    this.run(...params);
  }

  refreshAsync() {
    const params = (this.state.params ?? []) as TParams;
    return this.runAsync(...params);
  }

  mutate(data?: TData | ((oldData?: TData) => TData | undefined)) {
    const _data = isFunction(data) ? data(this.state.data) : data;
    this.runPluginHandler('onMutate', _data);
    this.setState({
      data: _data,
    });
  }

  getState() {
    return this.state;
  }

  getOptions() {
    return this.options;
  }
}

export default Fetch;
