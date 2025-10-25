/**
 * @file Global declarations for Vite environment and CSS modules.
 */

/// <reference types="vite/client" />

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
