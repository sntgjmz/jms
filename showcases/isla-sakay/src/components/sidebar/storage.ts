// Sidebar presentation state is shared between demo routes, but resets on reload.
export const STORAGE_KEYS = {
  expandedItems: 'portfolio_isla_demo_expanded_items',
  collapsed: 'portfolio_isla_demo_collapsed',
} as const;

let expandedItems: string[] = [];
let collapsedState = false;

export const loadExpandedItems = () => [...expandedItems];
export const loadCollapsedState = () => collapsedState;
export const saveExpandedItems = (items: string[]) => { expandedItems = [...items]; };
export const saveCollapsedState = (collapsed: boolean) => { collapsedState = collapsed; };
