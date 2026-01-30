/**
 * Selector Manager Entry Point
 * Main export file for selector management functionality
 */

export { SelectorManager, selectorManager, type SelectorMap, type DomainSelectors } from './selector-maps';
export { SelectorOptimizer, selectorOptimizer, type SelectorReliabilityScore, type ReliabilityConfig } from './selector-optimizer';

/**
 * Convenience function to find reliable element
 */
export async function findReliableElement(
  domain: string, 
  elementName: string, 
  context?: Document | Element
): Promise<Element | null> {
  return selectorOptimizer.findReliableElement(domain, elementName, context);
}

/**
 * Convenience function to get all elements
 */
export async function findAllElements(
  domain: string, 
  elementName: string, 
  context?: Document | Element
): Promise<Element[]> {
  return selectorManager.findAllElements(domain, elementName, context);
}

/**
 * Convenience function to add custom selector
 */
export function addCustomSelector(
  domain: string, 
  elementName: string, 
  selectorMap: SelectorMap
): void {
  selectorManager.addSelectorMap(domain, elementName, selectorMap);
}