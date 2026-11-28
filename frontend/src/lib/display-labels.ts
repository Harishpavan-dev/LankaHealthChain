export function resourceLabel(resourceType: string): string {
  return resourceType.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

export function statusLabel(code: string): string {
  const label = code.toLowerCase().replaceAll('_', ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}
