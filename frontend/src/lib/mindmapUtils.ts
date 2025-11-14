/**
 * Utility functions to convert backend mindmap format to frontend format
 */
import { MindmapTree, MindmapDelta } from '../types/api';
import { MentalMapNodeData } from '../components/MentalMapNetwork';

/**
 * Convert backend MindmapTree to frontend MentalMapNodeData format
 */
export function treeToNodeData(
  tree: MindmapTree,
  delta?: MindmapDelta,
  isIdeal: boolean = false
): MentalMapNodeData {
  const rootKey = Object.keys(tree)[0] || 'Root';
  const rootChildren = tree[rootKey] || [];

  const convertNode = (
    label: string,
    children: string[],
    level: number = 0
  ): MentalMapNodeData => {
    const nodeId = `${level}-${label}`;
    const isMissing = delta?.missing.includes(label);
    const isExtra = delta?.redundant.includes(label);
    const isMisprioritized = delta?.misprioritized.includes(label);

    const nodeChildren: MentalMapNodeData[] = children
      .map((child) => {
        // Find if this child has sub-children in the tree
        const childChildren = tree[child] || [];
        return convertNode(child, childChildren, level + 1);
      })
      .filter((child) => child !== null) as MentalMapNodeData[];

    return {
      id: nodeId,
      label,
      children: nodeChildren.length > 0 ? nodeChildren : undefined,
      isUserNode: !isIdeal,
      isMissing: isMissing && isIdeal,
      isExtra: isExtra && !isIdeal,
    };
  };

  // Build the root node
  const rootChildrenNodes = rootChildren
    .map((child) => {
      const childChildren = tree[child] || [];
      return convertNode(child, childChildren, 1);
    })
    .filter((child) => child !== null) as MentalMapNodeData[];

  return {
    id: 'root',
    label: rootKey,
    children: rootChildrenNodes,
    isUserNode: !isIdeal,
  };
}

/**
 * Convert flat tree structure to hierarchical format
 * Backend returns: { "Parent": ["Child1", "Child2"], "Child1": ["Grandchild1"] }
 * We need to find the root and build hierarchy
 */
export function buildHierarchicalTree(tree: MindmapTree): MentalMapNodeData {
  if (!tree || Object.keys(tree).length === 0) {
    return {
      id: 'root',
      label: 'No data',
      children: [],
    };
  }

  // Find root node (node that is not a child of any other node)
  const allChildren = new Set<string>();
  Object.values(tree).forEach((children) => {
    if (Array.isArray(children)) {
      children.forEach((child) => allChildren.add(child));
    }
  });

  const rootKeys = Object.keys(tree).filter((key) => !allChildren.has(key));
  const rootKey = rootKeys[0] || Object.keys(tree)[0] || 'Root';

  const visited = new Set<string>();
  
  const buildNode = (label: string, level: number = 0): MentalMapNodeData => {
    if (visited.has(label) || level > 10) {
      // Prevent infinite loops and deep recursion
      return { id: `${label}-${level}`, label };
    }
    visited.add(label);

    const children = tree[label] || [];
    const nodeChildren = Array.isArray(children)
      ? children
          .filter((child) => typeof child === 'string' && child.length > 0)
          .map((child) => buildNode(child, level + 1))
          .filter((child) => child !== null)
      : [];

    return {
      id: `${label}-${level}`,
      label,
      children: nodeChildren.length > 0 ? nodeChildren : undefined,
    };
  };

  const rootNode = buildNode(rootKey, 0);
  
  // If root has no children but tree has other keys, add them as children
  if (!rootNode.children || rootNode.children.length === 0) {
    const otherKeys = Object.keys(tree).filter(k => k !== rootKey);
    if (otherKeys.length > 0) {
      rootNode.children = otherKeys.map(key => ({
        id: key,
        label: key,
        children: Array.isArray(tree[key]) 
          ? tree[key].map((child: string) => ({ id: child, label: child }))
          : undefined,
      }));
    }
  }

  return rootNode;
}

