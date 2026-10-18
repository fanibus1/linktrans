export interface Rule {
  sourceDomain: string;     // e.g. "instagram.com" or "x.com"
  targetDomains: string[];  // e.g. ["oginstagram.com"] or ["website1", "website2"]
  keepParams: string[];     // e.g. ["img_index"]
}
