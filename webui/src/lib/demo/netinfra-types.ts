// Data shapes of the netinfra fixtures. The demo mode still uses them.

export interface NetinfraRouterApi {
  name?: string;
  id?: number;
  type?: string;
  role?: string;
  asn?: number;
  'approval-required'?: boolean;
}

export interface NetinfraBackboneLinkApi {
  'left-router'?: string;
  'left-interface'?: string;
  'right-router'?: string;
  'right-interface'?: string;
  state?: {
    'link-status'?: string;
  };
}

export interface NetinfraPayload {
  'netinfra:netinfra'?: {
    router?: NetinfraRouterApi[];
    'backbone-link'?: NetinfraBackboneLinkApi[];
  };
}
