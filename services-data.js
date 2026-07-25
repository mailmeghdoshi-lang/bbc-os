// ================================================================
// BBC AGENCY OS — services-data.js
// Built-in services catalog
// To add a permanent service: add it here and redeploy
// To add/edit from the UI: use the Services Catalog module
// ================================================================

const BASE_SERVICES = [
  // ── Brand Strategy & Identity ──────────────────────────────
  { code:'BRD01', cat:'Brand Strategy & Identity',    name:'Brand Strategy & Positioning',        desc:'Market positioning, target audience mapping, and brand narrative.',                            unit:'OTHERS',  hsn:'998361', gst:18, price:75000  },
  { code:'BRD02', cat:'Brand Strategy & Identity',    name:'Logo Design',                          desc:'Primary logo + variations (horizontal, icon, monochrome).',                                  unit:'OTHERS',  hsn:'998361', gst:18, price:40000  },
  { code:'BRD03', cat:'Brand Strategy & Identity',    name:'Brand Identity & Guideline Document',  desc:'Full brand book — colours, typography, usage rules, tone of voice.',                         unit:'OTHERS',  hsn:'998361', gst:18, price:65000  },
  { code:'BRD04', cat:'Brand Strategy & Identity',    name:'Brand Voice & Messaging Framework',    desc:'Tone of voice guide, key messaging pillars, tagline options.',                               unit:'OTHERS',  hsn:'998361', gst:18, price:35000  },
  // ── Social Media Management ────────────────────────────────
  { code:'SMM01', cat:'Social Media Management',      name:'Social Media Management',              desc:'End-to-end handling of social handles, billed outside a retainer.',                          unit:'MONTH',   hsn:'998361', gst:18, price:60000  },
  { code:'SMM02', cat:'Social Media Management',      name:'Content Calendar Planning',             desc:'Monthly content calendar across platforms with themes and posting schedule.',                 unit:'MONTH',   hsn:'998361', gst:18, price:15000  },
  { code:'SMM03', cat:'Social Media Management',      name:'Reel Scripting & Direction (Set of 5)', desc:'Scripts + shot direction for a set of 5 reels.',                                             unit:'SETS',    hsn:'998361', gst:18, price:20000  },
  { code:'SMM04', cat:'Social Media Management',      name:'Instagram Growth & Community Mgmt',    desc:'DMs, comments, engagement, and follower growth activities.',                                  unit:'MONTH',   hsn:'998361', gst:18, price:18000  },
  { code:'SMM05', cat:'Social Media Management',      name:'Influencer Collaboration Management',  desc:'Sourcing, negotiating, and coordinating influencer partnerships.',                            unit:'MONTH',   hsn:'998361', gst:18, price:25000  },
  // ── Performance Marketing ──────────────────────────────────
  { code:'PMK01', cat:'Performance Marketing',        name:'Meta Ads — Setup',                     desc:'Ad account structuring, pixel setup, initial campaign build.',                               unit:'OTHERS',  hsn:'998361', gst:18, price:25000  },
  { code:'PMK02', cat:'Performance Marketing',        name:'Meta Ads — Monthly Management',        desc:'Ongoing campaign management, optimisation, and reporting.',                                  unit:'MONTH',   hsn:'998361', gst:18, price:35000  },
  { code:'PMK03', cat:'Performance Marketing',        name:'Google Ads — Setup',                   desc:'Account structuring, conversion tracking, initial campaign build.',                          unit:'OTHERS',  hsn:'998361', gst:18, price:25000  },
  { code:'PMK04', cat:'Performance Marketing',        name:'Google Ads — Monthly Management',      desc:'Ongoing campaign management, optimisation, and reporting.',                                  unit:'MONTH',   hsn:'998361', gst:18, price:35000  },
  { code:'PMK05', cat:'Performance Marketing',        name:'GTM & GA4 Setup',                      desc:'Tag Manager and Analytics 4 configuration with goal/event tracking.',                        unit:'OTHERS',  hsn:'998361', gst:18, price:18000  },
  { code:'PMK06', cat:'Performance Marketing',        name:'Landing Page for Ad Campaigns',        desc:'Single-purpose landing page built for a specific ad campaign.',                              unit:'OTHERS',  hsn:'998361', gst:18, price:30000  },
  { code:'PMK07', cat:'Performance Marketing',        name:'Lead Funnel Strategy & Setup',         desc:'Funnel mapping, lead magnet, and capture-flow setup.',                                       unit:'OTHERS',  hsn:'998361', gst:18, price:45000  },
  // ── Content Creation ───────────────────────────────────────
  { code:'CNT01', cat:'Content Creation',             name:'Static Post Design (Set of 10)',       desc:'10 designed static posts for social media.',                                                 unit:'SETS',    hsn:'998361', gst:18, price:20000  },
  { code:'CNT02', cat:'Content Creation',             name:'Photography/Videography Direction',    desc:'On-ground creative direction for a single shoot day.',                                       unit:'SESSION', hsn:'998361', gst:18, price:25000  },
  { code:'CNT03', cat:'Content Creation',             name:'Copywriting (Captions & Ad Copy)',     desc:'Ongoing caption and ad copywriting.',                                                        unit:'MONTH',   hsn:'998361', gst:18, price:15000  },
  { code:'CNT04', cat:'Content Creation',             name:'Blog / Long-form Content Writing',     desc:'SEO-aware long-form article, per piece.',                                                    unit:'NUMBERS', hsn:'998361', gst:18, price:6000   },
  // ── Website Development ────────────────────────────────────
  { code:'WEB01', cat:'Website Development',          name:'Website Design & Development',         desc:'Full website build — design, development, and launch.',                                      unit:'OTHERS',  hsn:'998314', gst:18, price:110000 },
  { code:'WEB02', cat:'Website Development',          name:'Website Maintenance & Updates',        desc:'Ongoing updates, fixes, and content changes.',                                               unit:'MONTH',   hsn:'998314', gst:18, price:10000  },
  { code:'WEB03', cat:'Website Development',          name:'E-commerce Setup',                     desc:'Online store setup with catalog, payment, and shipping configuration.',                      unit:'OTHERS',  hsn:'998314', gst:18, price:60000  },
  // ── Packaging Design ───────────────────────────────────────
  { code:'PKG01', cat:'Packaging Design',             name:'Packaging Design — Master Pack',       desc:'Sets the design direction and master template for the product range.',                       unit:'OTHERS',  hsn:'998361', gst:18, price:20000  },
  { code:'PKG02', cat:'Packaging Design',             name:'Packaging Design — Adaptation',        desc:'Adaptation per product variant (flavour, fragrance, size, etc.).',                          unit:'NUMBERS', hsn:'998361', gst:18, price:2000   },
  // ── Digital Setup & Integration ────────────────────────────
  { code:'DSI01', cat:'Digital Setup & Integration',  name:'WhatsApp Business Setup & Integration',desc:'WhatsApp Business API coordination and initial flow configuration with third-party platform.',unit:'OTHERS', hsn:'998314', gst:18, price:4000   },
  // ── Design / Artwork ───────────────────────────────────────
  { code:'ART01', cat:'Design / Artwork',             name:'Design / Artwork — Up to A4 (per side)',  desc:'Artwork or layout for print/digital up to A4, per page or side.',  unit:'NUMBERS', hsn:'998361', gst:18, price:2000   },
  { code:'ART02', cat:'Design / Artwork',             name:'Design / Artwork — Larger than A4 (per side)', desc:'Artwork or layout for print/digital larger than A4, per side.', unit:'NUMBERS', hsn:'998361', gst:18, price:5000   },
  // ── Retainer Packages ──────────────────────────────────────
  { code:'RET01', cat:'Retainer Package',             name:'Digital Retainer — Social Media Only', desc:'Social media management + content calendar + reel scripting + community management.',        unit:'MONTH',   hsn:'998361', gst:18, price:60000  },
  { code:'RET02', cat:'Retainer Package',             name:'Growth Retainer — Social + Performance',desc:'Digital Retainer + Meta/Google Ads + GTM/GA4 + lead funnel. Ad spend billed separately.',  unit:'MONTH',   hsn:'998361', gst:18, price:110000 },
];
