/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    user?: import('./lib/auth.js').User;
    session?: any;
  }
}
