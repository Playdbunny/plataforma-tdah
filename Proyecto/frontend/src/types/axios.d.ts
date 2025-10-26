import "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
    _retry?: boolean;
  }

  export interface InternalAxiosRequestConfig<D = any> {
    skipAuthRefresh?: boolean;
    _retry?: boolean;
  }
}