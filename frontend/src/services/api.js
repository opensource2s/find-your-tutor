import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const publicApi = axios.create({ baseURL: `${API_URL}/api` });

export function useApi() {
  const { getAccessTokenSilently } = useAuth0();
  const request = async (config) => {
    const token = await getAccessTokenSilently({
      authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE, scope: "openid profile email" },
    });
    return axios({ baseURL: `${API_URL}/api`, ...config, headers: { ...(config.headers || {}), Authorization: `Bearer ${token}` } });
  };
  return {
    get: (url, config={}) => request({ ...config, method:"GET", url }),
    post: (url, data, config={}) => request({ ...config, method:"POST", url, data }),
    patch: (url, data, config={}) => request({ ...config, method:"PATCH", url, data }),
    put: (url, data, config={}) => request({ ...config, method:"PUT", url, data }),
    delete: (url, config={}) => request({ ...config, method:"DELETE", url }),
  };
}
